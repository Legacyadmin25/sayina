const smtpTester = require('smtp-tester');
const fetch = require('node-fetch');
const { db } = require('../config/db');
const { generateAuthToken } = require('../utils/authHelper');

// Mock data for testing
const testUser = {
  id: 'test-user-id',
  email: 'compliance-test@example.com',
  name: 'John Doe',
  role: 'admin',
  org_id: 'test-org-id'
};

const testSigner = {
  id: 'test-signer-id',
  email: 'signer@example.com',
  name: 'Test Signer',
  org_id: testUser.org_id
};

const testEnvelope = {
  id: 'email-test-env-12345',
  name: 'Test Compliance Email Document',
  status: 'completed',
  org_id: testUser.org_id
};

const API_URL = process.env.TEST_API_URL || 'http://localhost:5000/api/v1';
let token;
let mailServer;

// Setup before all tests
beforeAll(async () => {
  // Start SMTP test server
  mailServer = smtpTester.init(1025); // listen on port 1025
  
  // Set environment variable for test SMTP server
  process.env.SMTP_HOST = 'localhost';
  process.env.SMTP_PORT = '1025';
  process.env.SMTP_SECURE = 'false';
  
  // Generate auth token for API requests
  token = generateAuthToken(testUser);
  
  // Ensure test user, signer and envelope exist in database
  await db('users')
    .insert(testUser)
    .onConflict('id')
    .merge();
    
  await db('signers')
    .insert(testSigner)
    .onConflict('id')
    .merge();
    
  await db('envelopes')
    .insert(testEnvelope)
    .onConflict('id')
    .merge();
  
  // Create test signature event with compliance data
  await db('signature_events').insert({
    envelope_id: testEnvelope.id,
    signer_id: testSigner.id,
    field_id: 'test-field-id',
    value: 'test-signature',
    compliance_given: true,
    compliance_given_at: new Date().toISOString(),
    ip_address: '192.168.1.1'
  });
});

// Cleanup after all tests
afterAll(async () => {
  // Stop SMTP test server
  if (mailServer) {
    mailServer.stop();
  }
  
  // Clean up test data
  await db('signature_events').where('envelope_id', testEnvelope.id).delete();
  await db('envelopes').where('id', testEnvelope.id).delete();
  await db('signers').where('id', testSigner.id).delete();
  await db('users').where('id', testUser.id).delete();
  await db.destroy();
});

describe('Compliance Confirmation Email', () => {
  it('sends an email with compliance summary to document owner after signing', async () => {
    // Create promise for email receipt
    const emailPromise = new Promise((resolve) => {
      mailServer.bind(testUser.email, (addr, id, email) => {
        resolve(email);
      });
    });

    // Trigger post-sign email confirmation
    const res = await fetch(`${API_URL}/envelopes/${testEnvelope.id}/send-confirmation`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipientType: 'owner'
      })
    });
    
    expect(res.status).toBe(200);
    
    // Wait for email and verify content
    const email = await emailPromise;
    expect(email.headers.subject).toContain('Document Signed: Test Compliance Email Document');
    expect(email.body).toMatch(/South African ECT Act 25\/2002/);
    expect(email.body).toMatch(/POPIA consent/);
    expect(email.body).toMatch(/Test Signer/);
    expect(email.body).toMatch(/compliance verification/i);
  });

  it('sends an email with compliance summary to signer after signing', async () => {
    // Create promise for email receipt
    const emailPromise = new Promise((resolve) => {
      mailServer.bind(testSigner.email, (addr, id, email) => {
        resolve(email);
      });
    });

    // Trigger post-sign email confirmation
    const res = await fetch(`${API_URL}/envelopes/${testEnvelope.id}/send-confirmation`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipientType: 'signer',
        signerId: testSigner.id
      })
    });
    
    expect(res.status).toBe(200);
    
    // Wait for email and verify content
    const email = await emailPromise;
    expect(email.headers.subject).toContain('Your Signed Document');
    expect(email.body).toMatch(/Thank you for signing/);
    expect(email.body).toMatch(/South African ECT Act 25\/2002/);
    expect(email.body).toMatch(/POPIA regulations/);
    expect(email.body).toMatch(/compliance consent/i);
    
    // Should include timestamp of signing
    expect(email.body).toMatch(/signed on/i);
  });
  
  it('includes compliance audit link in owner emails', async () => {
    // Create promise for email receipt
    const emailPromise = new Promise((resolve) => {
      mailServer.bind(testUser.email, (addr, id, email) => {
        resolve(email);
      });
    });

    // Trigger post-sign email confirmation with audit request
    const res = await fetch(`${API_URL}/envelopes/${testEnvelope.id}/send-confirmation`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipientType: 'owner',
        includeAudit: true
      })
    });
    
    expect(res.status).toBe(200);
    
    // Wait for email and verify audit link
    const email = await emailPromise;
    expect(email.body).toMatch(/compliance audit/i);
    expect(email.body).toMatch(/view audit trail/i);
    expect(email.body).toMatch(/\/audit\/compliance\//);
  });
});
