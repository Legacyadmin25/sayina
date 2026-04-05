import { useState } from 'react';
import { useOffline } from '../contexts/OfflineContext';
import { apiPost, apiGet, apiPut, apiDelete } from '../services/apiWithOfflineSupport';
import { useQuery, useMutation, useQueryClient } from 'react-query';

// Types for envelope operations
interface EnvelopeCreateData {
  name: string;
  message?: string;
  expiry_days?: number;
  documents?: File[];
}

interface SignerCreateData {
  name: string;
  email: string;
  phone?: string;
  role?: string;
  signing_order?: number;
  message?: string;
}

interface EnvelopeOperationResponse {
  success: boolean;
  message: string;
  offline?: boolean;
  queueId?: string;
  data?: any;
}

export const useEnvelopeOperations = () => {
  const { isOffline, refreshQueueStatus } = useOffline();
  const queryClient = useQueryClient();

  // Create new envelope (works offline)
  const createEnvelopeMutation = useMutation<EnvelopeOperationResponse, Error, EnvelopeCreateData>(
    async (data) => {
      try {
        // For file uploads, we need to use FormData
        const formData = new FormData();
        formData.append('name', data.name);
        
        if (data.message) {
          formData.append('message', data.message);
        }
        
        if (data.expiry_days) {
          formData.append('expiry_days', data.expiry_days.toString());
        }
        
        if (data.documents && data.documents.length > 0) {
          // Append each document to the form data
          data.documents.forEach((file, index) => {
            formData.append(`documents`, file);
          });
        }

        // If offline, we can't process files directly
        if (!navigator.onLine) {
          return {
            success: true,
            message: 'Envelope creation queued for when you are online',
            offline: true,
            queueId: `offline-envelope-${Date.now()}`
          };
        }
        
        const response = await apiPost<EnvelopeOperationResponse>(
          '/api/v1/envelopes',
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          }
        );
        
        // Check if operation was queued for offline
        if (response.data.offline) {
          // Refresh queue count
          await refreshQueueStatus();
          return response.data;
        }
        
        return response.data;
      } catch (error) {
        if (!navigator.onLine) {
          // If offline and not handled by interceptor
          return {
            success: true,
            message: 'Envelope creation queued for when you are online',
            offline: true,
            queueId: `offline-envelope-${Date.now()}`
          };
        }
        throw error;
      }
    },
    {
      onSuccess: () => {
        // Invalidate relevant queries
        queryClient.invalidateQueries('envelopes');
      }
    }
  );
  
  // Add signer to envelope (works offline)
  const addSignerMutation = useMutation<EnvelopeOperationResponse, Error, { envelopeId: string, signer: SignerCreateData }>(
    async ({ envelopeId, signer }) => {
      try {
        const response = await apiPost<EnvelopeOperationResponse>(
          '/api/v1/signers',
          {
            envelope_id: envelopeId,
            name: signer.name,
            email: signer.email,
            phone: signer.phone || null,
            role: signer.role || 'signer',
            signing_order: signer.signing_order || 1,
            message: signer.message || null
          }
        );
        
        // Check if operation was queued for offline
        if (response.data.offline) {
          // Refresh queue count
          await refreshQueueStatus();
          return response.data;
        }
        
        return response.data;
      } catch (error) {
        if (!navigator.onLine) {
          return {
            success: true,
            message: 'Signer addition queued for when you are online',
            offline: true,
            queueId: `offline-signer-${Date.now()}`
          };
        }
        throw error;
      }
    },
    {
      onSuccess: (_, variables) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries(['envelope', variables.envelopeId]);
        queryClient.invalidateQueries('signers');
      }
    }
  );
  
  // Send envelope to signers (needs online connection)
  const sendEnvelopeMutation = useMutation<EnvelopeOperationResponse, Error, string>(
    async (envelopeId) => {
      if (!navigator.onLine) {
        return {
          success: false,
          message: 'Cannot send envelope while offline. Please connect to the internet and try again.',
        };
      }
      
      const response = await apiPost<EnvelopeOperationResponse>(
        `/api/v1/envelopes/${envelopeId}/send`,
        {}
      );
      
      return response.data;
    },
    {
      onSuccess: (_, envelopeId) => {
        // Invalidate relevant queries
        queryClient.invalidateQueries(['envelope', envelopeId]);
        queryClient.invalidateQueries('envelopes');
      }
    }
  );
  
  // Get envelopes with offline support
  const useEnvelopes = (options = {}) => {
    return useQuery(
      'envelopes',
      async () => {
        if (!navigator.onLine) {
          // Try to get from cache first
          try {
            const cachedData = localStorage.getItem('cached_envelopes');
            if (cachedData) {
              return JSON.parse(cachedData);
            }
          } catch (e) {
            console.error('Failed to retrieve cached envelopes', e);
          }
          
          return {
            success: true,
            message: 'Using cached envelope data while offline',
            data: {
              envelopes: []
            }
          };
        }
        
        const response = await apiGet('/api/v1/envelopes');
        
        // Cache for offline use
        try {
          localStorage.setItem('cached_envelopes', JSON.stringify(response.data));
        } catch (e) {
          console.error('Failed to cache envelopes', e);
        }
        
        return response.data;
      },
      {
        ...options,
        // Only refetch when online
        enabled: options.enabled !== false && navigator.onLine
      }
    );
  };
  
  // Get envelope by ID with offline support
  const useEnvelope = (envelopeId: string, options = {}) => {
    return useQuery(
      ['envelope', envelopeId],
      async () => {
        if (!navigator.onLine) {
          // Try to get from cache first
          try {
            const cachedData = localStorage.getItem(`cached_envelope_${envelopeId}`);
            if (cachedData) {
              return JSON.parse(cachedData);
            }
          } catch (e) {
            console.error(`Failed to retrieve cached envelope ${envelopeId}`, e);
          }
          
          return {
            success: false,
            message: 'Cannot load envelope details while offline',
            data: null
          };
        }
        
        const response = await apiGet(`/api/v1/envelopes/${envelopeId}`);
        
        // Cache for offline use
        try {
          localStorage.setItem(`cached_envelope_${envelopeId}`, JSON.stringify(response.data));
        } catch (e) {
          console.error(`Failed to cache envelope ${envelopeId}`, e);
        }
        
        return response.data;
      },
      {
        ...options,
        // Only refetch when online
        enabled: options.enabled !== false && navigator.onLine
      }
    );
  };
  
  return {
    // Mutations
    createEnvelope: createEnvelopeMutation.mutateAsync,
    isCreatingEnvelope: createEnvelopeMutation.isLoading,
    createEnvelopeError: createEnvelopeMutation.error,
    
    addSigner: addSignerMutation.mutateAsync,
    isAddingSigner: addSignerMutation.isLoading,
    addSignerError: addSignerMutation.error,
    
    sendEnvelope: sendEnvelopeMutation.mutateAsync,
    isSendingEnvelope: sendEnvelopeMutation.isLoading,
    sendEnvelopeError: sendEnvelopeMutation.error,
    
    // Queries
    useEnvelopes,
    useEnvelope
  };
};
