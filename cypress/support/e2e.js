// Register Mochawesome Reporter for detailed HTML reports
import 'cypress-mochawesome-reporter/register';
import addContext from 'mochawesome/addContext';


// Load custom commands
import './commands';

// wait until commands
import 'cypress-wait-until';


// Ignore specific non-breaking Magento JS errors to avoid false test failures
Cypress.on('uncaught:exception', (err) => {
    if (
        err.message.includes('AddFotoramaVideoEvents') ||
        err.message.includes("Cannot read properties of undefined (reading 'clone')") ||
        err.message.includes("Cannot read properties of undefined (reading 'data')")
    ) {
        return false;
    }
});

// Screenshot on success after each test
afterEach(function () {
    if (this.currentTest.state === 'passed') {
        const title = this.currentTest.title.replace(/[:\/\\]/g, '');
        const screenshotFileName = `success-${title}.png`;
        const specName = Cypress.spec.name;
        const screenshotPath = `../screenshots/${specName}/${screenshotFileName}`;


        // Take screenshot and add to report
        cy.screenshot(`success-${title}`, { capture: 'runner' }).then(() => {
            addContext({ test: this }, screenshotPath);
            console.log('Screenshot added to report:', screenshotPath);
        });
    }
});
