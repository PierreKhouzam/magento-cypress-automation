import homeData from '../fixtures/homeData.json';

class HomePage {
  constructor() {
    this.selectors = homeData.selectors;
    this.urls = homeData.urls;
    this.messages = homeData.messages;
  }

  // Visit the homepage
  visit() {
    cy.visit(this.urls.homepageUrl);
  }

  // Search for a product using the search input
  searchForProduct(productName) {
    cy.typeWhenReady(this.selectors.searchInput, productName, true);
  }

  // Validate search results contain the product name
  validateSearchResults(productName) {
    cy.url().should('include', this.urls.searchResults);
    cy.assertSearchResultsContain(productName);
  }

  // Validate no search results message is shown
  validateNoSearchResults() {
    cy.assertElementContent(this.selectors.noResultsMessage, this.messages.noResults);
  }

  // Navigate to a specific category, subcategory, and final category
  navigateToSelectedCategory(category, subcategory, finalCategory) {
    cy.hoverOverFinalCategory(category, subcategory, finalCategory);
  }

  // Click a product by its name
  clickProductByName(productName) {
    cy.contains(this.selectors.productItemLink, productName).click();
  }

  // Open minicart and go to full cart
  goToCart() {
    cy.openMinicart();
    cy.clickWhenReady(this.selectors.viewCartButton);
  }

  // Open minicart and proceed to checkout
  minicartCheckout() {
    cy.openMinicart();
    cy.clickWhenReady(this.selectors.checkoutButton);
  }
}

export default new HomePage();