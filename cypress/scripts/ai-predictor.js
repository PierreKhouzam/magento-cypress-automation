// @ts-nocheck
const fs = require('fs').promises;
const path = require('path');
const { loadTestHistory, saveTestHistory } = require('./test-db');
const { FlakyTestPredictor } = require('./ml-model');
const logger = require('./logger');
const config = require('./config');
const { extractFeatures } = require('./features');
const { generateRecommendations } = require('./recommendations');

const reportsDir = config.reports.dir;
const predictionsDir = path.join(reportsDir, 'predictions');

async function ensurePredictionsDir() {
    try {
        await fs.mkdir(predictionsDir, { recursive: true });
    } catch (error) {
        logger.error('Error creating predictions directory:', { error: error.message });
    }
}

async function loadHistory() {
    return loadTestHistory();
}

function generateTrainingData(history) {
    const trainingData = Object.keys(history).map(testName => {
        const testData = history[testName];
        const features = extractFeatures(testData);
        const label = testData.flakyScore > (config.flakiness?.flakyScoreThreshold || 0.15) ? 1 : 0;
        if (!features || Object.values(features).some(val => typeof val !== 'number' || isNaN(val))) {
            logger.error('Invalid features for training', { testName, features });
            return null;
        }
        return { features, label, testName };
    }).filter(data => data !== null);

    logger.debug('Generated training data', { testCount: trainingData.length });
    return trainingData;
}

async function trainModel(history) {
    logger.info('Training AI model with historical test data...');
    const trainingData = generateTrainingData(history);

    if (trainingData.length === 0) {
        logger.warn('No valid training data available. Model training skipped.');
        return null;
    }

    const predictor = new FlakyTestPredictor();
    try {
        if (await predictor.loadModel()) {
            logger.info('Using cached ML model');
        } else {
            const success = predictor.train(trainingData);
            if (success) {
                await predictor.saveModel();
            } else {
                logger.warn('Model training failed, proceeding with rule-based prediction');
                return null;
            }
        }
        const importance = predictor.getFeatureImportance();
        if (importance) {
            logger.info('Feature Importance:', Object.entries(importance)
                .sort((a, b) => b[1] - a[1])
                .map(([feature, score]) => ({ feature, score: (score * 100).toFixed(2) + '%' })));
        }
        return predictor;
    } catch (error) {
        logger.error('Failed to train or load model:', { error: error.message });
        return null;
    }
}

function predictFlakiness(testData, predictor) {
    const features = extractFeatures(testData);
    if (!features || Object.values(features).some(val => typeof val !== 'number' || isNaN(val))) {
        logger.error('Invalid features for prediction', { testTitle: testData.runs[0]?.title || 'unknown', features });
        return {
            prediction: 'Unknown',
            confidence: '0%',
            features,
            reason: 'Invalid feature data'
        };
    }

    if (!predictor) {
        const prediction = FlakyTestPredictor.prototype._ruleBasedPrediction.call({ logger }, features);
        return {
            prediction: prediction === 1 ? 'Flaky' : 'Stable',
            confidence: '50%',
            features,
            reason: 'No trained model available, used rule-based prediction'
        };
    }

    const predictionResult = predictor.predict(features);
    const confidence = predictor.getPredictionConfidence(features);

    return {
        prediction: predictionResult === 1 ? 'Flaky' : 'Stable',
        confidence: (confidence * 100).toFixed(1) + '%',
        features
    };
}

async function analyzeFlakiness() {
    try {
        logger.info('Starting AI-powered flakiness analysis...');
        const history = await loadHistory();

        if (!history || Object.keys(history).length === 0) {
            logger.warn('No test history available for analysis.');
            return {};
        }

        const predictor = await trainModel(history);
        logger.info('Analyzing tests for flakiness', { testCount: Object.keys(history).length });

        const results = {};
        for (const testName of Object.keys(history)) {
            const testData = history[testName];
            if (testData.runs.length < 2) {
                results[testName] = { prediction: 'Unknown', confidence: '0%', reason: 'Insufficient data' };
                continue;
            }

            const { prediction, confidence, features, reason } = predictFlakiness(testData, predictor);
            results[testName] = {
                prediction,
                confidence,
                flakyScore: testData.flakyScore.toFixed(2),
                passRate: ((features.passRate) * 100).toFixed(1) + '%',
                runCount: testData.runs.length,
                reason: reason || generateReason(prediction, features)
            };
        }

        await savePredictions(results);
        return results;
    } catch (error) {
        logger.error('Error in AI flakiness analysis:', { error: error.message });
        return {};
    }
}

function generateReason(prediction, features) {
    if (prediction !== 'Flaky') {
        return 'Test appears to be stable based on execution history';
    }

    const reasons = [];
    const thresholds = config.flakiness || {};

    if (features.passRate <= (thresholds.passRateThreshold || 0.85) && features.passRate > 0.2) {
        reasons.push(`inconsistent pass rate (${(features.passRate * 100).toFixed(1)}%)`);
    }
    if (features.transitionRate > (thresholds.transitionRateThreshold || 0.2)) {
        reasons.push(`frequent state transitions (${(features.transitionRate * 100).toFixed(1)}%)`);
    }
    if (features.recentFailRate > (thresholds.recentFailRateThreshold || 0.3)) {
        reasons.push(`recent failures detected (${(features.recentFailRate * 100).toFixed(1)}%)`);
    }
    if (features.durationVariability > (thresholds.durationVariabilityThreshold || 0.5)) {
        reasons.push('high execution time variability');
    }

    const issues = [];
    if (features.timingIssues > 0) issues.push('timing');
    if (features.selectorIssues > 0) issues.push('selector');
    if (features.networkIssues > 0) issues.push('network');
    if (features.dataIssues > 0) issues.push('data');
    if (issues.length > 0) {
        reasons.push(`detected ${issues.join('/')}`);
    }

    return reasons.length > 0 ? `Flagged due to ${reasons.join(', ')}` : 'Pattern matches characteristics of flaky tests';
}

async function savePredictions(results) {
    try {
        await ensurePredictionsDir();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filePath = path.join(predictionsDir, `predictions-${timestamp}.json`);
        await fs.writeFile(filePath, JSON.stringify(results, null, 2));
        logger.info('Predictions saved', { filePath });
    } catch (error) {
        logger.error('Error saving predictions:', { error: error.message });
    }
}

async function displayPredictions() {
    const predictions = await analyzeFlakiness();
    const testCount = Object.keys(predictions).length;

    if (testCount === 0) {
        console.log('\nNo tests available for prediction.');
        return;
    }

    console.log(`\nAI Flakiness Prediction Results (${testCount} tests analyzed):`);
    const flakyTests = Object.values(predictions).filter(p => p.prediction === 'Flaky');
    console.log(`Found ${flakyTests.length} potentially flaky tests (${(flakyTests.length / testCount * 100).toFixed(1)}% of test suite)`);

    console.log('\n=== PREDICTED FLAKY TESTS ===');
    let flakyCount = 0;
    const sortedTests = Object.entries(predictions).sort((a, b) => {
        const aIsFlaky = a[1].prediction === 'Flaky';
        const bIsFlaky = b[1].prediction === 'Flaky';
        if (aIsFlaky !== bIsFlaky) return aIsFlaky ? -1 : 1;
        return parseFloat(b[1].confidence) - parseFloat(a[1].confidence);
    });

    sortedTests.forEach(([testName, data]) => {
        if (data.prediction === 'Flaky') {
            flakyCount++;
            console.log(`${flakyCount}. ${testName}`);
            console.log(`   Confidence: ${data.confidence} | Pass Rate: ${data.passRate} | Runs: ${data.runCount}`);
            console.log(`   Reason: ${data.reason}\n`);
        }
    });

    if (flakyCount === 0) console.log('No flaky tests detected.');
    console.log('=== STABLE TESTS ===');
    console.log(`${testCount - flakyCount} tests appear to be stable.`);
}

async function updateTestHistoryWithRecommendations() {
    try {
        const history = await loadHistory();
        const predictions = await analyzeFlakiness();

        for (const [testName, predictionData] of Object.entries(predictions)) {
            if (!history[testName]) continue;
            const testData = history[testName];
            const features = extractFeatures(testData);
            const hasIssues = features.timingIssues > 0 || features.selectorIssues > 0 || features.networkIssues > 0 || features.dataIssues > 0;
            if (predictionData.prediction === 'Flaky' || hasIssues) {
                const issueType = determineIssueType(features);
                const recommendations = generateRecommendations(features, issueType);
                logger.info('Generated recommendations for test', {
                    testName,
                    prediction: predictionData.prediction,
                    issueType,
                    hasIssues,
                    recommendationCount: recommendations.length
                });
                history[testName].aiRecommendations = recommendations;
            } else {
                logger.debug('No recommendations generated for test', {
                    testName,
                    prediction: predictionData.prediction,
                    hasIssues
                });
            }
        }

        await saveTestHistory(history);
        logger.info('Updated test history with AI recommendations');
    } catch (error) {
        logger.error('Error updating test history with recommendations:', { error: error.message });
    }
}

function determineIssueType(features) {
    const patterns = [
        { type: 'timing', count: features.timingIssues },
        { type: 'selector', count: features.selectorIssues },
        { type: 'network', count: features.networkIssues },
        { type: 'data', count: features.dataIssues }
    ];
    return patterns.reduce((max, curr) => curr.count > max.count ? curr : max, { type: 'unknown', count: 0 }).type;
}

module.exports = {
    analyzeFlakiness,
    displayPredictions,
    updateTestHistoryWithRecommendations
};

if (require.main === module) {
    displayPredictions()
        .then(() => process.exit(0))
        .catch(err => {
            logger.error('Error running AI predictor:', { error: err.message, stack: err.stack });
            process.exit(1);
        });
}