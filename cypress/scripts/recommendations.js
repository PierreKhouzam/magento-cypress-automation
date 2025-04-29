const logger = require('./logger');

function generateRecommendations(features, issueType) {
    const recommendations = [];

    if (issueType === 'timing' || features.timingIssues > 0) {
        recommendations.push('Increase timeout for async operations');
        recommendations.push('Add explicit waits for dynamic elements');
        recommendations.push('Verify server response times');
    }
    if (issueType === 'selector' || features.selectorIssues > 0) {
        recommendations.push('Review and update CSS selectors for stability');
        recommendations.push('Use data-test attributes for reliable element targeting');
        recommendations.push('Check for dynamic IDs or classes');
    }
    if (issueType === 'network' || features.networkIssues > 0) {
        recommendations.push('Stub network requests for consistent testing');
        recommendations.push('Check for intermittent network failures');
        recommendations.push('Increase retry attempts for network calls');
    }
    if (issueType === 'data' || features.dataIssues > 0) {
        recommendations.push('Validate test data setup and teardown');
        recommendations.push('Ensure consistent test data across runs');
        recommendations.push('Check for data dependencies in tests');
    }

    if (features.passRate < 0.85) {
        recommendations.push('Investigate inconsistent test failures');
    }
    if (features.transitionRate > 0.2) {
        recommendations.push('Stabilize test environment to reduce state changes');
    }
    if (features.durationVariability > 0.5) {
        recommendations.push('Optimize test execution for consistent durations');
    }
    if (features.recentFailRate > 0.3) {
        recommendations.push('Prioritize debugging recent test failures');
    }

    logger.debug('Generated recommendations', { issueType, features, recommendations });
    return recommendations;
}

module.exports = { generateRecommendations };