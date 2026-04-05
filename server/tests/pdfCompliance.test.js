const fetch = require('node-fetch');
const pdfParse = require('pdf-parse');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');
const { db } = require('../config/db');
const { generateAuthToken } = require('../utils/authHelper');

// Mock data for testing
const testUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'admin',
  org_id: 'test-org-id'
};

const testEnvelope = {
  id: '12345678-1234-1234-1234-123456789abc',
  name: 'Test Compliance Document',
  status: 'completed',
  org_id: testUser.org_id
};

const API_URL = process.env.TEST_API_URL || 'http://localhost:5000/api/v1';
let token;

// Setup before tests
beforeAll(async () => {
  // Generate auth token for API requests
  token = generateAuthToken(testUser);
  
  // Ensure test envelope exists in database
  await db('envelopes')
    .insert(testEnvelope)
    .onConflict('id')
    .merge();
  
  // Create test signature event with compliance data
  await db('signature_events').insert({
    envelope_id: testEnvelope.id,
    signer_id: 1,
    field_id: 'test-field-id',
    value: 'test-signature',
    compliance_given: true,
    compliance_given_at: new Date().toISOString(),
    ip_address: '192.168.1.1'
  });
});

// Cleanup after tests
afterAll(async () => {
  await db('signature_events').where('envelope_id', testEnvelope.id).delete();
  await db('envelopes').where('id', testEnvelope.id).delete();
  await db.destroy();
});

describe('PDF Compliance Embedding', () => {
  it('should include compliance consent details in PDF text', async () => {
    const res = await fetch(`${API_URL}/envelopes/${testEnvelope.id}/download`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Verify successful response
    expect(res.status).toBe(200);
    
    const buffer = await res.buffer();
    const data = await pdfParse(buffer);

    // The PDF text should contain the compliance timestamp and signer information
    expect(data.text).toMatch(/Compliance consent given at:/);
    expect(data.text).toMatch(/South African ECT Act 25\/2002/);
    expect(data.text).toMatch(/POPIA regulations/);
    
    // Should include IP address (sanitized to first 2 octets for privacy)
    expect(data.text).toMatch(/IP: 192.168/);
  });

  it('should have compliance metadata in PDF info', async () => {
    const res = await fetch(`${API_URL}/envelopes/${testEnvelope.id}/download`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    expect(res.status).toBe(200);
    
    const buffer = await res.buffer();
    const pdfDoc = await PDFDocument.load(buffer);
    
    // Check custom metadata for compliance information
    const metadata = pdfDoc.getKeywords() || '';
    expect(metadata).toContain('compliance_verified');
    
    const title = pdfDoc.getTitle() || '';
    expect(title).toContain('Sayina Compliance Verified');
  });
  
  it('should validate that PDF has not been modified since signing', async () => {
    const res = await fetch(`${API_URL}/envelopes/${testEnvelope.id}/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    expect(res.status).toBe(200);
    
    const verificationResult = await res.json();
    expect(verificationResult.valid).toBe(true);
    expect(verificationResult.compliance.verified).toBe(true);
    expect(verificationResult.compliance.timestamp).toBeTruthy();
  });
});
