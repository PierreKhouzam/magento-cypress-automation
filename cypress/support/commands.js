// ************************
// Custom Cypress Commands 
// ************************


import homeData from '../fixtures/homeData.json';
import wishlistData from '../fixtures/wishlistData.json';

/**
 * Select final category from main menu
 */
Cypress.Commands.add('hoverOverFinalCategory', (category, subcategory, finalCategory) => {
    // Get the main category (level0)
    cy.get(homeData.selectors.categoryNav)
        .contains(category)
        .parents(homeData.selectors.level0Item)
        .as('level0');

    // Force show the level0 submenu
    cy.get('@level0')
        .find(homeData.selectors.submenuLevel0)
        .invoke('show');

    // Hover and show level1 submenu from subcategory
    cy.get('@level0')
        .find(homeData.selectors.submenuLevel0)
        .contains(subcategory)
        .parents(homeData.selectors.level1Item)
        .as('level1');

    cy.get('@level1')
        .find(homeData.selectors.submenuLevel1)
        .invoke('show');

    // Final hover and click the last category
    cy.get('@level1')
        .find(homeData.selectors.submenuLevel1)
        .contains(finalCategory)
        .should('be.visible')
        .click({ force: true });
});


/**
 * Wait until the mini cart updates (has items) and open it
 */
Cypress.Commands.add('openMinicart', () => {
    cy.waitUntil(() =>
        cy.get(homeData.selectors.miniCartCounter)
            .should('be.visible')
            .invoke('text')
            .then(text => parseInt(text.trim()) > 0),
        {
            errorMsg: 'Mini cart did not update in time',
            timeout: 15000,
            interval: 500
        }
    );

    cy.get(homeData.selectors.miniCartTrigger)
        .should('be.visible')
        .click();
});

/**
 * Assert that all search result product names contain the expected keyword
 */
Cypress.Commands.add('assertSearchResultsContain', (keyword) => {
    cy.get(homeData.selectors.searchResultsWrapper).each(($el) => {
        cy.wrap($el).within(() => {
            cy.get(homeData.selectors.searchResultName)
                .should('be.visible')
                .invoke('text')
                .should('include', keyword);
        });
    });
});

/**
 * Add a specific product from the wishlist to the cart
 */
Cypress.Commands.add('addSpecificProductToCartFromWishlist', (productName) => {
    cy.contains('.product-item', productName).within(() => {
        cy.get(wishlistData.selectors.addToCartButton)
            .should('exist')
            .invoke('show')
            .scrollIntoView({ block: 'center' })
            .click({ force: true });
    });
});

/**
 * Click an element only when it's visible and enabled
 */
Cypress.Commands.add('clickWhenReady', (selector, options = {}) => {
    const defaultOptions = { timeout: Cypress.config('defaultCommandTimeout'), waitBefore: 0 };
    const mergedOptions = { ...defaultOptions, ...options };

    if (mergedOptions.waitBefore > 0) {
        cy.wait(mergedOptions.waitBefore);
    }

    return cy.get(selector, { timeout: mergedOptions.timeout })
        .should('be.visible')
        .and('not.be.disabled')
        .click();
});

/**
 * Type inside field element only when it's visible and enabled
 */
Cypress.Commands.add('typeWhenReady', (selector, value, enter = false) => {
    cy.get(selector, { timeout: 10000 })
        .should('be.visible')
        .clear()
        .type(value)
        .then(() => {
            if (enter) {
                cy.get(selector).type('{enter}');
            }

        });
});

/**
 * Assert that an element contains expected text content
 */
Cypress.Commands.add('assertElementContent', (selector, expectedContent, options = {}) => {
    return cy.get(selector, options)
        .should('be.visible')
        .and('contain.text', expectedContent);
});

/**
 * Assert that an element contains a numeric value close to an expected number
 */
Cypress.Commands.add('assertNumericValue', (selector, expectedValue, options = {}) => {
    return cy.get(selector, options)
        .should('be.visible')
        .invoke('text')
        .then(text => {
            const actualValue = parseFloat(text.replace(/[^0-9.]/g, ''));
            expect(actualValue).to.be.closeTo(expectedValue, 0.01);
        });
});

/**
 * Retry a custom operation a set number of times if it fails
 */
Cypress.Commands.add('retryUntil', (fn, options = {}) => {
    const {
        retries = 3,
        delay = 1000
    } = options;

    let attempts = 0;

    function tryAgain(resolve, reject) {
        attempts++;

        Cypress.Promise.try(fn).then(resolve).catch((err) => {
            if (attempts < retries) {
                cy.wait(delay).then(() => tryAgain(resolve, reject));
            } else {
                reject(err);
            }
        });
    }

    return new Cypress.Promise((resolve, reject) => {
        tryAgain(resolve, reject);
    });
});


/**
 * Log a step in the test runner for better debugging and traceability
 */
Cypress.Commands.add('logStep', (stepNumber, description) => {
    Cypress.log({
        name: `Step ${stepNumber}`,
        message: description,
        consoleProps: () => {
            return {
                'Step': stepNumber,
                'Description': description,
                'Timestamp': new Date().toISOString()
            };
        }
    });
});

