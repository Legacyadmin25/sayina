/// <reference types="cypress" />

describe('Signing Workflow Compliance', () => {
  beforeEach(() => {
    cy.loginAsSigner();
    cy.visit('/sign/12345');
    // Wait for the signing page to load
    cy.wait('@getSigningData');
    cy.wait('@checkWatermark');
  });

  it('blocks signing until compliance consent is given', () => {
    // The compliance consent screen should be visible first
    cy.get('[data-cy=compliance-consent]').should('be.visible');
    
    // Continue button should be disabled initially
    cy.get('[data-cy=compliance-continue]').should('be.disabled');
    
    // Check the consent checkbox
    cy.get('[data-cy=compliance-checkbox]').click();
    
    // Continue button should now be enabled
    cy.get('[data-cy=compliance-continue]').should('not.be.disabled');
    
    // Click continue
    cy.get('[data-cy=compliance-continue]').click();
    
    // Intercept and validate the compliance data when signing
    cy.verifyComplianceSubmission();
    
    // PDF Viewer should now be visible
    cy.get('[data-cy=field-interactor]').should('be.visible');
  });

  it('applies watermark for free-tier orgs', () => {
    // Complete the compliance step
    cy.get('[data-cy=compliance-checkbox]').click();
    cy.get('[data-cy=compliance-continue]').click();
    
    // For free tier, watermark should be visible
    cy.get('[data-cy=watermark]').should('exist').and('be.visible');
    
    // Verify text content of watermark
    cy.get('[data-cy=watermark]').should('contain.text', 'Sayina E-Signature');
  });

  it('shows OTP verification after compliance consent if required', () => {
    // Complete the compliance step
    cy.get('[data-cy=compliance-checkbox]').click();
    cy.get('[data-cy=compliance-continue]').click();
    
    // Since our fixture has requiresOTP: true, the OTP modal should appear
    cy.get('[data-cy=otp-modal]').should('be.visible');
    
    // Click send OTP button
    cy.get('[data-cy=send-otp-button]').click();
    cy.wait('@sendOTP');
    
    // Enter OTP code
    cy.get('[data-cy=otp-input]').type('123456');
    
    // Verify OTP
    cy.get('[data-cy=verify-otp-button]').click();
    cy.wait('@verifyOTP');
    
    // After OTP verification, the signing interface should be available
    cy.get('[data-cy=field-interactor]').should('be.visible');
  });
});

describe('Paid Tier Compliance Tests', () => {
  beforeEach(() => {
    cy.loginAsPaidUser();
    cy.visit('/sign/12345');
    // Wait for the signing page to load
    cy.wait('@getSigningData');
    cy.wait('@checkWatermark');
  });
  
  it('does not show watermark for paid orgs', () => {
    // Complete the compliance step
    cy.get('[data-cy=compliance-checkbox]').click();
    cy.get('[data-cy=compliance-continue]').click();
    
    // For paid tier, watermark should not be visible
    cy.get('[data-cy=watermark]').should('not.exist');
  });
});

describe('Edge Cases and Error Handling', () => {
  beforeEach(() => {
    cy.loginAsSigner();
  });
  
  it('gracefully handles network failure during compliance submission', () => {
    cy.visit('/sign/12345');
    
    // Wait for the signing page to load
    cy.wait('@getSigningData');
    
    // Intercept compliance submission and make it fail
    cy.intercept('POST', '/api/v1/envelopes/*/sign', {
      statusCode: 500,
      body: { 
        message: 'Network error occurred' 
      }
    }).as('failedSubmission');
    
    // Check the consent checkbox and continue
    cy.get('[data-cy=compliance-checkbox]').click();
    cy.get('[data-cy=compliance-continue]').click();
    
    // If OTP is required, complete that step
    cy.get('[data-cy=otp-modal]', { timeout: 5000 }).then($modal => {
      if ($modal.length) {
        cy.get('[data-cy=send-otp-button]').click();
        cy.wait('@sendOTP');
        cy.get('[data-cy=otp-input]').type('123456');
        cy.get('[data-cy=verify-otp-button]').click();
        cy.wait('@verifyOTP');
      }
    });
    
    // Try to sign the document
    cy.get('[data-cy=signature-field]').click();
    cy.get('[data-cy=submit-signature]').click();
    
    cy.wait('@failedSubmission');
    
    // Error toast should be visible
    cy.get('[data-cy=toast-error]').should('be.visible');
    cy.get('[data-cy=toast-error]').should('contain.text', 'Failed to submit');
    
    // Should allow retry
    cy.get('[data-cy=retry-button]').should('be.visible');
  });
  
  it('handles expired temporary keys gracefully', () => {
    // Intercept the signing data request with an expired key error
    cy.intercept('GET', '/api/v1/envelopes/*/signing', {
      statusCode: 401,
      body: { 
        message: 'Temporary API key has expired or is invalid' 
      }
    }).as('expiredKey');
    
    cy.visit('/sign/12345');
    
    // Wait for the request to fail
    cy.wait('@expiredKey');
    
    // Should show an error message
    cy.get('[data-cy=error-message]').should('be.visible');
    cy.get('[data-cy=error-message]').should('contain.text', 'expired or is invalid');
    
    // Should have a button to request a new link
    cy.get('[data-cy=request-new-link]').should('be.visible');
  });
});
