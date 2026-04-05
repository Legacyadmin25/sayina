import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

// Get the API URL based on platform
const getApiUrl = () => {
  if (__DEV__) {
    // For development environment
    return Platform.select({
      // On actual mobile devices in dev mode, use your computer's IP
      ios: 'http://192.168.1.100:5000',
      android: 'http://10.0.2.2:5000', // Android emulator uses this to access host machine
      default: 'http://localhost:5000',
    });
  }
  
  // For production environment
  return 'https://api.sayina.co.za';
};

// Create axios instance
const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Queue for offline requests
interface QueuedRequest {
  method: string;
  url: string;
  data?: any;
  headers?: any;
}

let requestQueue: QueuedRequest[] = [];
let isQueueProcessing = false;

// Function to save queue to storage
const saveQueue = async () => {
  try {
    await SecureStore.setItemAsync('requestQueue', JSON.stringify(requestQueue));
  } catch (error) {
    console.error('Error saving request queue:', error);
  }
};

// Function to load queue from storage
const loadQueue = async () => {
  try {
    const storedQueue = await SecureStore.getItemAsync('requestQueue');
    if (storedQueue) {
      requestQueue = JSON.parse(storedQueue);
    }
  } catch (error) {
    console.error('Error loading request queue:', error);
  }
};

// Process queued requests when online
const processQueue = async () => {
  if (isQueueProcessing || requestQueue.length === 0) {
    return;
  }
  
  isQueueProcessing = true;
  
  const networkState = await NetInfo.fetch();
  if (!networkState.isConnected) {
    isQueueProcessing = false;
    return;
  }
  
  while (requestQueue.length > 0) {
    const request = requestQueue.shift();
    if (!request) continue;
    
    try {
      await api({
        method: request.method,
        url: request.url,
        data: request.data,
        headers: request.headers,
      });
    } catch (error) {
      console.error('Error processing queued request:', error);
    }
  }
  
  await saveQueue();
  isQueueProcessing = false;
};

// Listen for network status changes
NetInfo.addEventListener(state => {
  if (state.isConnected && requestQueue.length > 0) {
    processQueue();
  }
});

// Load queue on startup
loadQueue();

// Add request interceptor
api.interceptors.request.use(
  async (config) => {
    // Get token from secure storage
    const token = await SecureStore.getItemAsync('userToken');
    
    // Add token to headers if it exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Check network connection
    const networkState = await NetInfo.fetch();
    
    // If offline and method is not GET, queue the request
    if (!networkState.isConnected && config.method !== 'get') {
      return new Promise((resolve, reject) => {
        // Queue the request
        requestQueue.push({
          method: config.method || 'get',
          url: config.url || '',
          data: config.data,
          headers: config.headers,
        });
        
        // Save queue to storage
        saveQueue();
        
        // Resolve with offline response
        reject({
          response: {
            status: 0,
            data: { 
              message: 'Request queued for when you are online',
              offline: true,
              queued: true 
            },
          },
        });
      });
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle token expiration
    if (error.response && error.response.status === 401) {
      try {
        // Try to refresh the token
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        
        if (refreshToken) {
          // Prevent circular refresh attempts
          const originalRequest = error.config;
          if (!originalRequest._retry) {
            originalRequest._retry = true;
            
            // Call refresh token endpoint
            const response = await axios.post(
              `${getApiUrl()}/api/v1/auth/refresh-token`,
              { refresh_token: refreshToken },
              { headers: { 'Content-Type': 'application/json' } }
            );
            
            // If refresh successful, update tokens
            if (response.data && response.data.token) {
              const newToken = response.data.token;
              await SecureStore.setItemAsync('userToken', newToken);
              
              if (response.data.refresh_token) {
                await SecureStore.setItemAsync('refreshToken', response.data.refresh_token);
              }
              
              // Retry the original request with new token
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return axios(originalRequest);
            }
          }
        }
      } catch (refreshError) {
        console.error('Token refresh error:', refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
