import React, { useState, useEffect, useRef } from 'react';
import { View, AppState, AppStateStatus, ActivityIndicator, StyleSheet } from 'react-native';
import { FAB } from 'react-native-paper';
import WebView from 'react-native-webview';
import PdfCacheManager from '../services/pdfCacheManager';
import PdfTranslationControls from './PdfTranslationControls';
import PdfTranslationService from '../services/pdfTranslationService';

interface PdfWebViewProps {
  sourceUrl: string;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: string) => void;
}

const pdfCacheManager = new PdfCacheManager();

export default function PdfWebView({ 
  sourceUrl, 
  onLoadStart, 
  onLoadEnd, 
  onError 
}: PdfWebViewProps) {
  const [mode, setMode] = useState<'direct'|'html'>('direct');
  const [uri, setUri] = useState<string|null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [translatedUri, setTranslatedUri] = useState<string|null>(null);
  const [showingTranslation, setShowingTranslation] = useState<boolean>(false);
  const webviewRef = useRef<any>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Initialize cache manager and get cached PDF
    setLoading(true);
    if (onLoadStart) onLoadStart();
    
    pdfCacheManager.init()
      .then(() => pdfCacheManager.getCachedPdf(sourceUrl))
      .then((cachedUri) => {
        setUri(cachedUri);
        setLoading(false);
        if (onLoadEnd) onLoadEnd();
      })
      .catch((error) => {
        console.error('Failed to load PDF:', error);
        setLoading(false);
        if (onError) onError('Failed to load PDF. Please check your connection and try again.');
      });
  }, [sourceUrl]);

  // Monitor app state changes to optimize memory
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) && 
        nextAppState === 'active'
      ) {
        // App has come to the foreground - optimize WebView
        optimizeWebView();
      } else if (
        appState.current === 'active' && 
        nextAppState.match(/inactive|background/)
      ) {
        // App has gone to the background - clean up memory
        cleanupMemory();
      }
      
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      cleanupMemory();
    };
  }, []);

  const optimizeWebView = () => {
    if (!webviewRef.current) return;
    
    webviewRef.current.injectJavaScript(`
      if (document.readyState === 'complete') {
        // Force reflow to improve rendering performance
        document.body.style.display = 'none';
        setTimeout(function() {
          document.body.style.display = '';
        }, 10);
      }
      true;
    `);
  };

  const cleanupMemory = () => {
    if (!webviewRef.current) return;
    
    webviewRef.current.injectJavaScript(`
      if (window.gc) {
        window.gc();
      }
      
      // Clear any large objects from memory
      if (window.PDFViewerApplication) {
        if (window.PDFViewerApplication.pdfViewer) {
          window.PDFViewerApplication.pdfViewer.cleanup();
        }
        if (window.PDFViewerApplication.pdfDocument) {
          window.PDFViewerApplication.pdfDocument.cleanup();
        }
      }
      
      // Reduce memory footprint
      const canvases = document.getElementsByTagName('canvas');
      for (let i = 0; i < canvases.length; i++) {
        const canvas = canvases[i];
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      
      true;
    `);
  };

  const toggleMode = () => {
    // Reset WebView when toggling mode
    cleanupMemory();
    setMode(m => m === 'direct' ? 'html' : 'direct');
  };

  const getHtmlWrapper = (pdfUri: string) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <title>PDF Viewer</title>
          <style>
            body, html {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              overflow: hidden;
              background-color: #f5f5f5;
            }
            #pdf-container {
              width: 100%;
              height: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            embed, object {
              width: 100%;
              height: 100%;
              display: block;
            }
          </style>
        </head>
        <body>
          <div id="pdf-container">
            <embed src="${pdfUri}" type="application/pdf" />
          </div>
          <script>
            // Force garbage collection when possible
            setTimeout(() => {
              if (window.gc) window.gc();
            }, 5000);
            
            // Handle memory cleanup on visibility change
            document.addEventListener('visibilitychange', function() {
              if (document.hidden) {
                const embed = document.querySelector('embed');
                if (embed) {
                  embed.src = '';
                }
              } else {
                const embed = document.querySelector('embed');
                if (embed) {
                  embed.src = '${pdfUri}';
                }
              }
            });
            
            // Handle memory optimization
            window.addEventListener('pagehide', function() {
              const embed = document.querySelector('embed');
              if (embed) {
                embed.src = '';
              }
            });
          </script>
        </body>
      </html>
    `;
  };

  // Handle translation complete event
  const handleTranslationComplete = (translatedPdfUri: string) => {
    setTranslatedUri(translatedPdfUri);
    setShowingTranslation(true);
    setUri(translatedPdfUri); // Update the WebView source to show translated PDF
  };

  // Handle reset to original
  const handleResetToOriginal = () => {
    setShowingTranslation(false);
    // Restore original PDF from cache
    pdfCacheManager.getCachedPdf(sourceUrl).then((cachedUri) => {
      setUri(cachedUri);
    });
  };

  return (
    <View style={styles.container}>
      {uri && (
        <WebView
          ref={webviewRef}
          source={mode === 'direct' ? { uri } : { html: getHtmlWrapper(uri), baseUrl: '' }}
          style={styles.webView}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          onLoadStart={() => {
            setLoading(true);
            if (onLoadStart) onLoadStart();
          }}
          onLoadEnd={() => {
            setLoading(false);
            optimizeWebView();
            if (onLoadEnd) onLoadEnd();
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
            setLoading(false);
            
            // Try switching modes if one fails
            if (mode === 'html') {
              setMode('direct');
            }
            
            if (onError) onError(`Error loading document: ${nativeEvent.description}`);
          }}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#DAB44A" />
            </View>
          )}
        />
      )}
      
      <View style={styles.controls}>
        {uri && (
          <FAB
            style={styles.fab}
            small
            icon={mode === 'direct' ? 'layers' : 'file-pdf-box'}
            onPress={toggleMode}
            color="#FFFFFF"
          />
        )}
      </View>

      {uri && (
        <PdfTranslationControls
          pdfUrl={sourceUrl}
          onTranslationComplete={handleTranslationComplete}
          onResetToOriginal={handleResetToOriginal}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  fab: {
    margin: 16,
    backgroundColor: '#DAB44A',
    marginBottom: 60, // Add space for translation controls
  }
});
