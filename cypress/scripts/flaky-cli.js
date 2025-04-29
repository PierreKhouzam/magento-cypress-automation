const readline = require('readline');
const path = require('path');
const { execSync } = require('child_process');
const { loadTestHistory } = require('./test-db');
const logger = require('./logger');
const { generateRecommendations } = require('./recommendations');
const { detectFlakyTests } = require('./flaky-detector');
const { analyzeFlakiness } = require('./ai-predictor');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Print ASCII art header.
 */
function printHeader() {
    console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║         AI TEST AGENT - FLAKY TEST DETECTOR       ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
  `);
}

/**
 * Show main menu.
 */
function showMainMenu() {
    printHeader();
    console.log('What would you like to do?');
    console.log('1. Analyze flaky tests');
    console.log('2. View test history');
    console.log('3. Generate recommendations');
    console.log('4. Simulate a flaky test');
    console.log('5. Run tests');
    console.log('6. Exit');

    rl.question('\nEnter your choice (1-6): ', (answer) => {
        switch (answer) {
            case '1':
                analyzeTests();
                break;
            case '2':
                viewTestHistory();
                break;
            case '3':
                generateRecommendationsCli();
                break;
            case '4':
                simulateFlaky();
                break;
            case '5':
                runTests();
                break;
            case '6':
                console.log('Goodbye!');
                rl.close();
                break;
            default:
                console.log('Invalid choice. Please try again.');
                showMainMenu();
                break;
        }
    });
}

/**
 * Analyze tests for flakiness.
 */
async function analyzeTests() {
    console.log('\nAnalyzing test reports for flakiness...');
    try {
        await detectFlakyTests();
        console.log('\nRunning AI-powered flakiness prediction...');
        await analyzeFlakiness();
    } catch (error) {
        logger.error('Error analyzing tests:', { error: error.message, stack: error.stack });
    }
    rl.question('\nPress Enter to return to the main menu...', () => {
        showMainMenu();
    });
}

/**
 * View test history for a specific test.
 */
async function viewTestHistory() {
    const history = await loadTestHistory();
    const testNames = Object.keys(history);

    if (testNames.length === 0) {
        console.log('\nNo test history available.');
        rl.question('\nPress Enter to return to the main menu...', () => {
            showMainMenu();
        });
        return;
    }

    console.log('\nAvailable tests:');
    testNames.forEach((name, index) => {
        console.log(`${index + 1}. ${name}`);
    });

    rl.question('\nEnter test number to view details (or 0 to go back): ', (answer) => {
        const testIndex = parseInt(answer) - 1;

        if (answer === '0' || isNaN(testIndex) || testIndex < 0 || testIndex >= testNames.length) {
            showMainMenu();
            return;
        }

        const testName = testNames[testIndex];
        const testData = history[testName];

        console.log(`\n=== Test History for "${testName}" ===`);
        console.log(`Flaky Score: ${testData.flakyScore.toFixed(2)}`);
        console.log(`Total Runs: ${testData.runs.length}`);
        console.log(`Pass Rate: ${(testData.runs.filter(r => r.state === 'passed').length / testData.runs.length * 100).toFixed(1)}%`);

        console.log('\nIssue Analysis:');
        console.log(`- Timing Issues: ${testData.patterns.timingIssues}`);
        console.log(`- Selector Issues: ${testData.patterns.selectorIssues}`);
        console.log(`- Network Issues: ${testData.patterns.networkIssues}`);
        console.log(`- Data Issues: ${testData.patterns.dataIssues}`);

        console.log('\nAI Recommendations:');
        if (testData.aiRecommendations && testData.aiRecommendations.length > 0) {
            testData.aiRecommendations.forEach((rec, idx) => {
                console.log(`${idx + 1}. ${rec}`);
            });
        } else {
            console.log('No AI recommendations available.');
        }

        rl.question('\nPress Enter to return to the main menu...', () => {
            showMainMenu();
        });
    });
}

/**
 * Generate recommendations for fixing flaky tests.
 */
async function generateRecommendationsCli() {
    console.log('\nGenerating recommendations for fixing flaky tests...');

    const history = await loadTestHistory();
    const flakyTests = Object.entries(history)
        .filter(([_, testData]) => testData.flakyScore > 0.3)
        .map(([testName, testData]) => ({ testName, features: extractFeatures(testData) }));

    if (flakyTests.length === 0) {
        console.log('No flaky tests found for recommendations.');
    } else {
        flakyTests.forEach(({ testName, features }) => {
            const issueType = determineIssueType(features);
            const recommendations = generateRecommendations(features, issueType);
            console.log(`\nTest: ${testName}`);
            recommendations.forEach((rec, idx) => {
                console.log(`${idx + 1}. ${rec}`);
            });
        });
    }

    rl.question('\nPress Enter to return to the main menu...', () => {
        showMainMenu();
    });
}

/**
 * Determine primary issue type from features.
 * @param {Object} features - Test features
 * @returns {string} Issue type
 */
function determineIssueType(features) {
    const patterns = [
        { type: 'timing', count: features.timingIssues },
        { type: 'selector', count: features.selectorIssues },
        { type: 'network', count: features.networkIssues },
        { type: 'data', count: features.dataIssues }
    ];
    return patterns.reduce((max, curr) => curr.count > max.count ? curr : max, { type: 'unknown', count: 0 }).type;
}

/**
 * Simulate a flaky test for testing purposes.
 */
function simulateFlaky() {
    console.log('\nSimulating a flaky test...');

    const isFlaky = Math.random() < 0.5;
    if (isFlaky) {
        console.log('Simulated test failed intermittently...');
    } else {
        console.log('Simulated test passed.');
    }

    rl.question('\nPress Enter to return to the main menu...', () => {
        showMainMenu();
    });
}

/**
 * Run tests and analyze results.
 */
async function runTests() {
    console.log('\nRunning tests...');

    try {
        execSync('npx cypress run --headless', { stdio: 'inherit' });
        console.log('\nAnalyzing the results...');
        await detectFlakyTests();
    } catch (error) {
        logger.error('Error running tests:', { error: error.message, stack: error.stack });
    }

    rl.question('\nPress Enter to return to the main menu...', () => {
        showMainMenu();
    });
}

// Start the CLI
showMainMenu();