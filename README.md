# Magento Cypress demo

Small **Cypress** demo against the public [Magento sample store](https://magento.softwaretestingboard.com): registration/login, cart/checkout, wishlist, and product search. Tests use **Page Object** helpers under `cypress/pages/` and data in `cypress/fixtures/`.

## Setup

```bash
npm install
```

## Run

```bash
npm run test
```

Interactive UI:

```bash
npx cypress open
```

Single spec:

```bash
npx cypress run --spec cypress/e2e/tests/TestCaseA.cy.js
```

Reports and screenshots are written under `cypress/reports/`, `cypress/screenshots/`, and `cypress/downloads/` (see `cypress.config.js`). Optional merged HTML: `npm run merge-reports` then `npm run generate-html-report`.

## License

MIT © Pierre Khouzam
