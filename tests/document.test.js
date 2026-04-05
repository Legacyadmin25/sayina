/**
 * Document Tests
 * 
 * This file contains tests for the document management functionality
 */

const request = require('supertest');
const app = require('../server/index');
const User = require('../server/models/User');
const Document = require('../server/models/Document');
const { generateToken } = require('../server/utils/jwtHelper');
const path = require('path');
const fs = require('fs');

describe('Document API', () => {
  // Test user data
  const testUser = {
    email: 'test@example.com',
    password: 'Password123!',
    first_name: 'Test',
    last_name: 'User',
    phone: '+27123456789'
  };

  let userId;
  let token;
  let documentId;

  // Create a test user and get token before tests
  beforeAll(async () => {
    // Register user
    const userRes = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    userId = userRes.body.data.user.id;
    token = userRes.body.data.token;
  });

  describe('POST /api/v1/documents/upload', () => {
    it('should upload a document', async () => {
      // Create a temporary test PDF file
      const testFilePath = path.join(__dirname, 'test-document.pdf');
      
      // Simple PDF content for testing
      const pdfContent = '%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n3 0 obj\n<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer\n<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF';
      
      fs.writeFileSync(testFilePath, pdfContent);

      const res = await request(app)
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${token}`)
        .attach('document', testFilePath)
        .field('name', 'Test Document')
        .field('description', 'A test document');

      // Clean up test file
      fs.unlinkSync(testFilePath);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('document');
      expect(res.body.data.document).toHaveProperty('name', 'Test Document');

      // Save document ID for later tests
      documentId = res.body.data.document.id;
    });

    it('should not upload a document without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/documents/upload')
        .field('name', 'Test Document')
        .field('description', 'A test document');

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not upload a document without required fields', async () => {
      const res = await request(app)
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${token}`)
        .field('description', 'A test document');

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/documents', () => {
    it('should get all user documents', async () => {
      const res = await request(app)
        .get('/api/v1/documents')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('count');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should not get documents without authentication', async () => {
      const res = await request(app)
        .get('/api/v1/documents');

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/v1/documents/:id', () => {
    it('should get a document by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${documentId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('document');
      expect(res.body.data.document).toHaveProperty('id', documentId);
    });

    it('should not get a document with invalid ID', async () => {
      const res = await request(app)
        .get('/api/v1/documents/invalid-id')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not get a document without authentication', async () => {
      const res = await request(app)
        .get(`/api/v1/documents/${documentId}`);

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/v1/documents/:id', () => {
    it('should update a document', async () => {
      const res = await request(app)
        .put(`/api/v1/documents/${documentId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Document Name',
          description: 'Updated description'
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('document');
      expect(res.body.data.document).toHaveProperty('name', 'Updated Document Name');
      expect(res.body.data.document).toHaveProperty('description', 'Updated description');
    });

    it('should not update a document with invalid ID', async () => {
      const res = await request(app)
        .put('/api/v1/documents/invalid-id')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Updated Document Name'
        });

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not update a document without authentication', async () => {
      const res = await request(app)
        .put(`/api/v1/documents/${documentId}`)
        .send({
          name: 'Updated Document Name'
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/v1/documents/:id', () => {
    it('should delete a document', async () => {
      const res = await request(app)
        .delete(`/api/v1/documents/${documentId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');
    });

    it('should not delete a document with invalid ID', async () => {
      const res = await request(app)
        .delete('/api/v1/documents/invalid-id')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('success', false);
    });

    it('should not delete a document without authentication', async () => {
      const res = await request(app)
        .delete(`/api/v1/documents/${documentId}`);

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('success', false);
    });
  });
});
