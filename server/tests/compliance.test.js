const request = require('supertest');
const app = require('../index');
const { db } = require('../config/db');
const { generateTempKey } = require('../utils/tempKeyHelper');

// Mock data
const testEnvelope = {
  id: '12345678-1234-1234-1234-123456789abc',
  name: 'Test Envelope',
  status: 'sent',
  org_id: '98765432-9876-9876-9876-987654321def'
};

const testSigner = {
  id: 1,
  envelope_id: testEnvelope.id,
  email: 'testsigner@example.com',
  first_name: 'Test',
  last_name: 'Signer',
  status: 'sent'
};

const testField = {
  id: '11111111-1111-1111-1111-111111111111',
  envelope_id: testEnvelope.id,
  signer_id: testSigner.id,
  type: 'signature',
  page: 1,
  x: 100,
  y: 100,
  width: 150,
  height: 50,
  required: true
};

const testOrgs = [
  {
    id: '98765432-9876-9876-9876-987654321def',
    name: 'Free Tier Org',
    subscription: {
      plan_id: 'free',
      remove_watermark: false
    }
  },
  {
    id: 'abcdefgh-abcd-abcd-abcd-abcdefghijkl',
    name: 'Paid Tier Org',
    subscription: {
      plan_id: 'business',
      remove_watermark: true
    }
  }
];

// Setup before tests
beforeAll(async () => {
  // Insert test data
  await db('organizations').insert(testOrgs.map(org => ({ id: org.id, name: org.name })));
  
  await db('plans').insert([
    { id: 'free', name: 'Free', remove_watermark: false },
    { id: 'business', name: 'Business', remove_watermark: true }
  ]);
  
  await db('subscriptions').insert([
    { 
      org_id: testOrgs[0].id, 
      plan_id: 'free', 
      status: 'active',
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    { 
      org_id: testOrgs[1].id, 
      plan_id: 'business', 
      status: 'active',
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  ]);
  
  await db('envelopes').insert(testEnvelope);
  await db('signers').insert(testSigner);
  await db('fields').insert(testField);
});

// Cleanup after tests
afterAll(async () => {
  await db('signature_events').where('field_id', testField.id).delete();
  await db('fields').where('id', testField.id).delete();
  await db('signers').where('id', testSigner.id).delete();
  await db('envelopes').where('id', testEnvelope.id).delete();
  await db('subscriptions').where('org_id', testOrgs[0].id).delete();
  await db('subscriptions').where('org_id', testOrgs[1].id).delete();
  await db('organizations').where('id', testOrgs[0].id).delete();
  await db('organizations').where('id', testOrgs[1].id).delete();
  await db('plans').where('id', 'free').delete();
  await db('plans').where('id', 'business').delete();
  await db('audit_trail').where('resource_id', testEnvelope.id).delete();
  await db.destroy();
});

describe('Compliance API Tests', () => {
  let tempKey;

  beforeEach(async () => {
    // Generate a temporary API key for the test signer
    tempKey = await generateTempKey(testSigner.id, testEnvelope.id);
  });

  describe('1. Signing Compliance Tests', () => {
    test('Should reject signing without compliance consent', async () => {
      const response = await request(app)
        .post(`/api/v1/envelopes/${testEnvelope.id}/sign`)
        .set('X-API-Key', tempKey)
        .send({
          signerId: testSigner.id,
          fields: [
            {
              fieldId: testField.id,
              value: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAA'
            }
          ],
          complianceGiven: false,
          complianceAt: new Date().toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Compliance consent is required');
    });

    test('Should accept signing with compliance consent', async () => {
      const complianceTimestamp = new Date().toISOString();
      
      const response = await request(app)
        .post(`/api/v1/envelopes/${testEnvelope.id}/sign`)
        .set('X-API-Key', tempKey)
        .send({
          signerId: testSigner.id,
          fields: [
            {
              fieldId: testField.id,
              value: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAA'
            }
          ],
          complianceGiven: true,
          complianceAt: complianceTimestamp
        });

      expect(response.status).toBe(200);
      
      // Verify audit trail entry was created with compliance info
      const auditEntry = await db('audit_trail')
        .where({
          resource_id: testEnvelope.id,
          action: 'SIGNATURE_SUBMITTED'
        })
        .orderBy('created_at', 'desc')
        .first();
      
      expect(auditEntry).toBeTruthy();
      expect(JSON.parse(auditEntry.details)).toHaveProperty('complianceGiven', true);
      expect(JSON.parse(auditEntry.details)).toHaveProperty('complianceAt');
      
      // Verify signature event was created with compliance info
      const signatureEvent = await db('signature_events')
        .where({
          field_id: testField.id
        })
        .orderBy('created_at', 'desc')
        .first();
      
      expect(signatureEvent).toBeTruthy();
      expect(signatureEvent.compliance_given).toBe(true);
      expect(signatureEvent.compliance_given_at).toBeTruthy();
    });
  });

  describe('2. Watermark Requirement Tests', () => {
    test('Should require watermark for free tier organization', async () => {
      const response = await request(app)
        .get(`/api/v1/organizations/${testOrgs[0].id}/watermark-check`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('requiresWatermark', true);
    });

    test('Should not require watermark for paid tier organization', async () => {
      const response = await request(app)
        .get(`/api/v1/organizations/${testOrgs[1].id}/watermark-check`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('requiresWatermark', false);
    });

    test('Should return 404 for non-existent organization', async () => {
      const response = await request(app)
        .get('/api/v1/organizations/00000000-0000-0000-0000-000000000000/watermark-check');
      
      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Organization not found');
    });
  });
});
