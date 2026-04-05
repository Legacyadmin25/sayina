import http from 'k6/http';
import { sleep, check } from 'k6';

// Configuration
export const options = {
  // Simulate ramp-up of traffic from 1 to 50 users over 5 minutes
  stages: [
    { duration: '1m', target: 10 }, // Ramp-up to 10 users
    { duration: '2m', target: 30 }, // Ramp-up to 30 users
    { duration: '1m', target: 50 }, // Ramp-up to 50 users
    { duration: '3m', target: 50 }, // Stay at 50 users for 3 minutes
    { duration: '1m', target: 0 },  // Ramp-down to 0 users
  ],
  // Thresholds
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% of requests can fail
  },
};

// Mock authentication
const getToken = () => {
  const payload = JSON.stringify({
    email: 'loadtest@example.com',
    password: 'LoadTest123!',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const res = http.post('http://localhost:5000/api/v1/auth/login', payload, params);
  return JSON.parse(res.body).token;
};

// Test execution
export default function() {
  const token = getToken();
  const baseUrl = 'http://localhost:5000/api/v1';
  
  // Common headers with auth token
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Test 1: Check watermark requirement (high volume endpoint)
  const orgId = 'test-org-id';
  const watermarkCheck = http.get(
    `${baseUrl}/organizations/${orgId}/watermark-required`, 
    { headers }
  );
  
  check(watermarkCheck, {
    'watermark check status is 200': (r) => r.status === 200,
    'watermark check response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  // Test 2: Submit compliance consent and sign document
  const envelopeId = 'test-envelope-id';
  const signerId = 'test-signer-id';
  
  const signPayload = JSON.stringify({
    signerId: signerId,
    fields: [
      {
        fieldId: 'test-field-id',
        value: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
      }
    ],
    complianceGiven: true,
    complianceAt: new Date().toISOString()
  });
  
  const signResponse = http.post(
    `${baseUrl}/envelopes/${envelopeId}/sign`,
    signPayload,
    { headers }
  );
  
  check(signResponse, {
    'sign with compliance status is 200': (r) => r.status === 200,
    'sign with compliance response time < 500ms': (r) => r.timings.duration < 500,
    'sign response has success field': (r) => JSON.parse(r.body).success === true,
  });
  
  // Test 3: Verify document compliance (post-signing verification)
  const verifyResponse = http.get(
    `${baseUrl}/envelopes/${envelopeId}/verify`, 
    { headers }
  );
  
  check(verifyResponse, {
    'verify compliance status is 200': (r) => r.status === 200,
    'verify compliance response time < 300ms': (r) => r.timings.duration < 300,
    'verify response indicates valid compliance': (r) => JSON.parse(r.body).compliance.verified === true,
  });
  
  // Short pause between iterations
  sleep(1);
}
