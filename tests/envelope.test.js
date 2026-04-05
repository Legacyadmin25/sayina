/**
 * Envelope Tests
 * 
 * This file contains tests for the envelope functionality
 */

const request = require('supertest');
const app = require('../server/index');
const User = require('../server/models/User');
const Document = require('../server/models/Document');
const Envelope = require('../server/models/Envelope');
const { generateToken } = require('../server/utils/jwtHelper');
const path = require('path');
const fs = require('fs');

describe('Envelope API', () => {
  // Test user data
  const testUser = {
    email: 'test@example.com',
    password: 'Password123!',
    first_name: 'Test',
    last_name: 'User',
    phone: '+27123456789'
  };

  // Test signer data
  const testSigner = {
    email: 'signer@example.com',
    first_name: 'Test',
    last_name: 'Signer',
    phone: '+27123456780'
  };

  let userId;
  let token;
  let documentId;
  let envelopeId;

  // Create a test user, document, and get token before tests
  beforeAll(async () => {
    // Register user
    const userRes = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    userId = userRes.body.data.user.id;
    token = userRes.body.data.token;

    // Create a temporary test PDF file
    const testFilePath = path.join(__dirname, 'test-document.pdf');
    
    // Simple PDF content for testing
    const pdfContent = '%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n3 0 obj\n<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer\n<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF';
    
    fs.writeFileSync(testFilePath, pdfContent);

    // Upload document
    const docRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('document', testFilePath)
      .field('name', 'Test Document')
      .field('description', 'A test document');

    // Clean up test file
    fs.unlinkSync(testFilePath);

    documentId = docRes.body.data.document.id;
  });

  describe('POST /api/v1/envelopes', () => {
    it('should create an envelope', async () => {
      const res = await request(app)
        .post('/api/v1/envelopes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Envelope',
          message: 'Please sign this document',
          document_ids: [documentId],
          signers: [
            {
              email: testSigner.email,
              first_name: testSigner.first_name,
              last_name: testSigner.last_name,
              phone: testSigner.phone,
              role: 'signer'
            }
          ]
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('envelope');
      expect(res.body.data.envelope).toHaveProperty('name', 'Test Envelope');
      expect(res.body.data.envelope).toHaveProperty('status', 'draft');

      // Save envelope ID for later tests
      envelopeId = res.body.data.envelope.id;
    });

    it('should not create an envelope without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/envelopes')
        .send({
          name: 'Test Envelope',
          message: 'Please sign this document',
          document_ids: [documentId],
          signers: [
            {
              email: testSigner.email,
              first_name: testSigner.first_name,
              last_name: testSigner.last_name,
              role: 'signer'
            }
          ]
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not create an envelope without required fields', async () => {
      const res = await request(app)
        .post('/api/v1/envelopes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Envelope',
          message: 'Please sign this document'
          // Missing document_ids and signers
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/envelopes', () => {
    it('should get all user envelopes', async () => {
      const res = await request(app)
        .get('/api/v1/envelopes')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('count');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should not get envelopes without authentication', async () => {
      const res = await request(app)
        .get('/api/v1/envelopes');

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/envelopes/:id', () => {
    it('should get an envelope by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/envelopes/${envelopeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('envelope');
      expect(res.body.data.envelope).toHaveProperty('id', envelopeId);
    });

    it('should not get an envelope with invalid ID', async () => {
      const res = await request(app)
        .get('/api/v1/envelopes/invalid-id')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not get an envelope without authentication', async () => {
      const res = await request(app)
        .get(`/api/v1/envelopes/${envelopeId}`);

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/v1/envelopes/:id', () => {
    it('should update an envelope', async () => {
      const res = await request(app)
        .put(`/api/v1/envelopes/${envelopeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Envelope Name',
          message: 'Updated message'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('envelope');
      expect(res.body.data.envelope).toHaveProperty('name', 'Updated Envelope Name');
      expect(res.body.data.envelope).toHaveProperty('message', 'Updated message');
    });

    it('should not update an envelope with invalid ID', async () => {
      const res = await request(app)
        .put('/api/v1/envelopes/invalid-id')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Envelope Name'
        });

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not update an envelope without authentication', async () => {
      const res = await request(app)
        .put(`/api/v1/envelopes/${envelopeId}`)
        .send({
          name: 'Updated Envelope Name'
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/v1/envelopes/:id/send', () => {
    it('should send an envelope', async () => {
      const res = await request(app)
        .post(`/api/v1/envelopes/${envelopeId}/send`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('envelope');
      expect(res.body.data.envelope).toHaveProperty('status', 'sent');
    });

    it('should not send an envelope with invalid ID', async () => {
      const res = await request(app)
        .post('/api/v1/envelopes/invalid-id/send')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not send an envelope without authentication', async () => {
      const res = await request(app)
        .post(`/api/v1/envelopes/${envelopeId}/send`);

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/v1/envelopes/:id', () => {
    it('should delete an envelope', async () => {
      const res = await request(app)
        .delete(`/api/v1/envelopes/${envelopeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');
    });

    it('should not delete an envelope with invalid ID', async () => {
      const res = await request(app)
        .delete('/api/v1/envelopes/invalid-id')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not delete an envelope without authentication', async () => {
      const res = await request(app)
        .delete(`/api/v1/envelopes/${envelopeId}`);

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });
});
