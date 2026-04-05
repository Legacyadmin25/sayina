// Visual regression tests for compliance components
describe('Compliance UI Visual Regression', () => {
  beforeEach(() => {
    // Load the signing fixtures
    cy.fixture('signingData').then((data) => {
      cy.intercept('GET', `/api/v1/envelopes/${data.envelopeId}`, {
        statusCode: 200,
        body: data
      }).as('getEnvelope');
      
      // Mock the watermark requirement check for free tier
      cy.intercept('GET', `/api/v1/organizations/${data.organization.id}/watermark-required`, {
        statusCode: 200,
        body: { required: true }
      }).as('checkWatermark');
    });
    
    // Login as a signer
    cy.loginAsSigner();
  });
  
  it('should display compliance consent component with consistent styling', () => {
    cy.fixture('signingData').then((data) => {
      // Visit the signing page
      cy.visit(`/sign/${data.envelopeId}`);
      cy.wait('@getEnvelope');
      cy.wait('@checkWatermark');
      
      // Wait for the signing page to load completely
      cy.get('[data-cy="signing-page"]').should('be.visible');
      cy.get('[data-cy="compliance-consent"]').should('be.visible');
      
      // Take screenshot of the compliance consent component
      cy.get('[data-cy="compliance-consent"]')
        .matchImageSnapshot('compliance-consent-component');
        
      // Ensure the consent checkbox is visible and properly styled
      cy.get('[data-cy="compliance-checkbox"]')
        .should('be.visible')
        .matchImageSnapshot('compliance-checkbox');
        
      // Check the compliance legal text rendering
      cy.get('[data-cy="compliance-legal-text"]')
        .should('be.visible')
        .matchImageSnapshot('compliance-legal-text');
    });
  });
  
  it('should display watermark with consistent styling for free tier', () => {
    cy.fixture('signingData').then((data) => {
      // Visit the signing page
      cy.visit(`/sign/${data.envelopeId}`);
      cy.wait('@getEnvelope');
      cy.wait('@checkWatermark');
      
      // Wait for the signing page to load completely
      cy.get('[data-cy="signing-page"]').should('be.visible');
      
      // Check consent to proceed to signing
      cy.get('[data-cy="compliance-checkbox"]').check();
      cy.get('[data-cy="compliance-continue-button"]').click();
      
      // Verify watermark appears and take screenshot
      cy.get('[data-cy="document-watermark"]')
        .should('be.visible')
        .matchImageSnapshot('free-tier-watermark');
        
      // Check watermark positioning and opacity
      cy.get('[data-cy="document-watermark"]')
        .should('have.css', 'opacity', '0.4')
        .matchImageSnapshot('watermark-styling');
    });
  });
  
  it('should NOT display watermark for paid tier', () => {
    // Load the paid tier signing fixture
    cy.fixture('signingDataPaid').then((data) => {
      cy.intercept('GET', `/api/v1/envelopes/${data.envelopeId}`, {
        statusCode: 200,
        body: data
      }).as('getEnvelopePaid');
      
      // Mock the watermark requirement check for paid tier
      cy.intercept('GET', `/api/v1/organizations/${data.organization.id}/watermark-required`, {
        statusCode: 200,
        body: { required: false }
      }).as('checkWatermarkPaid');
      
      // Visit the signing page
      cy.visit(`/sign/${data.envelopeId}`);
      cy.wait('@getEnvelopePaid');
      cy.wait('@checkWatermarkPaid');
      
      // Wait for the signing page to load completely
      cy.get('[data-cy="signing-page"]').should('be.visible');
      
      // Check consent to proceed to signing
      cy.get('[data-cy="compliance-checkbox"]').check();
      cy.get('[data-cy="compliance-continue-button"]').click();
      
      // Verify no watermark appears
      cy.get('[data-cy="document-watermark"]').should('not.exist');
      
      // Take screenshot of document without watermark
      cy.get('[data-cy="document-container"]')
        .matchImageSnapshot('paid-tier-no-watermark');
    });
  });
  
  it('should display compliance completion screen with consistent styling', () => {
    cy.fixture('signingData').then((data) => {
      // Setup mocks for successful signing
      cy.intercept('POST', `/api/v1/envelopes/${data.envelopeId}/sign`, {
        statusCode: 200,
        body: { success: true }
      }).as('signEnvelope');
      
      // Visit the signing page
      cy.visit(`/sign/${data.envelopeId}`);
      cy.wait('@getEnvelope');
      cy.wait('@checkWatermark');
      
      // Complete the signing process
      cy.get('[data-cy="compliance-checkbox"]').check();
      cy.get('[data-cy="compliance-continue-button"]').click();
      cy.get('[data-cy="sign-button"]').click();
      cy.wait('@signEnvelope');
      
      // Verify the completion screen
      cy.get('[data-cy="signing-complete"]').should('be.visible');
      cy.get('[data-cy="compliance-confirmation"]').should('be.visible');
      
      // Take screenshot of the completion screen with compliance confirmation
      cy.get('[data-cy="compliance-confirmation"]')
        .matchImageSnapshot('compliance-confirmation');
    });
  });
});
