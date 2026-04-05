// Custom service worker extension for Sayina PWA
// This file extends the default Next.js PWA service worker

// Function to open the IndexedDB database
async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sayina-sync-db', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create an object store for the sync operations if it doesn't exist
      if (!db.objectStoreNames.contains('sync-operations')) {
        const store = db.createObjectStore('sync-operations', { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };
    
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// Get all pending operations from IndexedDB
async function getPendingOperations() {
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

// Update the status of an operation in IndexedDB
async function updateOperationStatus(id, status, retryCount) {
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

// Process a single operation
async function processOperation(operation) {
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
      // Determine if we should retry (MAX_RETRY_ATTEMPTS = 5)
      const shouldRetry = operation.retryCount < 5;
      
      if (shouldRetry) {
        // Calculate backoff delay based on retry count (5s initial, max 10min)
        const delay = Math.min(
          5000 * Math.pow(2, operation.retryCount),
          600000
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
    const shouldRetry = operation.retryCount < 5;
    
    if (shouldRetry) {
      // Calculate backoff delay
      const delay = Math.min(
        5000 * Math.pow(2, operation.retryCount),
        600000
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

// Process all pending operations
async function processPendingOperations() {
  const pendingOperations = await getPendingOperations();
  
  for (const operation of pendingOperations) {
    await processOperation(operation);
  }
  
  // Update the pending operations count
  await updatePendingOperationsCount();
}

// Update the count of pending operations and notify clients
async function updatePendingOperationsCount() {
  try {
    const pendingOperations = await getPendingOperations();
    
    // Notify all clients
    const clients = await self.clients.matchAll();
    for (const client of clients) {
      client.postMessage({
        type: 'sync-update',
        pendingOperations: pendingOperations.length,
      });
    }
  } catch (error) {
    console.error('Error updating pending operations count', error);
  }
}

// Listen for sync events
self.addEventListener('sync', (event) => {
  if (event.tag === 'api-queue') {
    event.waitUntil(processPendingOperations());
  }
});

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'check-pending-operations') {
    event.waitUntil(updatePendingOperationsCount());
  }
});

// Additional event listener for the installed event to cache additional resources
self.addEventListener('install', (event) => {
  // We'll extend the default service worker, so no need to claim clients here
  console.log('Custom service worker installed');
});

// Listen for online/offline status changes
self.addEventListener('online', () => {
  processPendingOperations();
});

// Cache template documents for offline use if specified by the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'cache-document-template') {
    const { url, cacheName = 'document-templates' } = event.data;
    
    event.waitUntil(
      caches.open(cacheName).then((cache) => {
        return fetch(url).then((response) => {
          return cache.put(url, response);
        });
      })
    );
  }
});
