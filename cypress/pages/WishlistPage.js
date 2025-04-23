import wishlistData from '../fixtures/wishlistData.json';

class WishlistPage {
  constructor() {
    this.selectors = wishlistData.selectors;
  }

  // Add all items from wishlist to cart
  addAllProductsToCartFromWishlist() {
    cy.clickWhenReady(this.selectors.addAllToCartButton);
  }

  // Validate that a specific product exists in the wishlist
  validateWishlistItem(productName) {
    cy.assertElementContent(this.selectors.productItemLink, productName);
  }
}

export default new WishlistPage();
