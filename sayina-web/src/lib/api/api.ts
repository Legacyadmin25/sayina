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
    let message = `API error: ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.message) message = errorData.message;
    } catch (_) {
      // keep default message if JSON can't be parsed
    }
    throw new Error(message);
  }

  // Return empty object for 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return await response.json();
}

// Envelope API endpoints

/**
 * One-shot wizard: uploads file, adds signers & fields, sends envelope.
 * Replaces the old 4-call chain (createEnvelope → addSigners → addFields → sendEnvelope).
 */
export async function submitWizard(
  file: File,
  signers: Signer[],
  fields: Field[]
): Promise<{ envelopeId: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('signers', JSON.stringify(signers));
  formData.append('fields', JSON.stringify(fields));

  const response = await apiRequest<{ success: boolean; data: { envelopeId: string } }>(
    '/envelopes/wizard',
    { method: 'POST', body: formData }
  );
  return response.data;
}

// Create a new envelope with PDF upload (legacy – kept for backwards compat)
export async function createEnvelope(file: File): Promise<{ id: string }> {
  const formData = new FormData();
  formData.append('file', file);

  return apiRequest<{ id: string }>('/envelopes', {
    method: 'POST',
    body: formData,
  });
}

// Add signers to an envelope (legacy)
export async function addSignersToEnvelope(
  envelopeId: string,
  signers: Signer[]
): Promise<Array<{ id: string; order: number }>> {
  const res = await apiRequest<{
    success: boolean;
    data: { signers: Array<{ id: string; order: number }> };
  }>(`/envelopes/${envelopeId}/signers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signers }),
  });
  return res.data.signers;
}

// Add fields to an envelope (legacy)
export async function addFieldsToEnvelope(
  envelopeId: string,
  fields: Field[]
): Promise<void> {
  return apiRequest<void>(`/envelopes/${envelopeId}/fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
}

// Send an envelope to signers (legacy)
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

// Template API endpoints

export interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  file_name: string;
  file_size: number;
  file_type: string;
  is_public: boolean;
  is_owner: boolean;
  created_at: string;
  created_by: { id: string; name: string; email: string } | null;
}

export async function getTemplates(): Promise<Template[]> {
  const res = await apiRequest<{ data: Template[] }>('/templates', { method: 'GET' });
  return res.data;
}

export async function createTemplate(file: File, name: string, description?: string): Promise<Template> {
  const formData = new FormData();
  formData.append('template', file);
  formData.append('name', name);
  if (description) formData.append('description', description);
  const res = await apiRequest<{ data: Template }>('/templates', { method: 'POST', body: formData });
  return res.data;
}

export async function deleteTemplate(templateId: string): Promise<void> {
  return apiRequest<void>(`/templates/${templateId}`, { method: 'DELETE' });
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
