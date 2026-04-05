// ***********************************************************
// This is a support file that runs before every test
// It's loaded automatically by Cypress
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Suppress uncaught exception reporting for React router errors
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  return false;
});
