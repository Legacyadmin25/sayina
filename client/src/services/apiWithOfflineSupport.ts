import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { offlineFetch, OperationType } from './offlineQueueService';

// API operations that should support offline mode
enum OfflineApiOperations {
  // Envelope operations
  CREATE_ENVELOPE = '/api/v1/envelopes',
  UPDATE_ENVELOPE = '/api/v1/envelopes',
  
  // Signing operations 
  COMPLETE_SIGNING = '/api/v1/fields/complete',
  ADD_SIGNER = '/api/v1/signers',
  
  // Confirmation operations
  SEND_CONFIRMATION = '/api/v1/envelopes/:id/send-all-confirmations',
}

// Create axios instance with interceptors
const createApiWithOfflineSupport = (): AxiosInstance => {
  const api = axios.create({
    baseURL: '/',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add request interceptor
  api.interceptors.request.use(
    async (config) => {
      // Add auth token if available
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Add response interceptor with offline support
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // If offline or network error, try to queue
      if (!navigator.onLine || error.message === 'Network Error') {
        // Only queue POST, PUT, PATCH operations that match our offline operations
        if (['post', 'put', 'patch'].includes(originalRequest.method.toLowerCase())) {
          const endpoint = originalRequest.url;

          // Map endpoint to operation type
          let operationType: OperationType | null = null;
          
          if (endpoint.startsWith(OfflineApiOperations.CREATE_ENVELOPE)) {
            operationType = OperationType.CREATE_ENVELOPE;
          } else if (endpoint.startsWith(OfflineApiOperations.UPDATE_ENVELOPE) && originalRequest.method.toLowerCase() !== 'post') {
            operationType = OperationType.UPDATE_ENVELOPE;
          } else if (endpoint.startsWith(OfflineApiOperations.ADD_SIGNER)) {
            operationType = OperationType.ADD_SIGNER;
          } else if (endpoint.startsWith(OfflineApiOperations.COMPLETE_SIGNING)) {
            operationType = OperationType.SIGN_DOCUMENT;
          } else if (endpoint.includes('send-all-confirmations')) {
            operationType = OperationType.SEND_CONFIRMATION;
          }

          if (operationType) {
            try {
              const result = await offlineFetch(
                originalRequest.url,
                originalRequest.method.toLowerCase(),
                originalRequest.data,
                operationType
              );
              
              if ('offline' in result) {
                // Return a "fake" successful response
                return Promise.resolve({
                  status: 202,
                  statusText: 'Accepted (Offline)',
                  headers: {},
                  config: originalRequest,
                  data: {
                    success: true,
                    message: 'Operation queued for processing when online',
                    offline: true,
                    queueId: result.queueId
                  }
                } as AxiosResponse);
              }
            } catch (queueError) {
              console.error('Failed to queue offline operation:', queueError);
            }
          }
        }
      }

      return Promise.reject(error);
    }
  );

  return api;
};

// Create a singleton instance
const apiWithOfflineSupport = createApiWithOfflineSupport();

// Export wrapper functions with offline support
export const apiGet = <T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
  return apiWithOfflineSupport.get<T>(url, config);
};

export const apiPost = <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
  return apiWithOfflineSupport.post<T>(url, data, config);
};

export const apiPut = <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
  return apiWithOfflineSupport.put<T>(url, data, config);
};

export const apiPatch = <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
  return apiWithOfflineSupport.patch<T>(url, data, config);
};

export const apiDelete = <T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
  return apiWithOfflineSupport.delete<T>(url, config);
};

export default apiWithOfflineSupport;
