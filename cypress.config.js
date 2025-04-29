const { defineConfig } = require('cypress');

module.exports = defineConfig({
  reporter: 'cypress-mochawesome-reporter',
  reporterOptions: {
    reportDir: 'cypress/reports',
    embeddedScreenshots: true,
    inlineAssets: true,
    overwrite: false,
    html: false,
    json: true,
    saveJson: true,
    jsonDir: 'cypress/reports/.jsons'
  },
  e2e: {
    setupNodeEvents(on, config) {
      require('cypress-mochawesome-reporter/plugin')(on);
    },
    baseUrl: 'https://magento.softwaretestingboard.com/',
    pageLoadTimeout: 90000,
    defaultCommandTimeout: 10000,
  },
});