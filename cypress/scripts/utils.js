// cypress/scripts/utils.js
const fs = require('fs').promises;
const path = require('path');

async function generateHtmlReport(testHistory) {
    try {
        const reportDir = path.join(__dirname, '../../cypress/reports');
        const reportPath = path.join(reportDir, 'flaky-tests-report.html');

        let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Flaky Test Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .flaky { color: red; }
          .stable { color: green; }
        </style>
      </head>
      <body>
        <h1>Flaky Test Report</h1>
        <table>
          <tr>
            <th>Test Name</th>
            <th>Flaky Score</th>
            <th>Pass Rate</th>
            <th>Total Runs</th>
            <th>Issues</th>
            <th>Recommendations</th>
          </tr>
    `;

        for (const [testName, testData] of Object.entries(testHistory)) {
            const passRate = testData.runs.filter(r => r.state === 'passed').length / testData.runs.length * 100;
            const issueSummary = `
        Timing: ${testData.patterns.timingIssues}<br>
        Selector: ${testData.patterns.selectorIssues}<br>
        Network: ${testData.patterns.networkIssues}<br>
        Data: ${testData.patterns.dataIssues}
      `;
            const recommendations = testData.aiRecommendations?.join('<br>') || 'None';
            const flakyClass = testData.flakyScore > 0.3 ? 'flaky' : 'stable';

            htmlContent += `
        <tr>
          <td>${testName}</td>
          <td class="${flakyClass}">${testData.flakyScore.toFixed(2)}</td>
          <td>${passRate.toFixed(1)}%</td>
          <td>${testData.runs.length}</td>
          <td>${issueSummary}</td>
          <td>${recommendations}</td>
        </tr>
      `;
        }

        htmlContent += `
        </table>
      </body>
      </html>
    `;

        await fs.writeFile(reportPath, htmlContent);
        console.log(`Flaky test report generated at ${reportPath}`);
    } catch (error) {
        console.error('Error generating HTML report:', error);
    }
}

module.exports = { generateHtmlReport };