'use client';
import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
  return (
    <Toaster 
      position="top-right"
      toastOptions={{
        // Default styling for Sayina's brand
        style: {
          background: '#FFFFFF',
          color: '#333333',
          border: '1px solid #E2E8F0',
          maxWidth: '400px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        },
        success: {
          iconTheme: {
            primary: '#DAB44A', // Sayina's primary/gold color
            secondary: '#FFFFFF',
          },
          style: {
            border: '1px solid #DAB44A',
          },
        },
        error: {
          iconTheme: {
            primary: '#EF4444',
            secondary: '#FFFFFF',
          },
          style: {
            border: '1px solid #EF4444',
          },
        },
        loading: {
          iconTheme: {
            primary: '#DAB44A',
            secondary: '#FFFFFF',
          },
        },
        duration: 4000,
      }}
    />
  );
}
