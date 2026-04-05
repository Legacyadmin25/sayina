import { useState } from 'react';
import { useOffline } from '../contexts/OfflineContext';
import { apiPost, apiGet, apiPut } from '../services/apiWithOfflineSupport';
import { useQuery, useMutation, useQueryClient } from 'react-query';

// Types for document operations
interface SigningData {
  fields: Array<{
    id: string;
    value: string;
  }>;
  complianceGiven: boolean;
  complianceAt: string;
}

interface DocumentSigningResponse {
  success: boolean;
  message: string;
  offline?: boolean;
  queueId?: string;
  data?: any;
}

export const useDocumentOperations = () => {
  const { isOffline, refreshQueueStatus } = useOffline();
  const [signingStatus, setSigningStatus] = useState<'idle' | 'signing' | 'success' | 'offline' | 'error'>('idle');
  const queryClient = useQueryClient();

  // Complete signing of document (works offline)
  const completeSigningMutation = useMutation<DocumentSigningResponse, Error, { envelopeId: string; signerId: string; data: SigningData }>(
    async ({ envelopeId, signerId, data }) => {
      try {
        const response = await apiPost<DocumentSigningResponse>(
          `/api/v1/fields/complete`,
          {
            envelope_id: envelopeId,
            signer_id: signerId,
            fields: data.fields,
            compliance_given: data.complianceGiven,
            compliance_at: data.complianceAt
          }
        );
        
        // Check if operation was queued for offline
        if (response.data.offline) {
          setSigningStatus('offline');
          // Refresh queue count
          await refreshQueueStatus();
          return response.data;
        }
        
        setSigningStatus('success');
        return response.data;
      } catch (error) {
        if (!navigator.onLine) {
          // If offline and the operation wasn't handled by the interceptor
          setSigningStatus('offline');
          return {
            success: true,
            message: 'Operation will be processed when online',
            offline: true
          };
        }
        
        setSigningStatus('error');
        throw error;
      }
    },
    {
      onSuccess: () => {
        // Invalidate relevant queries
        queryClient.invalidateQueries('documents');
        queryClient.invalidateQueries('envelopes');
      }
    }
  );
  
  // Send confirmation emails (works offline)
  const sendConfirmationMutation = useMutation<DocumentSigningResponse, Error, { envelopeId: string }>(
    async ({ envelopeId }) => {
      try {
        const response = await apiPost<DocumentSigningResponse>(
          `/api/v1/envelopes/${envelopeId}/send-all-confirmations`,
          {}
        );
        
        return response.data;
      } catch (error) {
        if (!navigator.onLine) {
          return {
            success: true,
            message: 'Confirmation emails will be sent when online',
            offline: true
          };
        }
        throw error;
      }
    }
  );
  
  // Download signed document
  const downloadSignedDocument = async (envelopeId: string): Promise<boolean> => {
    if (isOffline) {
      // Check if document is in cache before trying to download
      try {
        const cachedResponse = await caches.match(`/api/v1/documents/signed/${envelopeId}`);
        if (cachedResponse) {
          const blob = await cachedResponse.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `signed-document-${envelopeId}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to check cache for document', error);
        return false;
      }
    }
    
    try {
      // Create a hidden iframe to trigger the download
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = `/api/v1/documents/signed/${envelopeId}`;
      document.body.appendChild(iframe);
      
      // Remove iframe after loading
      iframe.onload = () => {
        document.body.removeChild(iframe);
      };
      
      return true;
    } catch (error) {
      console.error('Failed to download signed document', error);
      return false;
    }
  };
  
  // Get audit trail
  const viewAuditTrail = async (envelopeId: string): Promise<boolean> => {
    if (isOffline) {
      // Check if audit trail is in cache
      try {
        const cachedResponse = await caches.match(`/api/v1/documents/audit/${envelopeId}`);
        if (cachedResponse) {
          const blob = await cachedResponse.blob();
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to check cache for audit trail', error);
        return false;
      }
    }
    
    try {
      window.open(`/audit/compliance/${envelopeId}`, '_blank');
      return true;
    } catch (error) {
      console.error('Failed to open audit trail', error);
      return false;
    }
  };
  
  return {
    signingStatus,
    completeSigning: completeSigningMutation.mutateAsync,
    isSigningLoading: completeSigningMutation.isLoading,
    sendConfirmation: sendConfirmationMutation.mutateAsync,
    isSendingConfirmation: sendConfirmationMutation.isLoading,
    downloadSignedDocument,
    viewAuditTrail
  };
};
