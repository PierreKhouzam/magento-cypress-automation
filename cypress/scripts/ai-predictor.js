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
    return Object.keys(history).map(testName => {
        const testData = history[testName];
        const features = extractFeatures(testData);
        const label = testData.flakyScore > config.flakiness.flakyScoreThreshold ? 1 : 0;
        return { features, label, testName };
    });
}

async function trainModel(history) {
    logger.info('Training AI model with historical test data...');
    const trainingData = generateTrainingData(history);

    if (trainingData.length === 0) {
        logger.warn('No training data available. Model training skipped.');
        return new FlakyTestPredictor();
    }

    const predictor = new FlakyTestPredictor();
    if (await predictor.loadModel()) {
        logger.info('Using cached ML model');
    } else {
        predictor.train(trainingData);
        await predictor.saveModel();
    }

    const importance = predictor.getFeatureImportance();
    if (importance) {
        logger.info('Feature Importance:', Object.entries(importance)
            .sort((a, b) => b[1] - a[1])
            .map(([feature, score]) => ({ feature, score: (score * 100).toFixed(2) + '%' })));
    }

    return predictor;
}

function predictFlakiness(testData, predictor) {
    const features = extractFeatures(testData);
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

            const { prediction, confidence, features } = predictFlakiness(testData, predictor);
            results[testName] = {
                prediction,
                confidence,
                flakyScore: testData.flakyScore.toFixed(2),
                passRate: ((features.passRate) * 100).toFixed(1) + '%',
                runCount: testData.runs.length,
                reason: generateReason(prediction, features)
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
    const thresholds = config.flakiness;

    if (features.flakyScore > 0.5) reasons.push(`high flaky score (${features.flakyScore.toFixed(2)})`);
    if (features.transitionRate > thresholds.transitionRateThreshold) reasons.push(`frequent state transitions (${(features.transitionRate * 100).toFixed(1)}%)`);
    if (features.passRate < thresholds.passRateThreshold && features.passRate > 0.2) reasons.push(`inconsistent pass rate (${(features.passRate * 100).toFixed(1)}%)`);
    if (features.recentFailRate > thresholds.recentFailRateThreshold) reasons.push(`recent failures detected (${(features.recentFailRate * 100).toFixed(1)}%)`);
    if (features.durationVariability > thresholds.durationVariabilityThreshold) reasons.push('high execution time variability');

    const issues = [];
    if (features.timingIssues > 0) issues.push('timing');
    if (features.selectorIssues > 0) issues.push('selector');
    if (features.networkIssues > 0) issues.push('network');
    if (features.dataIssues > 0) issues.push('data');
    if (issues.length > 0) reasons.push(`detected ${issues.join('/')} issues`);

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

    const sortedTests = Object.entries(predictions)
        .sort((a, b) => {
            if (a[1].prediction !== b[1].prediction) return a[1].prediction === 'Flaky' ? -1 : 1;
            return parseFloat(b[1].confidence) - parseFloat(a[1].confidence);
        });

    console.log('\n=== PREDICTED FLAKY TESTS ===');
    let flakyCount = 0;
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
            if (!history[testName] || predictionData.prediction !== 'Flaky') continue;

            const testData = history[testName];
            const features = extractFeatures(testData);
            const issueType = determineIssueType(features);
            history[testName].aiRecommendations = generateRecommendations(features, issueType);
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