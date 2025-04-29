module.exports = {
    reports: { dir: 'cypress/reports' },
    db: { dir: 'cypress/db' },
    ml: { maxDepth: 10, minNumSamples: 2 },
    flakiness: {
        flakyScoreThreshold: 0.15,
        passRateThreshold: 0.85,
        transitionRateThreshold: 0.2,
        durationVariabilityThreshold: 0.5,
        recentFailRateThreshold: 0.3
    }
};