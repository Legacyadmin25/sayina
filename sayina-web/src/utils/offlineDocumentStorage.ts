/**
 * Offline Document Storage Utility
 * 
 * Provides functionality for storing and retrieving documents
 * in IndexedDB for offline use. This allows users to access
 * and view their documents even when offline.
 */

export interface OfflineDocument {
  id: string;
  name: string;
  data: ArrayBuffer;
  contentType: string;
  size: number;
  lastModified: number;
  userEmail?: string;
  metadata?: Record<string, any>;
}

/**
 * Opens the offline document database
 */
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sayina-offline-documents', 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create an object store for documents
      if (!db.objectStoreNames.contains('documents')) {
        const store = db.createObjectStore('documents', { keyPath: 'id' });
        store.createIndex('userEmail', 'userEmail', { unique: false });
        store.createIndex('lastModified', 'lastModified', { unique: false });
      }
    };
    
    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
    
    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Saves a document for offline use
 */
export async function saveDocumentForOffline(document: OfflineDocument): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction('documents', 'readwrite');
  const store = transaction.objectStore('documents');
  
  return new Promise((resolve, reject) => {
    const request = store.put(document);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Retrieves a document from offline storage by ID
 */
export async function getOfflineDocument(documentId: string): Promise<OfflineDocument | null> {
  const db = await openDatabase();
  const transaction = db.transaction('documents', 'readonly');
  const store = transaction.objectStore('documents');
  
  return new Promise((resolve, reject) => {
    const request = store.get(documentId);
    
    request.onsuccess = () => {
      resolve(request.result || null);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Removes a document from offline storage
 */
export async function removeOfflineDocument(documentId: string): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction('documents', 'readwrite');
  const store = transaction.objectStore('documents');
  
  return new Promise((resolve, reject) => {
    const request = store.delete(documentId);
    
    request.onsuccess = () => {
      resolve();
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Lists all documents available offline
 */
export async function listOfflineDocuments(userEmail?: string): Promise<OfflineDocument[]> {
  const db = await openDatabase();
  const transaction = db.transaction('documents', 'readonly');
  const store = transaction.objectStore('documents');
  
  return new Promise((resolve, reject) => {
    let request: IDBRequest;
    
    if (userEmail) {
      const index = store.index('userEmail');
      request = index.getAll(userEmail);
    } else {
      request = store.getAll();
    }
    
    request.onsuccess = () => {
      resolve(request.result || []);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Saves a document from a Blob or File object
 */
export async function saveDocumentFromBlob(
  id: string,
  name: string,
  blob: Blob,
  userEmail?: string,
  metadata?: Record<string, any>
): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const data = event.target?.result as ArrayBuffer;
        
        await saveDocumentForOffline({
          id,
          name,
          data,
          contentType: blob.type,
          size: blob.size,
          lastModified: Date.now(),
          userEmail,
          metadata,
        });
        
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(reader.error);
    };
    
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Creates a Blob from an offline document
 */
export function createBlobFromOfflineDocument(document: OfflineDocument): Blob {
  return new Blob([document.data], { type: document.contentType });
}

/**
 * Creates a URL for an offline document
 */
export function createURLForOfflineDocument(document: OfflineDocument): string {
  const blob = createBlobFromOfflineDocument(document);
  return URL.createObjectURL(blob);
}

/**
 * Marks a document for offline use by downloading it and saving to IndexedDB
 */
export async function markDocumentForOffline(
  documentId: string,
  documentName: string,
  documentUrl: string,
  userEmail?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    // First check if we already have this document
    const existingDoc = await getOfflineDocument(documentId);
    if (existingDoc) {
      // Document already available offline
      return;
    }
    
    // Fetch the document
    const response = await fetch(documentUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
    }
    
    // Get the document as a blob
    const blob = await response.blob();
    
    // Save the document for offline use
    await saveDocumentFromBlob(
      documentId,
      documentName,
      blob,
      userEmail,
      metadata
    );
    
    // Notify the service worker to cache this URL
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'cache-document',
        url: documentUrl,
      });
    }
  } catch (error) {
    console.error('Error marking document for offline use:', error);
    throw error;
  }
}
