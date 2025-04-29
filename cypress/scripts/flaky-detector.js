const fs = require('fs').promises;
const path = require('path');
const config = require('./config');
const logger = require('./logger');
const { extractFeatures } = require('./features');
const { saveTestHistory } = require('./test-db');
const { generateHtmlReport } = require('./utils');

async function extractTestResults(jsonReport) {
    try {
        const reportData = typeof jsonReport === 'string' ? JSON.parse(jsonReport) : jsonReport;
        const results = [];

        if (reportData.results && Array.isArray(reportData.results)) {
            logger.info('Processing results array', { resultCount: reportData.results.length });
            reportData.results.forEach((suite, suiteIndex) => {
                if (suite.suites && Array.isArray(suite.suites)) {
                    logger.info(`Processing suite ${suiteIndex}`, { suiteCount: suite.suites.length });
                    suite.suites.forEach((innerSuite, innerSuiteIndex) => {
                        if (innerSuite.tests && Array.isArray(innerSuite.tests)) {
                            logger.info(`Processing tests in suite ${suiteIndex}.${innerSuiteIndex}`, { testCount: innerSuite.tests.length });
                            innerSuite.tests.forEach((test) => {
                                let screenshot = null;
                                if (test.context) {
                                    try {
                                        const context = JSON.parse(test.context);
                                        if (Array.isArray(context) && context[0]?.value?.startsWith('data:image')) {
                                            screenshot = context[0].value; // Store base64 data
                                        }
                                    } catch (err) {
                                        logger.warn('Failed to parse test context', { test: test.fullTitle, error: err.message });
                                    }
                                }
                                results.push({
                                    title: test.fullTitle,
                                    state: test.state,
                                    duration: test.duration || 0,
                                    err: test.err || null,
                                    screenshot: screenshot,
                                });
                            });
                        } else {
                            logger.warn(`No tests found in suite ${suiteIndex}.${innerSuiteIndex}`);
                        }
                    });
                } else {
                    logger.warn(`No suites found in result ${suiteIndex}`);
                }
            });
        } else {
            logger.error('Invalid report structure: missing results array');
        }
        logger.info('Extracted test results', { testCount: results.length });
        return results;
    } catch (error) {
        logger.error('Error parsing JSON report:', { error: error.message });
        return [];
    }
}

async function detectFlakyTests() {
    logger.info('Starting flaky test detection...');
    const reportDir = path.join(__dirname, config.reports.dir);
    let testResults = [];

    try {
        logger.info(`Scanning report directory: ${reportDir}`);
        const files = await fs.readdir(reportDir);
        const jsonFiles = files.filter((file) => file.match(/^index(_\d{3})?\.json$/));

        if (jsonFiles.length === 0) {
            logger.info('No test report files found matching index*.json.');
            return;
        }

        for (const file of jsonFiles) {
            const filePath = path.join(reportDir, file);
            logger.info(`Processing report: ${filePath}`);
            try {
                const jsonData = await fs.readFile(filePath, 'utf8');
                const results = await extractTestResults(jsonData);
                testResults.push(...results);
            } catch (err) {
                logger.error(`Error processing file ${file}:`, { error: err.message });
            }
        }

        if (testResults.length === 0) {
            logger.info('No test results extracted from report files.');
            return;
        }

        const testHistory = {};
        testResults.forEach((result) => {
            if (!testHistory[result.title]) {
                testHistory[result.title] = {
                    runs: [],
                    flakyScore: 0,
                    patterns: {
                        timingIssues: 0,
                        selectorIssues: 0,
                        networkIssues: 0,
                        dataIssues: 0,
                    },
                    aiRecommendations: [],
                };
            }
            testHistory[result.title].runs.push({
                state: result.state,
                duration: result.duration,
                error: result.err ? result.err.message : null,
                stack: result.err ? result.err.stack : null,
                timestamp: new Date().toISOString(),
            });
        });

        Object.keys(testHistory).forEach((testName) => {
            const testData = testHistory[testName];
            const features = extractFeatures(testData);
            testData.flakyScore = calculateFlakyScore(features);
            testData.patterns = {
                timingIssues: features.timingIssues,
                selectorIssues: features.selectorIssues,
                networkIssues: features.networkIssues,
                dataIssues: features.dataIssues,
            };
        });

        await saveTestHistory(testHistory);
        await generateHtmlReport(testHistory);
        logger.info('Flaky test detection completed.', {
            testsProcessed: testResults.length,
            uniqueTests: Object.keys(testHistory).length,
        });
    } catch (error) {
        logger.error('Error reading report directory:', { error: error.message });
    }
}

function calculateFlakyScore(features) {
    const weights = {
        passRate: 0.3,
        transitionRate: 0.3,
        durationVariability: 0.2,
        recentFailRate: 0.2,
    };

    return (
        weights.passRate * (1 - features.passRate) +
        weights.transitionRate * features.transitionRate +
        weights.durationVariability * features.durationVariability +
        weights.recentFailRate * features.recentFailRate
    );
}

module.exports = { detectFlakyTests, extractTestResults };