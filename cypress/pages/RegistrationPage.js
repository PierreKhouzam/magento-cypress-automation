import registrationData from '../fixtures/registrationData.json';

class RegistrationPage {
  constructor() {
    this.selectors = registrationData.selectors;
    this.urls = registrationData.urls;
    this.messages = registrationData.messages;
  }

  // Navigate to the registration page 
  visit() {
    cy.visit(this.urls.registrationPage);
  }

  // Fill out and submit the registration 
  register(user) {
    cy.typeWhenReady(this.selectors.firstName, user.firstName);
    cy.typeWhenReady(this.selectors.lastName, user.lastName);
    cy.typeWhenReady(this.selectors.email, user.email);
    cy.typeWhenReady(this.selectors.password, user.password);
    cy.typeWhenReady(this.selectors.passwordConfirmation, user.password);
    cy.clickWhenReady(this.selectors.submitButton);
  }

  // Assert successful registration
  validateRegistrationSuccess() {
    cy.get(this.selectors.successMessage)
      .should('be.visible')
      .and('contain.text', this.messages.registrationSuccess);
  }
}

export default new RegistrationPage();
