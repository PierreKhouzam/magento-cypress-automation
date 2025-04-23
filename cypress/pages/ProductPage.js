import productData from '../fixtures/productData.json';

class ProductPage {
  constructor() {
    this.selectors = productData.selectors;
  }

  // Select the size of the product
  selectSize(size) {
    const sizeLocator = this.selectors.sizeOption.replace('${size}', size);
    cy.clickWhenReady(sizeLocator);
  }

  // Select the color of the product
  selectColor(color) {
    const colorLocator = this.selectors.colorOption.replace('${color}', color);
    cy.clickWhenReady(colorLocator);
  }

  // Get the product price
  getProductPrice() {
    return cy
      .get(this.selectors.productPrice)
      .invoke('text')
      .then(txt => parseFloat(txt.replace('$', '').trim()));
  }

  // Add the product to the cart
  addToCart() {
    cy.clickWhenReady(this.selectors.addToCartButton);
  }

  // Add the product to the wishlist
  addToWishlist() {
    cy.clickWhenReady(this.selectors.addToWishlistButton);
  }
}

export default new ProductPage();
