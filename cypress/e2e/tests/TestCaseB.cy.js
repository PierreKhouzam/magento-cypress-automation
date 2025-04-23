import { generateUniqueUser } from '../../utils/userUtils';
import RegistrationPage from '../../pages/RegistrationPage';
import HomePage from '../../pages/HomePage';
import ProductPage from '../../pages/ProductPage';
import CartPage from '../../pages/CartPage';
import CheckoutPage from '../../pages/CheckoutPage';
import productData from '../../fixtures/productData.json';


describe('Test Case B: Place order with multiple products and validate price', () => {
  let user;
  let firstProduct;
  let secondProduct;

  before(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    user = generateUniqueUser();
    firstProduct = productData.products.firstProduct;
    secondProduct = productData.products.secondProduct;
  });

  it('Should register and add multiple products to cart then verify total price', () => {
    // Step 1: Register a new user
    RegistrationPage.visit();
    RegistrationPage.register(user);

    // Step 2: Add first product
    HomePage.navigateToSelectedCategory(firstProduct.category, firstProduct.subcategory, firstProduct.finalCategory);
    HomePage.clickProductByName(firstProduct.name);
    ProductPage.selectSize(firstProduct.size);
    ProductPage.selectColor(firstProduct.color);
    cy.get(productData.selectors.addToCartButton)
      .should('be.visible')
      .and('not.be.disabled')
      .click();

    // Step 3: Add second product
    HomePage.navigateToSelectedCategory(secondProduct.category, secondProduct.subcategory, secondProduct.finalCategory);
    HomePage.clickProductByName(secondProduct.name);
    ProductPage.selectSize(secondProduct.size);
    ProductPage.selectColor(secondProduct.color);
    cy.get(productData.selectors.addToCartButton)
      .should('be.visible')
      .and('not.be.disabled')
      .click();

    // Step 4: Go to Cart and validate
    HomePage.goToCart();
    CartPage.verifyProductInCart(firstProduct.name);
    CartPage.verifyProductInCart(secondProduct.name);

    // Step 5: Fill shipping details and place the order
    CartPage.proceedToCheckout();
    CheckoutPage.fillShippingDetails(user);
    CheckoutPage.selectShippingMethod(user);
    CheckoutPage.clickNext();
    CheckoutPage.placeOrder();

    // Step 6: Assert successful order placement
    CheckoutPage.validateOrderConfirmation();
  });
});
