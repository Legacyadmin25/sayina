// API utility for Sayina
import { Signer, Field } from '@/lib/types/envelope';

// Define interfaces for API responses
interface EnvelopeSigningData {
  envelope: {
    id: string;
    name: string;
    fileUrl: string;
    orgId: string;
  };
  signer: Signer & { id: number };
  fields: Field[];
  requiresOTP: boolean;
}

interface SignedField {
  fieldId: string;
  value: any;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

// Get the JWT token from localStorage
const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

// Base API request with authentication
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // Try to get error message from response
    try {
      const errorData = await response.json();
      throw new Error(errorData.message || `API error: ${response.status}`);
    } catch (e) {
      // If we can't parse the JSON, just throw with status
      throw new Error(`API error: ${response.status}`);
    }
  }

  // Return empty object for 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return await response.json();
}

// Envelope API endpoints

// Create a new envelope with PDF upload
export async function createEnvelope(file: File): Promise<{ id: string }> {
  const formData = new FormData();
  formData.append('file', file);
  
  return apiRequest<{ id: string }>('/envelopes', {
    method: 'POST',
    body: formData,
  });
}

// Add signers to an envelope
export async function addSignersToEnvelope(
  envelopeId: string,
  signers: Signer[]
): Promise<void> {
  return apiRequest<void>(`/envelopes/${envelopeId}/signers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ signers }),
  });
}

// Add fields to an envelope
export async function addFieldsToEnvelope(
  envelopeId: string,
  fields: Field[]
): Promise<void> {
  return apiRequest<void>(`/envelopes/${envelopeId}/fields`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
}

// Send an envelope to signers
export async function sendEnvelope(envelopeId: string): Promise<void> {
  return apiRequest<void>(`/envelopes/${envelopeId}/send`, {
    method: 'POST',
  });
}

// Get envelope data (for resuming a draft)
export async function getEnvelope(envelopeId: string): Promise<any> {
  return apiRequest<any>(`/envelopes/${envelopeId}`, {
    method: 'GET',
  });
}

// Detect fields in a document using AI
export async function detectFields(file: File): Promise<Field[]> {
  const formData = new FormData();
  formData.append('file', file);
  
  return apiRequest<Field[]>('/ai/fields', {
    method: 'POST',
    body: formData,
  });
}

// Get envelope data for signing
export async function getEnvelopeForSigning(envelopeId: string): Promise<EnvelopeSigningData> {
  return apiRequest<EnvelopeSigningData>(`/envelopes/${envelopeId}/signing`, {
    method: 'GET',
  });
}

// Send OTP for verification
export async function sendOTP(envelopeId: string, signerId: number): Promise<void> {
  return apiRequest<void>(`/otp/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ envelopeId, signerId }),
  });
}

// Verify OTP code
export async function verifyOTP(envelopeId: string, signerId: number, otpCode: string): Promise<void> {
  return apiRequest<void>(`/otp/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ envelopeId, signerId, otpCode }),
  });
}

// Submit signed envelope with compliance data
export async function signEnvelope(
  envelopeId: string, 
  signerId: number, 
  fields: SignedField[],
  complianceGiven: boolean = false,
  complianceAt: string = ''
): Promise<void> {
  return apiRequest<void>(`/envelopes/${envelopeId}/sign`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      signerId, 
      fields,
      complianceGiven,
      complianceAt
    }),
  });
}

// Check if organization requires watermark (free tier)
export async function checkOrganizationRequiresWatermark(orgId: string): Promise<boolean> {
  try {
    const result = await apiRequest<{ requiresWatermark: boolean }>(`/organizations/${orgId}/watermark-check`, {
      method: 'GET',
    });
    return result.requiresWatermark;
  } catch (error) {
    console.error('Error checking watermark requirement:', error);
    // Default to showing watermark if there's an error
    return true;
  }
}
