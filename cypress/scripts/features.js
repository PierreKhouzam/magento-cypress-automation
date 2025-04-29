// features.js
/**
 * Shared feature extraction utilities for flaky test detection.
 */

/**
 * Calculate pass rate from test runs.
 * @param {Array} runs - Array of test runs with state property
 * @returns {number} Pass rate (0 to 1)
 */
function calculatePassRate(runs) {
    if (!runs || runs.length === 0) return 0;
    return runs.filter(run => run.state === 'passed').length / runs.length;
}

/**
 * Calculate transition rate between test states.
 * @param {Array} runs - Array of test runs with state property
 * @returns {number} Transition rate (0 to 1)
 */
function calculateTransitionRate(runs) {
    if (!runs || runs.length <= 1) return 0;
    let transitions = 0;
    for (let i = 1; i < runs.length; i++) {
        if (runs[i].state !== runs[i - 1].state) transitions++;
    }
    return transitions / (runs.length - 1);
}

/**
 * Calculate duration variability (coefficient of variation).
 * @param {Array} runs - Array of test runs with duration property
 * @returns {number} Coefficient of variation
 */
function calculateDurationVariability(runs) {
    if (!runs || runs.length < 2) return 0;
    const durations = runs.map(run => run.duration || 0);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const squaredDiffs = durations.map(d => Math.pow(d - avgDuration, 2));
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / durations.length;
    const stdDev = Math.sqrt(variance);
    return avgDuration > 0 ? stdDev / avgDuration : 0;
}

/**
 * Calculate recent fail rate.
 * @param {Array} runs - Array of test runs with state property
 * @param {number} recentCount - Number of recent runs to consider
 * @returns {number} Recent fail rate (0 to 1)
 */
function calculateRecentFailRate(runs, recentCount = 5) {
    if (!runs || runs.length === 0) return 0;
    const recentRuns = runs.slice(-Math.min(recentCount, runs.length));
    const recentFails = recentRuns.filter(run => run.state === 'failed').length;
    return recentFails / recentRuns.length;
}

/**
 * Extract all features for a test.
 * @param {Object} testData - Test data with runs and patterns
 * @returns {Object} Feature object
 */
function extractFeatures(testData) {
    return {
        passRate: calculatePassRate(testData.runs),
        avgDuration: testData.runs?.length
            ? testData.runs.reduce((sum, run) => sum + (run.duration || 0), 0) / testData.runs.length
            : 0,
        transitionRate: calculateTransitionRate(testData.runs),
        durationVariability: calculateDurationVariability(testData.runs),
        recentFailRate: calculateRecentFailRate(testData.runs),
        timingIssues: testData.patterns?.timingIssues || 0,
        selectorIssues: testData.patterns?.selectorIssues || 0,
        networkIssues: testData.patterns?.networkIssues || 0,
        dataIssues: testData.patterns?.dataIssues || 0,
        flakyScore: testData.flakyScore || 0
    };
}

module.exports = {
    calculatePassRate,
    calculateTransitionRate,
    calculateDurationVariability,
    calculateRecentFailRate,
    extractFeatures
};