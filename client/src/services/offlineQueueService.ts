import localforage from 'localforage';

// Define queue stores for different operations
const envelopeQueue = localforage.createInstance({
  name: 'sayina-offline',
  storeName: 'envelope-queue'
});

const signingQueue = localforage.createInstance({
  name: 'sayina-offline',
  storeName: 'signing-queue'
});

const confirmationQueue = localforage.createInstance({
  name: 'sayina-offline',
  storeName: 'confirmation-queue'
});

// Operation types for type-safety
export enum OperationType {
  CREATE_ENVELOPE = 'CREATE_ENVELOPE',
  UPDATE_ENVELOPE = 'UPDATE_ENVELOPE',
  ADD_SIGNER = 'ADD_SIGNER',
  SIGN_DOCUMENT = 'SIGN_DOCUMENT',
  SEND_CONFIRMATION = 'SEND_CONFIRMATION'
}

// Queued operation interface
export interface QueuedOperation {
  id: string;
  type: OperationType;
  endpoint: string;
  method: string;
  data: any;
  timestamp: number;
  retryCount: number;
  retryBackoff: number; // in milliseconds
}

/**
 * Add an envelope operation to the queue
 */
export const queueEnvelopeOperation = async (
  type: OperationType,
  endpoint: string,
  method: string,
  data: any
): Promise<string> => {
  const id = `envelope-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const operation: QueuedOperation = {
    id,
    type,
    endpoint,
    method,
    data,
    timestamp: Date.now(),
    retryCount: 0,
    retryBackoff: 2000 // Start with 2 seconds
  };

  await envelopeQueue.setItem(id, operation);
  return id;
};

/**
 * Add a signing operation to the queue
 */
export const queueSigningOperation = async (
  type: OperationType,
  endpoint: string,
  method: string,
  data: any
): Promise<string> => {
  const id = `signing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const operation: QueuedOperation = {
    id,
    type,
    endpoint,
    method,
    data,
    timestamp: Date.now(),
    retryCount: 0,
    retryBackoff: 2000 // Start with 2 seconds
  };

  await signingQueue.setItem(id, operation);
  return id;
};

/**
 * Add a confirmation email operation to the queue
 */
export const queueConfirmationOperation = async (
  type: OperationType,
  endpoint: string,
  method: string,
  data: any
): Promise<string> => {
  const id = `confirmation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const operation: QueuedOperation = {
    id,
    type,
    endpoint,
    method,
    data,
    timestamp: Date.now(),
    retryCount: 0,
    retryBackoff: 2000 // Start with 2 seconds
  };

  await confirmationQueue.setItem(id, operation);
  return id;
};

/**
 * Get total number of queued operations across all queues
 */
export const getTotalQueueLength = async (): Promise<number> => {
  const [envelopeKeys, signingKeys, confirmationKeys] = await Promise.all([
    envelopeQueue.keys(),
    signingQueue.keys(),
    confirmationQueue.keys()
  ]);
  
  return envelopeKeys.length + signingKeys.length + confirmationKeys.length;
};

/**
 * Process all queued operations when online
 */
export const processAllQueues = async (): Promise<void> => {
  await Promise.all([
    processQueue(envelopeQueue),
    processQueue(signingQueue),
    processQueue(confirmationQueue)
  ]);
};

/**
 * Process a specific queue
 */
const processQueue = async (queue: LocalForage): Promise<void> => {
  const keys = await queue.keys();
  
  for (const key of keys) {
    const operation = await queue.getItem<QueuedOperation>(key);
    if (!operation) continue;
    
    try {
      const response = await fetch(operation.endpoint, {
        method: operation.method,
        headers: {
          'Content-Type': 'application/json',
          // Include auth token if available
          ...(localStorage.getItem('token') ? { 
            'Authorization': `Bearer ${localStorage.getItem('token')}` 
          } : {})
        },
        body: operation.method !== 'GET' ? JSON.stringify(operation.data) : undefined
      });
      
      if (response.ok) {
        // Successfully processed, remove from queue
        await queue.removeItem(key);
        console.log(`Successfully processed queued operation: ${operation.type}`);
      } else {
        // Handle HTTP errors
        if (response.status === 401) {
          // Auth expired, need user to login again
          console.error('Authentication expired for queued operation');
          // Keep in queue, user will need to login again
        } else if (operation.retryCount < 5) {
          // Update retry count and backoff
          const updatedOperation: QueuedOperation = {
            ...operation,
            retryCount: operation.retryCount + 1,
            retryBackoff: operation.retryBackoff * 2 // Exponential backoff
          };
          await queue.setItem(key, updatedOperation);
          console.log(`Will retry operation ${operation.type} later (attempt ${updatedOperation.retryCount}/5)`);
        } else {
          // Too many retries, remove from queue
          await queue.removeItem(key);
          console.error(`Failed to process queued operation after 5 attempts: ${operation.type}`);
        }
      }
    } catch (error) {
      console.error(`Error processing queued operation: ${error}`);
      // If offline again, keep in queue
      if (!navigator.onLine) {
        console.log('Still offline, will retry later');
      } else if (operation.retryCount < 5) {
        // Update retry count and backoff
        const updatedOperation: QueuedOperation = {
          ...operation,
          retryCount: operation.retryCount + 1,
          retryBackoff: operation.retryBackoff * 2 // Exponential backoff
        };
        await queue.setItem(key, updatedOperation);
      } else {
        // Too many retries, remove from queue
        await queue.removeItem(key);
      }
    }
  }
};

/**
 * Wrapper for fetch that handles offline queueing
 */
export const offlineFetch = async (
  endpoint: string, 
  method: string, 
  data: any, 
  operationType: OperationType
): Promise<Response | { offline: true, queueId: string }> => {
  // If online, try direct fetch first
  if (navigator.onLine) {
    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') ? { 
            'Authorization': `Bearer ${localStorage.getItem('token')}` 
          } : {})
        },
        body: method !== 'GET' ? JSON.stringify(data) : undefined
      });
      
      return response;
    } catch (error) {
      console.error('Fetch error, queueing for offline:', error);
      // Fall through to offline queueing if fetch fails
    }
  }
  
  // Queue for offline processing
  let queueId: string;
  
  // Route to appropriate queue based on operation type
  switch (operationType) {
    case OperationType.CREATE_ENVELOPE:
    case OperationType.UPDATE_ENVELOPE:
      queueId = await queueEnvelopeOperation(operationType, endpoint, method, data);
      break;
    case OperationType.ADD_SIGNER:
    case OperationType.SIGN_DOCUMENT:
      queueId = await queueSigningOperation(operationType, endpoint, method, data);
      break;
    case OperationType.SEND_CONFIRMATION:
      queueId = await queueConfirmationOperation(operationType, endpoint, method, data);
      break;
    default:
      queueId = await queueEnvelopeOperation(operationType, endpoint, method, data);
  }
  
  return { offline: true, queueId };
};

// Export stores for direct access if needed
export const queues = {
  envelope: envelopeQueue,
  signing: signingQueue,
  confirmation: confirmationQueue
};
