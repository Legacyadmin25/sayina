import { registerSyncOperation } from './syncManager';

interface ApiClientOptions {
  baseUrl?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string>;
  timeout?: number;
  useBackgroundSync?: boolean;
  syncType?: 'envelope' | 'signing' | 'notification' | 'other';
}

/**
 * ApiClient provides a wrapper around fetch with offline support
 * via background sync for POST, PUT, PATCH, and DELETE operations
 */
class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private defaultTimeout: number;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || '/api/v1';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };
    this.defaultTimeout = options.timeout || 30000; // 30 seconds
  }

  /**
   * Set the authorization token for API requests
   */
  setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Remove the authorization token
   */
  removeAuthToken(): void {
    delete this.defaultHeaders['Authorization'];
  }

  /**
   * Make a GET request
   */
  async get<T = any>(
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = this.buildUrl(path, options.params);
    const headers = { ...this.defaultHeaders, ...options.headers };
    const timeout = options.timeout || this.defaultTimeout;

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers,
        timeout,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      // GET requests don't use background sync since they should be idempotent
      // and we can't easily cache the response for all scenarios
      throw this.handleError(error);
    }
  }

  /**
   * Make a POST request with offline support
   */
  async post<T = any>(
    path: string,
    data: any,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = this.buildUrl(path, options.params);
    const headers = { ...this.defaultHeaders, ...options.headers };
    const timeout = options.timeout || this.defaultTimeout;
    const useBackgroundSync = options.useBackgroundSync !== false; // Default to true
    const syncType = options.syncType || 'other';

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        timeout,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      // If we should use background sync and it's a network error
      if (useBackgroundSync && !navigator.onLine) {
        // Register the operation for background sync
        const syncResponse = await registerSyncOperation(
          url,
          'POST',
          data,
          headers,
          syncType
        );

        if (syncResponse) {
          return this.handleResponse<T>(syncResponse);
        }
      }

      throw this.handleError(error);
    }
  }

  /**
   * Make a PUT request with offline support
   */
  async put<T = any>(
    path: string,
    data: any,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = this.buildUrl(path, options.params);
    const headers = { ...this.defaultHeaders, ...options.headers };
    const timeout = options.timeout || this.defaultTimeout;
    const useBackgroundSync = options.useBackgroundSync !== false; // Default to true
    const syncType = options.syncType || 'other';

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
        timeout,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      // If we should use background sync and it's a network error
      if (useBackgroundSync && !navigator.onLine) {
        // Register the operation for background sync
        const syncResponse = await registerSyncOperation(
          url,
          'PUT',
          data,
          headers,
          syncType
        );

        if (syncResponse) {
          return this.handleResponse<T>(syncResponse);
        }
      }

      throw this.handleError(error);
    }
  }

  /**
   * Make a PATCH request with offline support
   */
  async patch<T = any>(
    path: string,
    data: any,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = this.buildUrl(path, options.params);
    const headers = { ...this.defaultHeaders, ...options.headers };
    const timeout = options.timeout || this.defaultTimeout;
    const useBackgroundSync = options.useBackgroundSync !== false; // Default to true
    const syncType = options.syncType || 'other';

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
        timeout,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      // If we should use background sync and it's a network error
      if (useBackgroundSync && !navigator.onLine) {
        // Register the operation for background sync
        const syncResponse = await registerSyncOperation(
          url,
          'PATCH',
          data,
          headers,
          syncType
        );

        if (syncResponse) {
          return this.handleResponse<T>(syncResponse);
        }
      }

      throw this.handleError(error);
    }
  }

  /**
   * Make a DELETE request with offline support
   */
  async delete<T = any>(
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = this.buildUrl(path, options.params);
    const headers = { ...this.defaultHeaders, ...options.headers };
    const timeout = options.timeout || this.defaultTimeout;
    const useBackgroundSync = options.useBackgroundSync !== false; // Default to true
    const syncType = options.syncType || 'other';

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'DELETE',
        headers,
        timeout,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      // If we should use background sync and it's a network error
      if (useBackgroundSync && !navigator.onLine) {
        // Register the operation for background sync
        const syncResponse = await registerSyncOperation(
          url,
          'DELETE',
          undefined,
          headers,
          syncType
        );

        if (syncResponse) {
          return this.handleResponse<T>(syncResponse);
        }
      }

      throw this.handleError(error);
    }
  }

  /**
   * Build a URL with query parameters
   */
  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(
      path.startsWith('http') ? path : `${this.baseUrl}${path}`,
      typeof window !== 'undefined' ? window.location.origin : undefined
    );

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    return url.toString();
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit & { timeout?: number }
  ): Promise<Response> {
    const { timeout, ...fetchOptions } = options;

    if (!timeout) {
      return fetch(url, fetchOptions);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Handle the API response
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || 'An unknown error occurred');
    }

    // Handle empty responses
    if (response.status === 204) {
      return {} as T;
    }

    try {
      return await response.json();
    } catch (error) {
      console.error('Error parsing JSON response', error);
      throw new Error('Invalid JSON response');
    }
  }

  /**
   * Handle errors from the API
   */
  private handleError(error: unknown): Error {
    if (error instanceof Error) {
      // If it's already an Error instance, just return it
      return error;
    }

    // If it's something else, convert it to an Error
    return new Error(String(error));
  }
}

// Create a singleton instance
const apiClient = new ApiClient();

export default apiClient;
