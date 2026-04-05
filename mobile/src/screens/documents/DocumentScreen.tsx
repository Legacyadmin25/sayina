import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { Text, Appbar, FAB, Portal, Dialog, Button, RadioButton, Menu, Divider } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainStack';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useQuery } from 'react-query';
import NetInfo from '@react-native-community/netinfo';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';
import PdfWebView from '../../components/PdfWebView';
import PdfLoaderOverlay from '../../components/PdfLoaderOverlay';
import PdfCacheManager from '../../services/pdfCacheManager';

type Props = NativeStackScreenProps<MainStackParamList, 'Document'>;

interface DocumentData {
  id: string;
  name: string;
  url: string;
  mime_type: string;
  size: number;
  created_at: string;
  updated_at: string;
  pages: number;
  thumbnail_url: string | null;
}

const pdfCacheManager = new PdfCacheManager();

const DocumentScreen = ({ route, navigation }: Props) => {
  const { documentId } = route.params;
  const [isOffline, setIsOffline] = useState(false);
  const [isCachedLocally, setIsCachedLocally] = useState(false);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showTranslateDialog, setShowTranslateDialog] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateProgress, setTranslateProgress] = useState(0);
  const [translatedUri, setTranslatedUri] = useState<string | null>(null);
  const [showTranslated, setShowTranslated] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [pdfViewMode, setPdfViewMode] = useState<'direct' | 'html'>('direct');
  const [pdfError, setPdfError] = useState<string | undefined>();
  const [pdfLoading, setPdfLoading] = useState(false);
  const { width, height } = Dimensions.get('window');
  const { t, currentLanguage, supportedLanguages } = useLanguage();

  // Track network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);
  
  // Initialize PDF cache manager
  useEffect(() => {
    pdfCacheManager.init();
  }, []);

  // Fetch document data
  const { 
    data: document,
    isLoading,
    isError,
    refetch,
  } = useQuery<DocumentData>(
    ['document', documentId],
    async () => {
      const response = await api.get(`/api/v1/documents/${documentId}`);
      return response.data.data;
    },
    {
      enabled: !isOffline,
      retry: 2,
      onSuccess: (data) => {
        checkCachedDocument(data);
        // Set screen title to document name
        navigation.setOptions({ title: data.name });
      },
      onError: (error) => {
        console.error('Failed to fetch document details:', error);
      },
    }
  );

  // Check if document is cached locally
  const checkCachedDocument = async (docData: DocumentData) => {
    try {
      // Check if the document is in the cache using PdfCacheManager
      const cacheStats = await pdfCacheManager.getCacheStats();
      
      // Fall back to checking the document directory for older cached files
      const fileName = docData.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      
      if (fileInfo.exists) {
        setIsCachedLocally(true);
        setLocalUri(fileUri);
      } else {
        setIsCachedLocally(false);
        setLocalUri(null);
      }
    } catch (error) {
      console.error('Error checking cached document:', error);
      setIsCachedLocally(false);
    }
  };

  // Download document using pdfCacheManager
  const downloadDocument = async () => {
    if (!document) return;
    
    try {
      setIsDownloading(true);
      setPdfLoading(true);
      
      // Use the PdfCacheManager to handle the download and caching
      const uri = await pdfCacheManager.getCachedPdf(document.url);
      
      if (uri) {
        setLocalUri(uri);
        setIsCachedLocally(true);
        
        if (isOffline) {
          Alert.alert('Success', 'Document downloaded for offline viewing');
        }
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      Alert.alert('Error', 'Failed to download document. Please try again.');
      setPdfError('Failed to download document. Please try again.');
      
      // Fall back to the old download method if pdfCacheManager fails
      try {
        const fileName = document.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        
        const downloadResumable = FileSystem.createDownloadResumable(
          document.url,
          fileUri,
          {},
          (downloadProgress) => {
            const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
            setDownloadProgress(progress);
          }
        );
        
        const { uri } = await downloadResumable.downloadAsync();
        
        if (uri) {
          setLocalUri(uri);
          setIsCachedLocally(true);
        }
      } catch (fallbackError) {
        console.error('Error in fallback download:', fallbackError);
      }
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
      setPdfLoading(false);
    }
  };

  // Share document
  const shareDocument = async () => {
    try {
      if (!localUri && !isOffline && document) {
        // Download first if not cached
        await downloadDocument();
      }
      
      if (localUri) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(localUri);
        } else {
          Alert.alert('Sharing not available', 'Sharing is not available on this device');
        }
      }
    } catch (error) {
      console.error('Error sharing document:', error);
      Alert.alert('Error', 'Failed to share document. Please try again.');
    }
  };

  // Delete cached document
  const deleteCachedDocument = async () => {
    if (!localUri) return;
    
    try {
      // Try to delete from PdfCacheManager first
      if (document?.url) {
        await pdfCacheManager.clearCache(document.url);
      }
      
      // Also try to delete the file directly as a fallback
      await FileSystem.deleteAsync(localUri, { idempotent: true });
      
      setIsCachedLocally(false);
      setLocalUri(null);
      setShowShareDialog(false);
      Alert.alert('Success', 'Cached document deleted');
    } catch (error) {
      console.error('Error deleting cached document:', error);
      Alert.alert('Error', 'Failed to delete cached document');
    }
  };

  // Print document
  const printDocument = () => {
    Alert.alert(
      'Print Document',
      'To print this document, please share it and use your device\'s print functionality.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: shareDocument }
      ]
    );
  };

  // Translate document
  const translateDocument = async () => {
    if (!document) return;
    
    try {
      setIsTranslating(true);
      setTranslateProgress(10);
      setShowTranslateDialog(false);
      
      // Call the translation API
      const response = await api.post(`/api/v1/documents/${documentId}/translate`, {
        targetLanguage
      });
      
      if (response.data.success) {
        setTranslateProgress(50);
        
        // Download the translated document
        const fileName = `translated_${document.name.replace(/[^a-zA-Z0-9.]/g, '_')}_${targetLanguage}.pdf`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        
        const downloadResumable = FileSystem.createDownloadResumable(
          response.data.data.translatedPdfUrl,
          fileUri,
          {},
          (downloadProgress) => {
            const progress = 50 + (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 50;
            setTranslateProgress(progress);
          }
        );
        
        const { uri } = await downloadResumable.downloadAsync();
        
        if (uri) {
          setTranslatedUri(uri);
          setShowTranslated(true);
          Alert.alert('Success', t('document_translated_success'));
        }
      } else {
        Alert.alert('Error', t('document_translation_failed'));
      }
    } catch (error) {
      console.error('Error translating document:', error);
      Alert.alert('Error', t('document_translation_failed'));
    } finally {
      setIsTranslating(false);
      setTranslateProgress(0);
    }
  };

  // Handle error state
  if (isError) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Error Loading Document</Text>
        <Text style={styles.errorText}>
          There was a problem loading this document. Please try again.
        </Text>
        <Button 
          mode="contained"
          onPress={() => refetch()}
          style={styles.button}
        >
          Retry
        </Button>
      </SafeAreaView>
    );
  }

  // Handle loading state
  if (isLoading && !localUri) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DAB44A" />
        <Text style={styles.loadingText}>Loading document...</Text>
      </SafeAreaView>
    );
  }

  // Offline mode without cached document
  if (isOffline && !isCachedLocally) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorTitle}>You're Offline</Text>
        <Text style={styles.errorText}>
          This document is not available offline. Please connect to the internet to view it.
        </Text>
        <Button 
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.button}
        >
          Go Back
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={document?.name || 'Document'} />
        
        {/* Translation status indicator */}
        {isTranslating && (
          <View style={styles.translateIndicator}>
            <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
            <Text style={styles.translateText}>{Math.round(translateProgress)}%</Text>
          </View>
        )}
        
        {/* Toggle translated view button */}
        {translatedUri && !isTranslating && (
          <Appbar.Action 
            icon={showTranslated ? "translate-off" : "translate"} 
            onPress={() => setShowTranslated(!showTranslated)} 
            color={showTranslated ? "#DAB44A" : undefined}
          />
        )}
        
        {/* Document actions menu */}
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={<Appbar.Action icon="dots-vertical" onPress={() => setMenuVisible(true)} />}
        >
          <Menu.Item 
            onPress={() => {
              setMenuVisible(false);
              setShowShareDialog(true);
            }} 
            title={t('share')} 
            icon="share-variant" 
          />
          
          <Menu.Item 
            onPress={() => {
              setMenuVisible(false);
              setShowTranslateDialog(true);
            }} 
            title={t('translate')} 
            icon="translate" 
            disabled={isOffline || isTranslating}
          />
          
          <Divider />
          
          <Menu.Item 
            onPress={() => {
              setMenuVisible(false);
              printDocument();
            }} 
            title={t('print')} 
            icon="printer" 
          />
        </Menu>
      </Appbar.Header>
      
      {/* Download Progress */}
      {isDownloading && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Downloading: {Math.round(downloadProgress * 100)}%
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${downloadProgress * 100}%` }
              ]} 
            />
          </View>
        </View>
      )}
      
      {/* Document WebView with optimized PDF viewing */}
      <View style={styles.webViewContainer}>
        {(showTranslated && translatedUri) ? (
          <View style={styles.webView}>
            <PdfWebView
              sourceUrl={translatedUri}
              onLoadStart={() => setPdfLoading(true)}
              onLoadEnd={() => setPdfLoading(false)}
              onError={(error) => {
                setPdfError(error);
                setPdfLoading(false);
              }}
            />
            <PdfLoaderOverlay
              loading={pdfLoading}
              error={pdfError}
              mode={pdfViewMode}
              onToggle={() => setPdfViewMode(mode => mode === 'direct' ? 'html' : 'direct')}
              onRetry={() => {
                setPdfError(undefined);
                setPdfLoading(true);
              }}
            />
          </View>
        ) : localUri ? (
          <View style={styles.webView}>
            <PdfWebView
              sourceUrl={localUri}
              onLoadStart={() => setPdfLoading(true)}
              onLoadEnd={() => setPdfLoading(false)}
              onError={(error) => {
                setPdfError(error);
                setPdfLoading(false);
              }}
            />
            <PdfLoaderOverlay
              loading={pdfLoading}
              error={pdfError}
              mode={pdfViewMode}
              onToggle={() => setPdfViewMode(mode => mode === 'direct' ? 'html' : 'direct')}
              onRetry={() => {
                setPdfError(undefined);
                setPdfLoading(true);
              }}
            />
          </View>
        ) : document ? (
          <View style={styles.webView}>
            <PdfWebView
              sourceUrl={document.url}
              onLoadStart={() => setPdfLoading(true)}
              onLoadEnd={() => setPdfLoading(false)}
              onError={(error) => {
                setPdfError(error);
                setPdfLoading(false);
              }}
            />
            <PdfLoaderOverlay
              loading={pdfLoading}
              error={pdfError}
              mode={pdfViewMode}
              onToggle={() => setPdfViewMode(mode => mode === 'direct' ? 'html' : 'direct')}
              onRetry={() => {
                setPdfError(undefined);
                setPdfLoading(true);
              }}
            />
          </View>
        ) : null}
      </View>
      
      {/* Floating Action Button for download if not cached */}
      {!isCachedLocally && !isDownloading && (
        <FAB
          icon="download"
          style={styles.fab}
          onPress={downloadDocument}
          color="#FFFFFF"
        />
      )}
      
      {/* We no longer need this FAB as it's integrated in PdfLoaderOverlay */}
      
      {/* Share Dialog */}
      <Portal>
        <Dialog visible={showShareDialog} onDismiss={() => setShowShareDialog(false)}>
          <Dialog.Title>{t('document_options')}</Dialog.Title>
          <Dialog.Content>
            <View style={styles.dialogContent}>
              <Button 
                mode="outlined" 
                icon="share-variant" 
                onPress={() => {
                  shareDocument();
                  setShowShareDialog(false);
                }}
                style={styles.dialogButton}
              >
                {t('share_document')}
              </Button>
              
              <Button 
                mode="outlined" 
                icon="download" 
                onPress={() => {
                  downloadDocument();
                  setShowShareDialog(false);
                }}
                style={styles.dialogButton}
                disabled={isDownloading || (isCachedLocally && !isOffline)}
              >
                {isCachedLocally ? t('re_download') : t('download')}
              </Button>
              
              <Button 
                mode="outlined" 
                icon="printer" 
                onPress={() => {
                  printDocument();
                  setShowShareDialog(false);
                }}
                style={styles.dialogButton}
              >
                {t('print')}
              </Button>
              
              {isCachedLocally && (
                <Button 
                  mode="outlined" 
                  icon="delete" 
                  onPress={() => {
                    deleteCachedDocument();
                  }}
                  style={[styles.dialogButton, styles.deleteButton]}
                >
                  {t('delete_cached_copy')}
                </Button>
              )}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowShareDialog(false)}>{t('close')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Translation Dialog */}
      <Portal>
        <Dialog visible={showTranslateDialog} onDismiss={() => setShowTranslateDialog(false)}>
          <Dialog.Title>{t('translate_document')}</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.translateDialogText}>{t('select_target_language')}</Text>
            <RadioButton.Group onValueChange={value => setTargetLanguage(value)} value={targetLanguage}>
              {supportedLanguages.map(lang => (
                <RadioButton.Item 
                  key={lang.code} 
                  label={`${lang.name} (${lang.nativeName})`} 
                  value={lang.code} 
                  disabled={lang.code === currentLanguage}
                />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowTranslateDialog(false)}>{t('cancel')}</Button>
            <Button 
              onPress={translateDocument} 
              disabled={!targetLanguage || targetLanguage === currentLanguage}
            >
              {t('translate')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  translateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  translateText: {
    color: 'white',
    fontSize: 12,
  },
  translateDialogText: {
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#757575',
  },
  button: {
    width: 200,
    backgroundColor: '#DAB44A',
  },
  progressContainer: {
    padding: 8,
    backgroundColor: '#E0E0E0',
  },
  progressText: {
    marginBottom: 4,
    fontSize: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#BDBDBD',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#DAB44A',
    borderRadius: 2,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#E0E0E0',
  },
  webView: {
    flex: 1,
  },
  webViewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#DAB44A',
  },
  secondaryFab: {
    bottom: 80,
    backgroundColor: '#757575',
  },
  dialogOption: {
    marginBottom: 12,
  },
  dialogButton: {
    justifyContent: 'flex-start',
  },
});

export default DocumentScreen;
