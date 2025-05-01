const fs = require('fs').promises;
const path = require('path');
const config = require('./config');
const logger = require('./logger');
const { extractFeatures } = require('./features');
const { saveTestHistory } = require('./test-db');
const { generateHtmlReport } = require('./utils');
const { updateTestHistoryWithRecommendations } = require('./ai-predictor');

async function extractTestResults(jsonReport, fileName, fileMtime) {
    try {
        logger.info(`Attempting to parse JSON from ${fileName}`);
        const reportData = typeof jsonReport === 'string' ? JSON.parse(jsonReport) : jsonReport;
        const results = [];

        logger.info(`Extracting test results from ${fileName}`);
        if (reportData.results && Array.isArray(reportData.results)) {
            logger.info(`Processing results array in ${fileName}`, { resultCount: reportData.results.length });
            reportData.results.forEach((suite, suiteIndex) => {
                logger.debug(`Suite ${suiteIndex} structure in ${fileName}`, {
                    hasTests: !!suite.tests?.length,
                    hasSuites: !!suite.suites?.length,
                    file: suite.file || 'unknown'
                });

                if (suite.tests && Array.isArray(suite.tests) && suite.tests.length > 0) {
                    logger.info(`Processing direct tests in result ${suiteIndex} in ${fileName}`, { testCount: suite.tests.length });
                    suite.tests.forEach((test) => {
                        let screenshot = null;
                        if (test.context) {
                            try {
                                const context = JSON.parse(test.context);
                                if (Array.isArray(context) && context[0]?.value?.startsWith('data:image')) {
                                    screenshot = context[0].value;
                                }
                            } catch (err) {
                                logger.warn(`Failed to parse test context in ${fileName}`, { test: test.fullTitle || 'unknown', error: err.message });
                            }
                        }
                        results.push({
                            title: test.fullTitle || 'unknown',
                            state: test.state || 'unknown',
                            duration: test.duration || 0,
                            err: test.err || null,
                            screenshot: screenshot,
                        });
                    });
                } else {
                    logger.info(`No direct tests in result ${suiteIndex} in ${fileName}`);
                }

                if (suite.suites && Array.isArray(suite.suites)) {
                    logger.info(`Processing suites in result ${suiteIndex} in ${fileName}`, { suiteCount: suite.suites.length });
                    suite.suites.forEach((innerSuite, innerSuiteIndex) => {
                        if (innerSuite.tests && Array.isArray(innerSuite.tests) && innerSuite.tests.length > 0) {
                            logger.info(`Processing tests in suite ${suiteIndex}.${innerSuiteIndex} in ${fileName}`, { testCount: innerSuite.tests.length });
                            innerSuite.tests.forEach((test) => {
                                let screenshot = null;
                                if (test.context) {
                                    try {
                                        const context = JSON.parse(test.context);
                                        if (Array.isArray(context) && context[0]?.value?.startsWith('data:image')) {
                                            screenshot = context[0].value;
                                        }
                                    } catch (err) {
                                        logger.warn(`Failed to parse test context in ${fileName}`, { test: test.fullTitle || 'unknown', error: err.message });
                                    }
                                }
                                results.push({
                                    title: test.fullTitle || 'unknown',
                                    state: test.state || 'unknown',
                                    duration: test.duration || 0,
                                    err: test.err || null,
                                    screenshot: screenshot,
                                });
                            });
                        } else {
                            logger.warn(`No tests found in suite ${suiteIndex}.${innerSuiteIndex} in ${fileName}`);
                        }
                    });
                } else {
                    logger.info(`No suites found in result ${suiteIndex} in ${fileName}`);
                }
            });
        } else {
            logger.error(`Invalid report structure in ${fileName}: missing or invalid results array`, { reportDataKeys: Object.keys(reportData) });
        }
        logger.info(`Completed extracting test results from ${fileName}`, { testCount: results.length });
        return results;
    } catch (error) {
        logger.error(`Error parsing JSON report ${fileName}:`, { error: error.message, stack: error.stack });
        return [];
    }
}

async function detectFlakyTests() {
    logger.info('Starting flaky test detection...');
    const reportDir = path.resolve(config.reports.dir);
    let testResults = [];
    const titleCounts = new Map();

    try {
        logger.info(`Verifying report directory: ${reportDir}`);
        await fs.access(reportDir).catch((err) => {
            logger.error(`Report directory does not exist or is inaccessible: ${reportDir}`, { error: err.message, stack: err.stack });
            throw new Error(`Report directory inaccessible: ${err.message}`);
        });

        logger.info(`Scanning report directory: ${reportDir}`);
        const files = await fs.readdir(reportDir).catch((err) => {
            logger.error(`Failed to read report directory ${reportDir}:`, { error: err.message, stack: err.stack });
            throw new Error(`Failed to read directory: ${err.message}`);
        });
        logger.info(`Found files in directory: ${files.join(', ')}`);
        const jsonFiles = files.filter((file) => file.match(/^index(_\d{3})?\.json$/));

        if (jsonFiles.length === 0) {
            logger.warn('No test report files found matching index*.json.');
            return;
        }

        logger.info(`Found JSON files: ${jsonFiles.join(', ')}`);
        for (const file of jsonFiles) {
            const filePath = path.join(reportDir, file);
            logger.info(`Processing report: ${filePath}`);
            try {
                logger.info(`Reading file: ${filePath}`);
                const jsonData = await fs.readFile(filePath, 'utf8');
                const stats = await fs.stat(filePath);
                const fileMtime = stats.mtime?.toISOString() || new Date().toISOString();
                logger.debug(`File mtime for ${file}: ${fileMtime}`);
                const results = await extractTestResults(jsonData, file, fileMtime);
                logger.info(`Extracted ${results.length} test results from ${file}`);
                results.forEach((result) => {
                    titleCounts.set(result.title, (titleCounts.get(result.title) || 0) + 1);
                    testResults.push({ ...result, fileMtime });
                });
            } catch (err) {
                logger.error(`Error processing file ${file}:`, { error: err.message, stack: err.stack });
            }
        }

        if (testResults.length === 0) {
            logger.warn('No test results extracted from report files.');
            return;
        }

        // Log title counts to detect duplicates
        titleCounts.forEach((count, title) => {
            if (count > 1) {
                logger.info(`Test title "${title}" appears ${count} times across JSON files`);
            }
        });

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
                timestamp: result.fileMtime,
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
        // Update test history with recommendations
        logger.info('Updating test history with AI recommendations...');
        let testHistoryUpdated;
        try {
            await updateTestHistoryWithRecommendations();
            // Read the updated test-history.json directly
            const historyPath = path.join(config.db.dir, 'test-history.json');
            let attempts = 3;
            while (attempts > 0) {
                try {
                    const historyData = await fs.readFile(historyPath, 'utf8');
                    testHistoryUpdated = JSON.parse(historyData);
                    // Validate testHistoryUpdated
                    if (!testHistoryUpdated || typeof testHistoryUpdated !== 'object' || Object.keys(testHistoryUpdated).length === 0) {
                        throw new Error('Invalid or empty test history data');
                    }
                    logger.info('Test history loaded successfully', {
                        testCount: Object.keys(testHistoryUpdated).length,
                        recommendations: Object.values(testHistoryUpdated).map(t => t.aiRecommendations?.length || 0),
                        recommendationDetails: Object.fromEntries(
                            Object.entries(testHistoryUpdated).map(([name, data]) => [name, data.aiRecommendations || []])
                        )
                    });
                    break;
                } catch (error) {
                    attempts--;
                    if (attempts === 0) {
                        logger.error('Failed to read or parse test history after retries:', { error: error.message, stack: error.stack });
                        throw new Error(`Failed to read or parse test history: ${error.message}`);
                    }
                    logger.warn(`Retrying read of test-history.json (${attempts} attempts left)...`);
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            logger.info('Successfully updated and loaded test history with recommendations');
        } catch (error) {
            logger.error('Failed to update or load test history with recommendations:', { error: error.message, stack: error.stack });
            throw new Error(`Failed to update or load recommendations: ${error.message}`);
        }

        // Generate HTML report
        logger.info('Generating HTML report...');
        try {
            await generateHtmlReport(testHistoryUpdated);
            logger.info('HTML report generated successfully');
        } catch (error) {
            logger.error('Failed to generate HTML report:', { error: error.message, stack: error.stack });
            throw new Error(`Failed to generate HTML report: ${error.message}`);
        }

        logger.info('Flaky test detection completed.', {
            testsProcessed: testResults.length,
            uniqueTests: Object.keys(testHistoryUpdated).length,
        });

    } catch (error) {
        logger.error('Error in flaky test detection:', { error: error.message, stack: error.stack });
        throw error;
    }
}

function calculateFlakyScore(features) {
    const weights = {
        passRate: 0.3,
        transitionRate: 0.3,
        durationVariability: 0.2,
        recentFailRate: 0.2,
    };

    const score = (
        weights.passRate * (1 - features.passRate) +
        weights.transitionRate * features.transitionRate +
        weights.durationVariability * features.durationVariability +
        weights.recentFailRate * features.recentFailRate
    );

    logger.debug('Calculated flaky score', { features, score });
    return score;
}

module.exports = { detectFlakyTests, extractTestResults };