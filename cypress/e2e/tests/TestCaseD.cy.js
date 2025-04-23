import HomePage from "../../pages/HomePage";
import homeData from "../../fixtures/homeData.json";

describe.only('Test Case D: Search and Validate Results', () => {
  let validProduct;
  let invalidProduct;

  before(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    validProduct = homeData.searchTerms.validProduct;
    invalidProduct = homeData.searchTerms.invalidProduct;
  });

  it.only('Should search for a valid product and validate results, then search invalid and validate empty results', () => {

    // Step 1: Visit Home Page
    HomePage.visit();


    // Step 2: Search for a valid product and verify results
    HomePage.searchForProduct(validProduct);
    HomePage.validateSearchResults(validProduct);

    // Step 3: Search for a non-existent product and verify no results message
    HomePage.searchForProduct(invalidProduct);
    HomePage.validateNoSearchResults();
  });
});
