// cypress/scripts/config.js
module.exports = {
    reports: { dir: '../../cypress/reports' }, // From cypress/scripts to cypress/reports
    db: { dir: '../../db' }, // From cypress/scripts to project root db
    flakiness: {
        flakyScoreThreshold: 0.3,
        passRateThreshold: 0.7,
        transitionRateThreshold: 0.3,
        durationVariabilityThreshold: 0.5,
        recentFailRateThreshold: 0.3
    },
    ml: { maxDepth: 10, minNumSamples: 5 }
};