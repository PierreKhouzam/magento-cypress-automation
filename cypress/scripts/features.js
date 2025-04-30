const logger = require('./logger');

/**
 * Calculate pass rate from test runs.
 * @param {Array} runs - Array of test runs with state property
 * @returns {number} Pass rate (0 to 1)
 */
function calculatePassRate(runs) {
    if (!Array.isArray(runs) || runs.length === 0) return 0;
    return runs.filter(run => run.state === 'passed').length / runs.length;
}

/**
 * Calculate transition rate between test states.
 * @param {Array} runs - Array of test runs with state property
 * @returns {number} Transition rate (0 to 1)
 */
function calculateTransitionRate(runs) {
    if (!Array.isArray(runs) || runs.length <= 1) return 0;
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
    if (!Array.isArray(runs) || runs.length < 2) return 0;
    const durations = runs.map(run => run.duration || 0).filter(d => d > 0);
    if (durations.length < 2) return 0;
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
    if (!Array.isArray(runs) || runs.length === 0) return 0;
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
    if (!testData || !Array.isArray(testData.runs)) {
        logger.warn('Invalid testData or missing runs', { testData });
        return {
            passRate: 0,
            avgDuration: 0,
            transitionRate: 0,
            timingIssues: 0,
            selectorIssues: 0,
            networkIssues: 0,
            dataIssues: 0,
            durationVariability: 0,
            recentFailRate: 0
        };
    }

    const runs = testData.runs;
    let timingIssues = 0;
    let selectorIssues = 0;
    let networkIssues = 0;
    let dataIssues = 0;

    runs.forEach((run, index) => {
        let errorMsg = '';
        if (run.err?.message) {
            errorMsg = run.err.message.toLowerCase();
        } else if (run.error && typeof run.error === 'string') {
            errorMsg = run.error.toLowerCase();
        }

        if (errorMsg) {
            if (errorMsg.includes('time') || errorMsg.includes('timeout') || errorMsg.includes('wait')) {
                timingIssues++;
            }
            if (errorMsg.includes('selector') || errorMsg.includes('element') || errorMsg.includes('not found')) {
                selectorIssues++;
            }
            if (errorMsg.includes('network') || errorMsg.includes('connection') || errorMsg.includes('request')) {
                networkIssues++;
            }
            if (errorMsg.includes('data') || errorMsg.includes('invalid') || errorMsg.includes('missing')) {
                dataIssues++;
            }
        }
    });

    const features = {
        passRate: calculatePassRate(runs),
        avgDuration: runs.length ? runs.reduce((sum, run) => sum + (run.duration || 0), 0) / runs.length : 0,
        transitionRate: calculateTransitionRate(runs),
        durationVariability: calculateDurationVariability(runs),
        recentFailRate: calculateRecentFailRate(runs),
        timingIssues,
        selectorIssues,
        networkIssues,
        dataIssues
    };

    logger.debug('Extracted features for test', {
        testTitle: runs[0]?.title || testData.title || 'unknown',
        features,
        runs: runs.map(r => ({ state: r.state, err: r.err?.message || r.error || null }))
    });

    return features;
}

module.exports = {
    calculatePassRate,
    calculateTransitionRate,
    calculateDurationVariability,
    calculateRecentFailRate,
    extractFeatures
};