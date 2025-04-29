import { generateUniqueUser } from '../../utils/userUtils';
import RegistrationPage from '../../pages/RegistrationPage';
import LoginPage from '../../pages/LoginPage';

describe.only('Test Case A: Registration flow with login validation', () => {
    let user;

    before(() => {
        user = generateUniqueUser();
    });

    beforeEach(() => {
        cy.clearCookies();
        cy.clearLocalStorage();
    });

    it.only('Should register a new user and validate login', () => {
        // Step 1: Register a new user
        RegistrationPage.visit();
        RegistrationPage.register(user);

        // Step 2: Validate successful registration
        RegistrationPage.validateRegistrationSuccess();
    });

    it('Should allow user to log in with registered credentials', () => {
        // Step 1: Visit the login page
        LoginPage.visit();

        // Step 2: Login using the previously registered credentials
        LoginPage.login(user);

        // Step 3: Validate successful login
        LoginPage.validateLoginSuccess(user);
    });
});
