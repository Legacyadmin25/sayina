import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { FAB, Button } from 'react-native-paper';

interface PdfLoaderOverlayProps {
  loading: boolean;
  error?: string;
  mode: 'direct' | 'html';
  onToggle: () => void;
  onRetry?: () => void;
}

export default function PdfLoaderOverlay({
  loading,
  error,
  mode,
  onToggle,
  onRetry
}: PdfLoaderOverlayProps) {
  return (
    <>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#DAB44A" />
          <Text style={styles.loadingText}>Loading document...</Text>
        </View>
      )}
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          {onRetry && (
            <Button 
              mode="contained" 
              onPress={onRetry}
              style={styles.retryButton}
              labelStyle={styles.retryButtonLabel}
            >
              Retry
            </Button>
          )}
        </View>
      )}
      
      <FAB
        style={styles.fab}
        small
        icon={mode === 'direct' ? 'layers' : 'file-pdf-box'}
        onPress={onToggle}
        color="#FFFFFF"
      />
    </>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    padding: 15,
    backgroundColor: 'rgba(220, 53, 69, 0.9)',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  errorText: {
    color: '#fff',
    flex: 1,
    marginRight: 10,
  },
  retryButton: {
    backgroundColor: '#fff',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  retryButtonLabel: {
    color: '#dc3545',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#757575',
    zIndex: 10,
  },
});
