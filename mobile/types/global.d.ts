// Global type declarations for modules without TypeScript definitions

// React Native WebView
declare module 'react-native-webview' {
  import { ComponentClass } from 'react';
  import { ViewProps } from 'react-native';

  interface WebViewProps extends ViewProps {
    source?: { uri: string } | { html: string, baseUrl?: string };
    originWhitelist?: string[];
    javaScriptEnabled?: boolean;
    domStorageEnabled?: boolean;
    cacheEnabled?: boolean;
    startInLoadingState?: boolean;
    onLoadStart?: (event: any) => void;
    onLoadEnd?: (event: any) => void;
    onError?: (event: any) => void;
    renderLoading?: () => React.ReactNode;
    injectedJavaScript?: string;
    onMessage?: (event: any) => void;
  }

  interface WebViewStatic extends ComponentClass<WebViewProps> {
    injectJavaScript: (script: string) => void;
    reload: () => void;
  }

  const WebView: WebViewStatic;
  export default WebView;
}

// Async Storage
declare module '@react-native-async-storage/async-storage' {
  export function getItem(key: string): Promise<string | null>;
  export function setItem(key: string, value: string): Promise<void>;
  export function removeItem(key: string): Promise<void>;
  export function clear(): Promise<void>;
  export default {
    getItem,
    setItem,
    removeItem,
    clear
  };
}

// Expo File System
declare module 'expo-file-system' {
  export const documentDirectory: string;
  export const cacheDirectory: string;
  
  export function makeDirectoryAsync(dirPath: string, options?: { intermediates?: boolean }): Promise<void>;
  export function getInfoAsync(fileUri: string): Promise<{ exists: boolean; size?: number; uri?: string; isDirectory?: boolean }>;
  export function deleteAsync(fileUri: string, options?: { idempotent?: boolean }): Promise<void>;
  export function downloadAsync(uri: string, fileUri: string, options?: any): Promise<{ uri: string; status: number; headers?: any; md5?: string; size?: number }>;
  export function createDownloadResumable(uri: string, fileUri: string, options?: any, callback?: (data: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void): DownloadResumable;

  interface DownloadResumable {
    downloadAsync(): Promise<{ uri: string }>;
    pauseAsync(): Promise<void>;
    resumeAsync(): Promise<{ uri: string }>;
    savable(): Promise<{ url: string; headers?: any; fileUri: string; }>;
  }
}

// Expo Sharing
declare module 'expo-sharing' {
  export function isAvailableAsync(): Promise<boolean>;
  export function shareAsync(url: string, options?: { mimeType?: string; dialogTitle?: string }): Promise<void>;
}

// React Native Community NetInfo
declare module '@react-native-community/netinfo' {
  interface NetInfoState {
    isConnected: boolean;
    isInternetReachable?: boolean;
    type?: string;
    details?: any;
  }
  
  export function addEventListener(listener: (state: NetInfoState) => void): { remove: () => void };
  export function fetch(): Promise<NetInfoState>;
}

// React Query
declare module 'react-query' {
  export function useQuery<T>(key: string | readonly unknown[], fn: () => Promise<T>, options?: any): {
    data: T | undefined;
    isLoading: boolean;
    isError: boolean;
    refetch: () => Promise<any>;
  };
}

// Expo Local Authentication
declare module 'expo-local-authentication' {
  export function hasHardwareAsync(): Promise<boolean>;
  export function isEnrolledAsync(): Promise<boolean>;
  export function authenticateAsync(options?: { promptMessage?: string; cancelLabel?: string; disableDeviceFallback?: boolean }): Promise<{ success: boolean }>;
  export const AUTHENTICATION_TYPE: { FINGERPRINT: number; FACIAL_RECOGNITION: number; IRIS: number };
}

// Other module declarations as needed
