# 🧪 Magento Cypress Automation - UI Testing

Automated UI and functional tests for the [Magento Demo Site](https://magento.softwaretestingboard.com) using **Cypress** with the **Page Object Model (POM)** pattern.

---

## ✅ Overview

This project covers major user flows including login, registration, product search, wishlist, cart, and checkout. It uses a modular test structure with dynamic test data and rich reporting.

---

## ⚙️ Prerequisites

- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- npm (comes with Node.js)
- (Optional) VS Code or any IDE

---

## 🚀 Setup & Run

### 1. Clone & Install

```bash
git clone <repo-url>
cd magento-cypress-automation
npm install
```

### 2. Run All Tests (CLI)

```bash
npm run test
```

### 3. Run Cypress Test Runner (Interactive Mode)

```bash
npx cypress open
```

> Select the browser and test spec to run from the Cypress test runner window.

### 4. Run Specific Test File

```bash
npx cypress run --spec "cypress/e2e/tests/TestCaseA.cy.js"
```

---

## 📁 Project Structure

```
magento-cypress-automation/
├── cypress/
│   ├── fixtures/         # Test data (JSON format)
│   ├── pages/            # Page Object Model classes
│   ├── e2e/tests/        # Test cases
│   ├── utils/            # Utility functions (e.g., dynamic user generation)
│   ├── reports/          # Test reports (HTML format)
│   ├── screenshots/      # Cypress screenshots for failed tests
│   ├── downloads/        # Downloaded files from tests
│   └── support/          # Custom commands and support setup
├── cypress.config.js     # Cypress configuration
├── package.json          # Project metadata and dependencies
├── package-lock.json     # Lock file for reproducible installs
└── README.md             # You're here!
```

### 📂 External Test Data Files

```
cypress/fixtures/userData.json
cypress/fixtures/cartData.json
cypress/fixtures/checkoutData.json
cypress/fixtures/homeData.json
cypress/fixtures/loginData.json
cypress/fixtures/productData.json
cypress/fixtures/registrationData.json
cypress/fixtures/wishlistData.json
```

---

## 🧪 Test Structure

- Written using **Mocha** and **Chai** syntax
- Uses Cypress commands and modular **Page Object Model (POM)**
- Test data is externalized in JSON files under `cypress/fixtures/`

---

## 🧰 Utilities

- **Dynamic User Generator**: `cypress/utils/userUtils.js`
- **Custom Commands**: Extended Cypress commands under `cypress/support/`
- **POM Coverage**: Login, Registration, Cart, Wishlist, Product Search, and more

---

## 🧪 Test Cases Covered

| ID  | Description                                         |
| --- | --------------------------------------------------- |
| A   | Register a new user and validate login              |
| B   | Place order with multiple products and verify price |
| C   | Add products to wishlist and checkout               |
| D   | Search for products and validate results            |

---

## 📊 Reporting

- Generates both **HTML** and **JSON** test reports
- Screenshots captured on failure
- Artifacts stored under:

```
cypress/reports/
cypress/screenshots/
cypress/downloads/
```

### Generate Report

```bash
npm run report
```

### Merge & Generate HTML Report

```bash
npm run merge-reports
npm run generate-html-report
```

---

## 🔧 Plugin Installation

Run the following to install all required reporting plugins:

```bash
npm install --save-dev cypress cypress-mochawesome-reporter mochawesome mochawesome-merge mochawesome-report-generator
```

### 🔌 Plugin Summary

| Package                        | Purpose                                          |
| ------------------------------ | ------------------------------------------------ |
| `cypress`                      | Core framework for UI automation                 |
| `cypress-mochawesome-reporter` | Plugin for Cypress to output mochawesome reports |
| `mochawesome`                  | HTML + JSON test reports generator               |
| `mochawesome-merge`            | Merge multiple mochawesome report JSONs          |
| `mochawesome-report-generator` | Converts merged reports into a styled HTML file  |

---

## 👨‍💻 Contribution

1. Fork this repo  
2. Create a new branch: `git checkout -b feature/your-feature`  
3. Commit changes: `git commit -am 'Add feature'`  
4. Push to branch: `git push origin feature/your-feature`  
5. Open a pull request

---

## 📃 License

MIT © Pierre Khouzam
