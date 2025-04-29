// recommendations.js
const config = require('./config');

/**
 * Generate recommendations for a flaky test based on its features.
 * @param {Object} features - Test features
 * @param {string} issueType - Primary issue type
 * @returns {Array<string>} List of recommendations
 */
function generateRecommendations(features, issueType) {
    const recommendations = [];
    const thresholds = config.flakiness;

    if (features.timingIssues > 0) {
        recommendations.push('Add explicit waits or retry logic for timing-sensitive operations');
    }
    if (features.selectorIssues > 0) {
        recommendations.push('Improve selector stability by using data attributes instead of class names');
    }
    if (features.networkIssues > 0) {
        recommendations.push('Add network request mocking or stubbing for external dependencies');
    }
    if (features.dataIssues > 0) {
        recommendations.push('Ensure test data is consistent or use data seeding/resetting');
    }
    if (features.durationVariability > thresholds.durationVariabilityThreshold) {
        recommendations.push('Investigate performance variability contributing to flakiness');
    }
    if (features.transitionRate > thresholds.transitionRateThreshold) {
        recommendations.push('Review test logic for race conditions or non-deterministic behavior');
    }

    // Fallback recommendation
    if (recommendations.length === 0) {
        recommendations.push(`Implement a retry mechanism for ${issueType} issues`);
    }

    return recommendations;
}

module.exports = { generateRecommendations };