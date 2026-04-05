import { useState, useEffect, useCallback } from 'react';
import { 
  listOfflineDocuments, 
  getOfflineDocument, 
  markDocumentForOffline, 
  removeOfflineDocument,
  createURLForOfflineDocument,
  OfflineDocument
} from '@/utils/offlineDocumentStorage';

/**
 * Hook for managing offline documents
 * 
 * Provides functionality for listing, saving, and retrieving
 * documents for offline use.
 */
export function useOfflineDocuments(userEmail?: string) {
  const [documents, setDocuments] = useState<OfflineDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Load documents on mount and when userEmail changes
  useEffect(() => {
    async function loadDocuments() {
      try {
        setLoading(true);
        const docs = await listOfflineDocuments(userEmail);
        setDocuments(docs);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    }

    loadDocuments();
  }, [userEmail]);

  // Listen for online/offline events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Function to mark a document for offline use
  const saveForOffline = useCallback(
    async (
      documentId: string,
      documentName: string,
      documentUrl: string,
      metadata?: Record<string, any>
    ) => {
      try {
        await markDocumentForOffline(
          documentId,
          documentName,
          documentUrl,
          userEmail,
          metadata
        );

        // Refresh the document list
        const docs = await listOfflineDocuments(userEmail);
        setDocuments(docs);

        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return false;
      }
    },
    [userEmail]
  );

  // Function to remove a document from offline storage
  const removeFromOffline = useCallback(
    async (documentId: string) => {
      try {
        await removeOfflineDocument(documentId);

        // Update the document list
        setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));

        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return false;
      }
    },
    []
  );

  // Function to get a document by ID
  const getDocument = useCallback(async (documentId: string) => {
    try {
      const doc = await getOfflineDocument(documentId);
      return doc;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    }
  }, []);

  // Function to create a URL for a document
  const getDocumentURL = useCallback((document: OfflineDocument) => {
    return createURLForOfflineDocument(document);
  }, []);

  // Function to check if a document is available offline
  const isDocumentOffline = useCallback(
    (documentId: string) => {
      return documents.some((doc) => doc.id === documentId);
    },
    [documents]
  );

  // Refresh the document list
  const refreshDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const docs = await listOfflineDocuments(userEmail);
      setDocuments(docs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  return {
    documents,
    loading,
    error,
    isOnline,
    saveForOffline,
    removeFromOffline,
    getDocument,
    getDocumentURL,
    isDocumentOffline,
    refreshDocuments,
  };
}
