const { defineConfig } = require('cypress');

module.exports = defineConfig({
  reporter: 'cypress-mochawesome-reporter',
  reporterOptions: {
    reportDir: 'cypress/reports',
    embeddedScreenshots: true,
    inlineAssets: true,
    overwrite: true,
    html: true,
    json: true
  },

  e2e: {
    setupNodeEvents(on, config) {
      require('cypress-mochawesome-reporter/plugin')(on);
    },

    baseUrl: 'https://magento.softwaretestingboard.com/',


    // Adjust timeouts as needed
    pageLoadTimeout: 90000,
    defaultCommandTimeout: 10000,
  },
});
