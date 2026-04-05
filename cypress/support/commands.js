// ***********************************************
// This commands file contains custom commands for Cypress
// ***********************************************

// Custom command to login as a signer (using mock data)
Cypress.Commands.add('loginAsSigner', () => {
  // Intercept API calls to mock authentication
  cy.intercept('GET', '/api/v1/envelopes/*/signing', {
    statusCode: 200,
    fixture: 'signingData.json'
  }).as('getSigningData');
  
  // Intercept OTP verification
  cy.intercept('POST', '/api/v1/envelopes/*/otp/send', {
    statusCode: 200,
    body: { message: 'OTP sent successfully' }
  }).as('sendOTP');
  
  cy.intercept('POST', '/api/v1/envelopes/*/otp/verify', {
    statusCode: 200,
    body: { message: 'OTP verified successfully' }
  }).as('verifyOTP');
  
  // Mock watermark check for free tier
  cy.intercept('GET', '/api/v1/organizations/*/watermark-check', {
    statusCode: 200,
    body: { requiresWatermark: true }
  }).as('checkWatermark');
  
  // Set storage to mimic authenticated state
  localStorage.setItem('signerToken', 'mock-token-123');
});

// Custom command to login as a paid user
Cypress.Commands.add('loginAsPaidUser', () => {
  // Similar to loginAsSigner but with different watermark response
  cy.intercept('GET', '/api/v1/envelopes/*/signing', {
    statusCode: 200,
    fixture: 'signingDataPaid.json'
  }).as('getSigningData');
  
  // Intercept OTP verification
  cy.intercept('POST', '/api/v1/envelopes/*/otp/send', {
    statusCode: 200,
    body: { message: 'OTP sent successfully' }
  }).as('sendOTP');
  
  cy.intercept('POST', '/api/v1/envelopes/*/otp/verify', {
    statusCode: 200,
    body: { message: 'OTP verified successfully' }
  }).as('verifyOTP');
  
  // Mock watermark check for paid tier (no watermark)
  cy.intercept('GET', '/api/v1/organizations/*/watermark-check', {
    statusCode: 200,
    body: { requiresWatermark: false }
  }).as('checkWatermark');
  
  // Set storage to mimic authenticated state
  localStorage.setItem('signerToken', 'mock-token-456');
});

// Custom command to check if signature request was properly submitted with compliance data
Cypress.Commands.add('verifyComplianceSubmission', () => {
  cy.intercept('POST', '/api/v1/envelopes/*/sign', (req) => {
    // Check if compliance data is in the request body
    expect(req.body).to.have.property('complianceGiven', true);
    expect(req.body).to.have.property('complianceAt');
    
    req.reply({
      statusCode: 200,
      body: { message: 'Document signed successfully' }
    });
  }).as('signDocument');
});
