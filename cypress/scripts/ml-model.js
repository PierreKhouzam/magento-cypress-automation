const fs = require('fs').promises;
const path = require('path');
const { DecisionTree } = require('ml-cart');
const { loadTestHistory } = require('./test-db');
const logger = require('./logger');
const config = require('./config');
const { extractFeatures } = require('./features');

/**
 * Machine learning model for flaky test prediction.
 * Uses a decision tree algorithm to classify tests as flaky or stable.
 */
class FlakyTestPredictor {
    constructor(options = {}) {
        this.model = null;
        this.options = {
            maxDepth: config.ml.maxDepth,
            minNumSamples: config.ml.minNumSamples,
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
            'recentFailRate',
            'flakyScore'
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
        if (!this.model) return false;
        try {
            const modelData = this.model.toJSON();
            await fs.writeFile(this.modelPath, JSON.stringify(modelData));
            this.logger.info('ML model saved to', this.modelPath);
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
            this.model = new DecisionTree(this.options);
            this.model.fromJSON(modelData);
            this.logger.info('ML model loaded from', this.modelPath);
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

            this.model = new DecisionTree(this.options);
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
            return this._ruleBasedPrediction(features);
        }

        try {
            const featureArray = this._extractFeatureArray(features);
            return this.model.predict([featureArray])[0];
        } catch (error) {
            this.logger.error('Error during prediction:', { error: error.message });
            return this._ruleBasedPrediction(features);
        }
    }

    getPredictionConfidence(features) {
        if (!this.model) return 0.5;

        try {
            const featureArray = this._extractFeatureArray(features);
            const leafNode = this.model.root.classify(featureArray);
            const total = leafNode.gain?.n || 1;
            const majority = Math.max(leafNode.gain?.pos || 0, leafNode.gain?.neg || 0);
            return majority / total;
        } catch (error) {
            this.logger.error('Error getting prediction confidence:', { error: error.message });
            return 0.5;
        }
    }

    _extractFeatureArray(features) {
        return this.featureNames.map(name => features[name] ?? 0);
    }

    _ruleBasedPrediction(features) {
        if (!features) {
            this.logger.warn('No features provided for rule-based prediction');
            return 0;
        }

        const { flakyThreshold, passRateThreshold, transitionRateThreshold, durationVariabilityThreshold, recentFailRateThreshold } = config.flakiness;
        let flakyScore = 0;

        if (features.flakyScore !== undefined) flakyScore += features.flakyScore * 0.4;
        if (features.passRate !== undefined && features.passRate < passRateThreshold && features.passRate > 0.2) flakyScore += 0.3;
        if (features.transitionRate !== undefined && features.transitionRate > transitionRateThreshold) flakyScore += 0.3;
        if (features.durationVariability !== undefined && features.durationVariability > durationVariabilityThreshold) flakyScore += 0.2;
        if (features.recentFailRate !== undefined && features.recentFailRate > recentFailRateThreshold) flakyScore += 0.3;

        const errorPatterns = ['timingIssues', 'selectorIssues', 'networkIssues', 'dataIssues'];
        for (const pattern of errorPatterns) {
            if (features[pattern] > 0) flakyScore += 0.1;
        }

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
                const features = extractFeatures(testData);
                const label = testData.flakyScore > config.flakiness.flakyScoreThreshold ? 1 : 0;
                return { features, label };
            });

            const success = this.train(testResults);
            if (success) await this.saveModel();
            return success;
        } catch (error) {
            this.logger.error('Error loading model from history:', { error: error.message });
            return false;
        }
    }

    getFeatureImportance() {
        if (!this.model || !this.model.root) return null;

        const importance = {};
        this.featureNames.forEach(name => { importance[name] = 0; });

        const calculateImportance = (node) => {
            if (!node || !node.gain) return;
            if (node.splitColumn !== undefined) {
                const featureName = this.featureNames[node.splitColumn];
                if (featureName) importance[featureName] += node.gain.impurity || 0;
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