import { generateUniqueUser } from '../../utils/userUtils';
import RegistrationPage from '../../pages/RegistrationPage';
import HomePage from '../../pages/HomePage';
import ProductPage from '../../pages/ProductPage';
import WishlistPage from '../../pages/WishlistPage';
import CartPage from '../../pages/CartPage';
import CheckoutPage from '../../pages/CheckoutPage';
import productData from '../../fixtures/productData.json';

describe('Test Case C: Wishlist and Checkout', () => {
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

  it('Should add products to wishlist and checkout from wishlist', () => {
    // Step 1: Register a new user
    RegistrationPage.visit();
    RegistrationPage.register(user);

    // Step 2: Add product 1 to wishlist
    HomePage.navigateToSelectedCategory(firstProduct.category, firstProduct.subcategory, firstProduct.finalCategory);
    HomePage.clickProductByName(firstProduct.name);
    ProductPage.selectSize(firstProduct.size);
    ProductPage.selectColor(firstProduct.color);
    ProductPage.addToWishlist();

    // Step 3: Add product 2 to wishlist
    HomePage.navigateToSelectedCategory(secondProduct.category, secondProduct.subcategory, secondProduct.finalCategory);
    HomePage.clickProductByName(secondProduct.name);
    ProductPage.selectSize(secondProduct.size);
    ProductPage.selectColor(secondProduct.color);
    ProductPage.addToWishlist();

    // Step 4: Validate products in wishlist
    WishlistPage.validateWishlistItem(firstProduct.name);
    WishlistPage.validateWishlistItem(secondProduct.name);

    // Step 5: Add all wishlist items to cart
    WishlistPage.addAllProductsToCartFromWishlist();

    // Step 6: Proceed to checkout
    HomePage.goToCart();
    CartPage.proceedToCheckout();

    // Step 7: Fill shipping details and place the order
    CheckoutPage.fillShippingDetails(user);
    CheckoutPage.selectShippingMethod(user);
    CheckoutPage.clickNext();
    CheckoutPage.placeOrder();

    // Step 8: Assert successful order placement
    CheckoutPage.validateOrderConfirmation();
  });
});
