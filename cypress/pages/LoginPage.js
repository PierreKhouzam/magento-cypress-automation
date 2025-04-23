import loginData from '../fixtures/loginData.json';

class LoginPage {
    constructor() {
        this.selectors = loginData.selectors;
        this.urls = loginData.urls;
    }

    // Visit the login page
    visit() {
        cy.visit(this.urls.loginPage);
    }

    // Fill in login form and submit
    login(user) {
        cy.typeWhenReady(this.selectors.emailInput, user.email);
        cy.typeWhenReady(this.selectors.passwordInput, user.password);
        cy.clickWhenReady(this.selectors.loginButton);
    }

    // Validate successful login by checking the welcome message
    validateLoginSuccess(user) {
        cy.assertElementContent(
            this.selectors.welcomeMessage,
            `Welcome, ${user.firstName} ${user.lastName}!`
        );
    }
}

export default new LoginPage();
