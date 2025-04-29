const fs = require('fs').promises;
const path = require('path');
const { DecisionTreeClassifier } = require('ml-cart');
const { loadTestHistory } = require('./test-db');
const logger = require('./logger');
const config = require('./config');

/**
 * Machine learning model for flaky test prediction.
 * Uses a decision tree algorithm to classify tests as flaky or stable.
 */
class FlakyTestPredictor {
    constructor(options = {}) {
        this.model = null;
        this.options = {
            maxDepth: config.ml?.maxDepth || 10,
            minNumSamples: config.ml?.minNumSamples || 2,
            ...options
        };
        this.featureNames = [
            'passRate',
            'avgDuration',
            'transitionRate',
            'timingIssues',
            'selectorIssues',
            'networkIssues',
            'dataIssues',
            'durationVariability',
            'recentFailRate'
        ];
        this.logger = logger;
        this.modelPath = path.join(config.db.dir, 'flaky-model.json');
    }

    setLogger(newLogger) {
        if (
            newLogger &&
            typeof newLogger.info === 'function' &&
            typeof newLogger.warn === 'function' &&
            typeof newLogger.error === 'function'
        ) {
            this.logger = newLogger;
        }
    }

    async saveModel() {
        if (!this.model) {
            this.logger.warn('No model to save');
            return false;
        }
        try {
            const modelData = this.model.toJSON();
            await fs.writeFile(this.modelPath, JSON.stringify(modelData, null, 2));
            this.logger.info('ML model saved to', { file: this.modelPath });
            return true;
        } catch (error) {
            this.logger.error('Error saving ML model:', { error: error.message });
            return false;
        }
    }

    async loadModel() {
        try {
            const data = await fs.readFile(this.modelPath, 'utf8');
            const modelData = JSON.parse(data);
            this.model = DecisionTreeClassifier.load(modelData);
            this.logger.info('ML model loaded from', { file: this.modelPath });
            return true;
        } catch (error) {
            this.logger.info('No saved model found or error loading:', { error: error.message });
            return false;
        }
    }

    train(testResults) {
        if (!testResults || testResults.length === 0) {
            this.logger.warn('No training data provided for the ML model');
            return false;
        }

        try {
            const X = testResults.map(result => this._extractFeatureArray(result.features));
            const y = testResults.map(result => result.label);

            // Validate X and y
            if (!X.every(row => Array.isArray(row) && row.length === this.featureNames.length && row.every(val => typeof val === 'number' && !isNaN(val)))) {
                this.logger.error('Invalid feature data for training', { X });
                throw new Error('Feature data must be a 2D array of numbers');
            }
            if (!y.every(label => label === 0 || label === 1)) {
                this.logger.error('Invalid labels for training', { y });
                throw new Error('Labels must be 0 or 1');
            }

            // Log label distribution
            const flakyCount = y.filter(label => label === 1).length;
            this.logger.debug('Training data', { samples: testResults.length, flakyCount, stableCount: testResults.length - flakyCount, X });

            this.model = new DecisionTreeClassifier(this.options);
            this.model.train(X, y);
            this.logger.info('ML model trained successfully', { samples: testResults.length });
            return true;
        } catch (error) {
            this.logger.error('Error training ML model:', { error: error.message });
            return false;
        }
    }

    predict(features) {
        if (!this.model) {
            this.logger.warn('No trained model, using rule-based prediction');
            return this._ruleBasedPrediction(features);
        }

        try {
            const featureArray = this._extractFeatureArray(features);
            if (!Array.isArray(featureArray) || featureArray.length !== this.featureNames.length || featureArray.some(val => typeof val !== 'number' || isNaN(val))) {
                this.logger.error('Invalid feature data for prediction', { featureArray });
                throw new Error('Feature data must be an array of numbers');
            }

            this.logger.debug('Prediction features', { featureArray });
            return this.model.predict([featureArray])[0];
        } catch (error) {
            this.logger.error('Error during prediction:', { error: error.message });
            return this._ruleBasedPrediction(features);
        }
    }

    getPredictionConfidence(features) {
        if (!this.model) {
            this.logger.warn('No trained model, returning default confidence');
            return 0.5;
        }

        try {
            const featureArray = this._extractFeatureArray(features);
            if (!Array.isArray(featureArray) || featureArray.length !== this.featureNames.length || featureArray.some(val => typeof val !== 'number' || isNaN(val))) {
                this.logger.error('Invalid feature data for confidence', { featureArray });
                throw new Error('Feature data must be an array of numbers');
            }

            const prediction = this.model.predict([featureArray])[0];
            return prediction === 1 ? 0.9 : 0.6; // Placeholder confidence
        } catch (error) {
            this.logger.error('Error getting prediction confidence:', { error: error.message });
            return 0.5;
        }
    }

    _extractFeatureArray(features) {
        return this.featureNames.map(name => {
            const value = features[name] ?? 0;
            return typeof value === 'number' && !isNaN(value) ? value : 0;
        });
    }

    _ruleBasedPrediction(features) {
        if (!features) {
            this.logger.warn('No features provided for rule-based prediction');
            return 0;
        }

        const { flakyThreshold = 0.5, passRateThreshold = 0.85, transitionRateThreshold = 0.2, durationVariabilityThreshold = 0.5, recentFailRateThreshold = 0.3 } = config.flakiness || {};
        let flakyScore = 0;

        if (features.passRate !== undefined && features.passRate <= passRateThreshold && features.passRate > 0.2) flakyScore += 0.4;
        if (features.transitionRate !== undefined && features.transitionRate > transitionRateThreshold) flakyScore += 0.3;
        if (features.durationVariability !== undefined && features.durationVariability > durationVariabilityThreshold) flakyScore += 0.2;
        if (features.recentFailRate !== undefined && features.recentFailRate > recentFailRateThreshold) flakyScore += 0.3;
        if (features.timingIssues > 0) flakyScore += 0.2;
        if (features.selectorIssues > 0) flakyScore += 0.1;
        if (features.networkIssues > 0) flakyScore += 0.1;
        if (features.dataIssues > 0) flakyScore += 0.1;

        this.logger.debug('Rule-based prediction', { features, flakyScore, threshold: flakyThreshold });
        return flakyScore > flakyThreshold ? 1 : 0;
    }

    async loadFromHistory() {
        if (await this.loadModel()) {
            return true;
        }

        try {
            const history = await loadTestHistory();
            if (!history || Object.keys(history).length === 0) {
                this.logger.warn('No test history found for training the model');
                return false;
            }

            const testResults = Object.keys(history).map(testName => {
                const testData = history[testName];
                const features = require('./features').extractFeatures(testData);
                // Lower threshold to increase flaky labels
                const label = testData.flakyScore > (config.flakiness?.flakyScoreThreshold || 0.15) ? 1 : 0;
                return { features, label };
            });

            // Oversample flaky tests to balance dataset
            const flakyResults = testResults.filter(r => r.label === 1);
            const stableResults = testResults.filter(r => r.label === 0);
            const balancedResults = [
                ...testResults,
                ...flakyResults, // Duplicate flaky tests
                ...flakyResults.slice(0, Math.max(0, stableResults.length - flakyResults.length)) // Add more if needed
            ];

            const success = this.train(balancedResults.length > 0 ? balancedResults : testResults);
            if (success) await this.saveModel();
            return success;
        } catch (error) {
            this.logger.error('Error loading model from history:', { error: error.message });
            return false;
        }
    }

    getFeatureImportance() {
        if (!this.model || !this.model.root) {
            this.logger.warn('No trained model, returning null feature importance');
            return null;
        }

        const importance = {};
        this.featureNames.forEach(name => { importance[name] = 0; });

        const calculateImportance = (node) => {
            if (!node || !node.gain) return;
            if (node.feature !== undefined) {
                const featureName = this.featureNames[node.feature];
                if (featureName) importance[featureName] += node.gain || 0;
            }
            if (node.left) calculateImportance(node.left);
            if (node.right) calculateImportance(node.right);
        };

        calculateImportance(this.model.root);
        const total = Object.values(importance).reduce((sum, val) => sum + val, 0);
        if (total > 0) {
            Object.keys(importance).forEach(key => {
                importance[key] = importance[key] / total;
            });
        }

        return importance;
    }
}

module.exports = { FlakyTestPredictor };