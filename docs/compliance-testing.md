# Compliance Testing Documentation

This document outlines the testing approach for the compliance features in the Sayina E-Signature Service.

## Overview

The compliance features ensure that users provide explicit consent before signing documents, in accordance with South African regulations (ECT Act 25/2002 and POPIA). We have implemented a comprehensive testing strategy to verify that these features work correctly.

## Testing Approach

### 1. Backend Unit Tests

Located in `server/tests/compliance.test.js`, these tests verify:

- **Signing without consent**: Attempts to sign a document without providing compliance consent should be rejected with a 400 status code.
- **Signing with consent**: Signing with valid compliance consent should succeed and create appropriate audit records.
- **Watermark requirements**: Verifies that free-tier organizations require watermarks while paid organizations do not.

To run the backend tests:

```bash
cd server
npm test
```

### 2. Frontend E2E Tests (Cypress)

Located in `cypress/e2e/signing-compliance.spec.js`, these tests verify:

- **Compliance consent flow**: Users must check the consent checkbox before proceeding.
- **Watermark behavior**: Free-tier organizations show watermarks, paid organizations do not.
- **OTP verification**: After compliance consent, users with OTP requirements must verify their identity.
- **Error handling**: Gracefully handles network failures during consent submission and expired temporary keys.

To run the Cypress tests:

```bash
npm run cypress:open
# or for headless testing
npm run cypress:run
```

### 3. Manual QA Checklist

- **Consent Flow**
  - [ ] Try signing without checking the box → blocked
  - [ ] Check the box → allowed to proceed

- **Audit Logs**
  - [ ] Confirm compliance_given_at appears in audit exports
  - [ ] Verify IP address and timestamp are recorded

- **Watermark Behavior**
  - [ ] Free plan envelopes show watermark on every page
  - [ ] Paid plans do not show watermarks

- **Edge Cases**
  - [ ] Expired temporary key → signing blocked even with consent
  - [ ] Network failure during consent step → recover gracefully
  - [ ] Mobile device rendering → consent UI adapts correctly

## Debugging Failed Tests

If a test fails, check the following common issues:

1. **Missing data-cy attributes**: Ensure all components have appropriate data-cy attributes.
2. **API mocking issues**: Verify that API mocks in Cypress return expected data structures.
3. **Database setup**: Backend tests rely on proper test data setup.

## Enhancing Test Coverage

Future test enhancements:

1. **PDF-Stamped Consent Testing**: Verify that consent information is embedded in signed PDFs.
2. **Email Confirmation Testing**: Ensure confirmation emails include compliance information.
3. **Compliance Reporting Tests**: Validate the compliance reporting functionality.
4. **Mobile Rendering Tests**: Add explicit tests for mobile viewport sizes.

## Compliance Legal Requirements

Our tests verify adherence to the following legal requirements:

- **ECT Act 25/2002**: Ensures electronic signatures are legally binding with proper consent.
- **POPIA**: Validates protection of personal information through proper consent and record-keeping.

## Continuous Integration

All tests run automatically in our CI/CD pipeline upon each commit and pull request to the main and develop branches. Test failure will block deployment to staging and production environments.
