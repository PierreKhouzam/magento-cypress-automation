import cartData from '../fixtures/cartData.json';

class CartPage {
  constructor() {
    this.selectors = cartData.selectors;
    this.urls = cartData.urls;
  }

  // Verifies that a specific product is present in the cart.
  verifyProductInCart(productName) {
    cy.url().should('include', this.urls.cartPage);
    cy.assertElementContent(this.selectors.productItemName, productName);
  }

  // Clicks the Proceed to Checkout button from the cart page.
  proceedToCheckout() {
    cy.clickWhenReady(this.selectors.proceedToCheckoutButton);
  }
}

export default new CartPage();
