/**
 * Sync Manager Utility
 * 
 * Provides utilities for managing background sync operations
 * when the application is offline. This handles retry logic,
 * offline queue management, and status reporting.
 */

export interface SyncOperation {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  type: 'envelope' | 'signing' | 'notification' | 'other';
  status: 'pending' | 'processing' | 'failed' | 'completed';
}

// Max retry attempts before giving up
const MAX_RETRY_ATTEMPTS = 5;

// Exponential backoff settings
const INITIAL_RETRY_DELAY = 5000; // 5 seconds
const MAX_RETRY_DELAY = 60000 * 10; // 10 minutes

/**
 * Initialize sync listener for the service worker
 */
export const initSyncListener = () => {
  // Only run in browser environment and if service worker is supported
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Register for sync events from the service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'sync-update') {
      // Dispatch a custom event with the sync status
      window.dispatchEvent(
        new CustomEvent('sync-update', { 
          detail: { 
            pendingOperations: event.data.pendingOperations 
          } 
        })
      );
    }
  });
};

/**
 * Registers a fetch operation for background sync if offline
 */
export const registerSyncOperation = async (
  url: string,
  method: SyncOperation['method'],
  body?: any,
  headers?: Record<string, string>,
  type: SyncOperation['type'] = 'other'
): Promise<Response | null> => {
  // First try to make the request normally
  if (navigator.onLine) {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      
      return response;
    } catch (error) {
      console.error('Fetch error, will try to queue for background sync', error);
      // If the fetch fails, continue to queue the operation
    }
  }

  // If offline or the fetch failed, queue for background sync
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      // Create a unique ID for this operation
      const operationId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      // Create the operation object
      const operation: SyncOperation = {
        id: operationId,
        url,
        method,
        body,
        headers,
        timestamp: Date.now(),
        retryCount: 0,
        type,
        status: 'pending',
      };
      
      // Store the operation in IndexedDB
      await storeOperation(operation);
      
      // Register for background sync
      const registration = await navigator.serviceWorker.ready;
      
      // Using type assertion because TypeScript doesn't recognize the sync property
      const regWithSync = registration as ServiceWorkerRegistration & {
        sync?: {
          getTags: () => Promise<string[]>;
          register: (tag: string) => Promise<void>;
        };
      };
      
      if (regWithSync.sync) {
        await regWithSync.sync.register('api-queue');
      }
      
      // Return a mock response for the UI
      return new Response(JSON.stringify({ 
        success: true, 
        queued: true,
        operation: operationId,
        message: 'Operation queued for background sync'
      }), { 
        status: 202,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error registering sync operation', error);
      // If background sync registration fails, store the operation anyway
      // so we can retry when the app is loaded next time
      const operationId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      const operation: SyncOperation = {
        id: operationId,
        url,
        method,
        body,
        headers,
        timestamp: Date.now(),
        retryCount: 0,
        type,
        status: 'pending',
      };
      
      await storeOperation(operation);
      
      return new Response(JSON.stringify({ 
        success: false, 
        queued: true,
        operation: operationId,
        message: 'Operation stored but sync registration failed'
      }), { 
        status: 503,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
  }
  
  // If service worker or SyncManager is not supported
  return new Response(JSON.stringify({ 
    success: false,
    message: 'Background sync not supported and device is offline'
  }), { 
    status: 503,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};

/**
 * Store an operation in IndexedDB for later processing
 */
async function storeOperation(operation: SyncOperation): Promise<void> {
  // Open the IndexedDB database
  const db = await openDatabase();
  
  // Create a transaction and add the operation
  const transaction = db.transaction('sync-operations', 'readwrite');
  const store = transaction.objectStore('sync-operations');
  await store.add(operation);
  
  // Update the count of pending operations
  updatePendingOperationsCount();
}

/**
 * Open the IndexedDB database for storing sync operations
 */
export async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sayina-sync-db', 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create an object store for the sync operations if it doesn't exist
      if (!db.objectStoreNames.contains('sync-operations')) {
        const store = db.createObjectStore('sync-operations', { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
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
 * Get all pending operations from IndexedDB
 */
export async function getPendingOperations(): Promise<SyncOperation[]> {
  const db = await openDatabase();
  const transaction = db.transaction('sync-operations', 'readonly');
  const store = transaction.objectStore('sync-operations');
  const index = store.index('status');
  
  return new Promise((resolve, reject) => {
    const request = index.getAll('pending');
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Update the status of an operation in IndexedDB
 */
export async function updateOperationStatus(
  id: string,
  status: SyncOperation['status'],
  retryCount?: number
): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction('sync-operations', 'readwrite');
  const store = transaction.objectStore('sync-operations');
  
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    
    request.onsuccess = () => {
      const operation = request.result;
      if (operation) {
        operation.status = status;
        if (typeof retryCount !== 'undefined') {
          operation.retryCount = retryCount;
        }
        
        const updateRequest = store.put(operation);
        
        updateRequest.onsuccess = () => {
          updatePendingOperationsCount();
          resolve();
        };
        
        updateRequest.onerror = () => {
          reject(updateRequest.error);
        };
      } else {
        reject(new Error(`Operation with ID ${id} not found`));
      }
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Process all pending operations
 */
export async function processPendingOperations(): Promise<void> {
  const pendingOperations = await getPendingOperations();
  
  for (const operation of pendingOperations) {
    await processOperation(operation);
  }
  
  // Update the pending operations count
  await updatePendingOperationsCount();
}

/**
 * Process a single operation
 */
async function processOperation(operation: SyncOperation): Promise<void> {
  // Skip if not online
  if (!navigator.onLine) {
    return;
  }
  
  // Mark as processing
  await updateOperationStatus(operation.id, 'processing');
  
  try {
    // Send the request
    const response = await fetch(operation.url, {
      method: operation.method,
      headers: {
        'Content-Type': 'application/json',
        ...operation.headers,
      },
      body: operation.body ? JSON.stringify(operation.body) : undefined,
    });
    
    if (response.ok) {
      // Mark as completed
      await updateOperationStatus(operation.id, 'completed');
    } else {
      // Determine if we should retry
      const shouldRetry = operation.retryCount < MAX_RETRY_ATTEMPTS;
      
      if (shouldRetry) {
        // Calculate backoff delay based on retry count
        const delay = Math.min(
          INITIAL_RETRY_DELAY * Math.pow(2, operation.retryCount),
          MAX_RETRY_DELAY
        );
        
        // Schedule retry
        setTimeout(async () => {
          await updateOperationStatus(
            operation.id,
            'pending',
            operation.retryCount + 1
          );
          await processOperation({
            ...operation,
            retryCount: operation.retryCount + 1,
          });
        }, delay);
      } else {
        // Mark as failed after max retries
        await updateOperationStatus(operation.id, 'failed');
      }
    }
  } catch (error) {
    console.error('Error processing operation', error);
    
    // Determine if we should retry
    const shouldRetry = operation.retryCount < MAX_RETRY_ATTEMPTS;
    
    if (shouldRetry) {
      // Calculate backoff delay
      const delay = Math.min(
        INITIAL_RETRY_DELAY * Math.pow(2, operation.retryCount),
        MAX_RETRY_DELAY
      );
      
      // Schedule retry
      setTimeout(async () => {
        await updateOperationStatus(
          operation.id,
          'pending',
          operation.retryCount + 1
        );
        await processOperation({
          ...operation,
          retryCount: operation.retryCount + 1,
        });
      }, delay);
    } else {
      // Mark as failed after max retries
      await updateOperationStatus(operation.id, 'failed');
    }
  }
}

/**
 * Update the count of pending operations and notify the UI
 */
export async function updatePendingOperationsCount(): Promise<void> {
  try {
    const pendingOperations = await getPendingOperations();
    
    // Notify the UI through the service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'pending-operations-count',
        count: pendingOperations.length,
      });
    }
    
    // Also dispatch a direct event for components that may be listening
    window.dispatchEvent(
      new CustomEvent('sync-update', { 
        detail: { 
          pendingOperations: pendingOperations.length 
        } 
      })
    );
  } catch (error) {
    console.error('Error updating pending operations count', error);
  }
}
