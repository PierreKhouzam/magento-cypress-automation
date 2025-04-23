import checkoutData from '../fixtures/checkoutData.json';

class CheckoutPage {
    constructor() {
        this.selectors = checkoutData.selectors;
        this.urls = checkoutData.urls;
        this.messages = checkoutData.messages;
    }

    // Fill in the shipping details form with user-provided data
    fillShippingDetails(user) {
        cy.url({ timeout: 10000 }).should('include', this.urls.shippingUrl);
        cy.typeWhenReady(this.selectors.companyInput, user.company);
        cy.typeWhenReady(this.selectors.streetInput, user.street);
        cy.typeWhenReady(this.selectors.cityInput, user.city);
        cy.get(this.selectors.regionDropdown).should('be.visible').select(user.region);
        cy.typeWhenReady(this.selectors.postcodeInput, user.postcode);
        cy.typeWhenReady(this.selectors.telephoneInput, user.phone);
    }

    // Select a shipping method based on the user input
    selectShippingMethod(user) {
        cy.get(this.selectors.shippingMethodsContainer).should('be.visible');
        const radioSelector = this.selectors.shippingMethodRadio.replace('{{value}}', user.shippingMethod);
        cy.clickWhenReady(radioSelector);
    }

    // Click the continue button to proceed
    clickNext() {
        cy.clickWhenReady(this.selectors.continueButton);
    }

    // Click the place order button to complete checkout
    placeOrder() {
        cy.clickWhenReady(this.selectors.placeOrderButton, { timeout: 10000, waitBefore: 500 });
    }


    // Validate order confirmation message and number
    validateOrderConfirmation() {
        cy.url().should('include', this.urls.orderSuccess);
        cy.assertElementContent(this.selectors.thankYouHeader, this.messages.orderPlacedMsg);

        cy.get(this.selectors.orderNumber)
            .should('be.visible')
            .invoke('text')
            .then(orderNum => {
                const trimmedOrder = orderNum.trim();
                cy.wrap(trimmedOrder).as('orderNumber');
            });

    }
}

export default new CheckoutPage();
