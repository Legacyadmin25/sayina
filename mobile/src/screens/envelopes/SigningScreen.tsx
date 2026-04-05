import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, Dimensions, Platform } from 'react-native';
import { Text, Button, ActivityIndicator, Portal, Dialog, Appbar } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';
import WebView from 'react-native-webview';
import { useQueryClient, useMutation, useQuery } from 'react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import api from '../../services/api';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as LocalAuthentication from 'expo-local-authentication';
import SignaturePad from '../../components/signing/SignaturePad';
import ComplianceNotice from '../../components/compliance/ComplianceNotice';
import pushNotificationService from '../../services/notifications/pushNotificationService';

type Props = NativeStackScreenProps<RootStackParamList, 'Signing'>;

interface EnvelopeData {
  id: string;
  name: string;
  status: string;
  documents: {
    id: string;
    name: string;
    url: string;
  }[];
  signers: {
    id: string;
    name: string;
    email: string;
    status: string;
    fields: {
      id: string;
      type: string;
      page: number;
      x: number;
      y: number;
      width: number;
      height: number;
      required: boolean;
      value: string | null;
    }[];
  }[];
}

const SigningScreen = ({ route, navigation }: Props) => {
  const { envelopeId, signerId, token } = route.params;
  const [envelope, setEnvelope] = useState<EnvelopeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSigner, setCurrentSigner] = useState<string | null>(null);
  const [signingToken, setSigningToken] = useState<string | null>(token || null);
  const [isOffline, setIsOffline] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [currentFieldId, setCurrentFieldId] = useState<string | null>(null);
  const [signatureValue, setSignatureValue] = useState<string | null>(null);
  const [showComplianceDialog, setShowComplianceDialog] = useState(false);
  const [complianceAccepted, setComplianceAccepted] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadingDocument, setDownloadingDocument] = useState(false);
  
  const webViewRef = useRef<WebView>(null);
  const queryClient = useQueryClient();

  // Track network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  // Function to load envelope data
  const loadEnvelopeData = async () => {
    try {
      let response;
      
      if (signingToken) {
        // If we have a signing token, use it
        response = await api.get(`/api/v1/signing/${envelopeId}?token=${signingToken}`);
      } else {
        // Otherwise use the authenticated API
        response = await api.get(`/api/v1/envelopes/${envelopeId}`);
      }
      
      setEnvelope(response.data.data);
      
      // Set current signer
      if (signerId) {
        setCurrentSigner(signerId);
      } else if (response.data.data.signers.length > 0) {
        setCurrentSigner(response.data.data.signers[0].id);
      }
      
      return response.data.data;
    } catch (error) {
      console.error('Error loading envelope:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Load envelope data
  const { isLoading: isEnvelopeLoading, error: envelopeError } = useQuery(
    ['envelope', envelopeId, signingToken],
    loadEnvelopeData,
      try {
        let response;
        
        if (signingToken) {
          // If we have a signing token, use it
          response = await api.get(`/api/v1/signing/${envelopeId}?token=${signingToken}`);
        } else {
          // Otherwise use the authenticated API
          response = await api.get(`/api/v1/envelopes/${envelopeId}`);
        }
        
        setEnvelope(response.data.data);
        
        // Set current signer
        if (signerId) {
          setCurrentSigner(signerId);
        } else if (response.data.data.signers.length > 0) {
          setCurrentSigner(response.data.data.signers[0].id);
        }
        
        return response.data.data;
      } catch (error) {
        console.error('Error loading envelope:', error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    {
      enabled: !isOffline && (!!signingToken || !!envelopeId),
      retry: 3,
      onError: (error) => {
        Alert.alert(
          'Error',
          'Failed to load the document for signing. Please check your internet connection and try again.'
        );
      },
    }
  );

  // Sign mutation
  const signMutation = useMutation(
    async ({ fieldId, value }: { fieldId: string; value: string }) => {
      const payload = {
        field_id: fieldId,
        value: value,
      };
      
      let url = `/api/v1/fields/${fieldId}/sign`;
      
      if (signingToken) {
        url += `?token=${signingToken}`;
      }
      
      return api.post(url, payload);
    },
    {
      onSuccess: (response) => {
        queryClient.invalidateQueries(['envelope', envelopeId]);
        Alert.alert('Success', 'Field signed successfully!');
        
        // Check if the envelope is now complete
        if (response.data?.envelopeStatus === 'completed') {
          // Handle envelope completion
          handleEnvelopeCompleted();
        } else {
          // Refresh envelope data to update UI
          loadEnvelopeData();
        }
      },
      onError: (error) => {
        console.error('Error signing field:', error);
        if (isOffline) {
          // Queue for later if offline
          queueSigningOperation(currentFieldId!, signatureValue!);
          Alert.alert(
            'Offline Mode',
            'Your signature has been saved and will be sent when you reconnect to the internet.'
          );
        } else {
          Alert.alert('Error', 'Failed to sign the document. Please try again.');
        }
      },
    }
  );

  // Queue signing operation for offline mode
  const queueSigningOperation = async (fieldId: string, value: string) => {
    try {
      // Get existing queue
      const queueString = await SecureStore.getItemAsync('signingQueue');
      let queue = queueString ? JSON.parse(queueString) : [];
      
      // Add new operation
      queue.push({
        type: 'sign',
        fieldId,
        value,
        envelopeId,
        timestamp: new Date().toISOString(),
      });
      
      // Save queue
      await SecureStore.setItemAsync('signingQueue', JSON.stringify(queue));
    } catch (error) {
      console.error('Error queueing signing operation:', error);
    }
  };

  // Handle field tap from WebView
  const handleFieldTap = (fieldId: string, fieldType: string) => {
    if (fieldType === 'signature') {
      setCurrentFieldId(fieldId);
      
      // Show compliance notice before signature
      if (!complianceAccepted) {
        setShowComplianceDialog(true);
      } else {
        setShowSignaturePad(true);
      }
    }
  };

  // Handle envelope completed event
  const handleEnvelopeCompleted = () => {
    if (!envelope) return;
    
    // Show success message
    Alert.alert(
      'Envelope Completed',
      'All required signatures have been collected. The envelope is now complete!',
      [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back or to envelope details
            navigation.navigate('Main');
          }
        }
      ]
    );
    
    // Send notification
    pushNotificationService.sendEnvelopeCompletedNotification(
      envelope.id,
      envelope.name,
      'You' // Current signer name
    );
  };
  
  // Handle signature submit
  const handleSignatureSubmit = (signatureDataUrl: string) => {
    setSignatureValue(signatureDataUrl);
    setShowSignaturePad(false);
    
    // Sign the field
    if (currentFieldId) {
      signMutation.mutate({
        fieldId: currentFieldId,
        value: signatureDataUrl,
      });
    }
  };

  // Handle compliance acceptance
  const handleComplianceAccept = () => {
    setComplianceAccepted(true);
    setShowComplianceDialog(false);
    setShowSignaturePad(true);
  };

  // Download and share document
  const downloadDocument = async (documentId: string, documentName: string) => {
    if (!envelope) return;
    
    try {
      setDownloadingDocument(true);
      
      const document = envelope.documents.find(doc => doc.id === documentId);
      if (!document) throw new Error('Document not found');
      
      let url = document.url;
      if (signingToken) {
        url += `?token=${signingToken}`;
      }
      
      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        FileSystem.documentDirectory + documentName,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          setDownloadProgress(progress);
        }
      );
      
      const { uri } = await downloadResumable.downloadAsync();
      
      if (uri) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert('Sharing not available', 'Sharing is not available on this device');
        }
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      Alert.alert('Error', 'Failed to download document. Please try again.');
    } finally {
      setDownloadingDocument(false);
      setDownloadProgress(0);
    }
  };

  // Inject JavaScript to handle field interactions
  const injectJavaScript = `
    // Find all signature fields and make them interactive
    document.querySelectorAll('.signature-field').forEach(field => {
      field.addEventListener('click', function() {
        const fieldId = this.getAttribute('data-field-id');
        const fieldType = this.getAttribute('data-field-type');
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'fieldTap',
          fieldId: fieldId,
          fieldType: fieldType
        }));
      });
    });
    true;
  `;

  // Handle messages from WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'fieldTap') {
        handleFieldTap(data.fieldId, data.fieldType);
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  if (loading || isEnvelopeLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DAB44A" />
        <Text style={styles.loadingText}>Loading document...</Text>
      </SafeAreaView>
    );
  }

  if (isOffline && !envelope) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorTitle}>You're offline</Text>
        <Text style={styles.errorText}>
          Please connect to the internet to load this document for signing.
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

  if (envelopeError || !envelope) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Error Loading Document</Text>
        <Text style={styles.errorText}>
          There was a problem loading the document. Please try again later.
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={envelope.name} />
        {envelope.documents.length > 0 && (
          <Appbar.Action 
            icon="download" 
            onPress={() => downloadDocument(
              envelope.documents[0].id,
              envelope.documents[0].name
            )} 
            disabled={downloadingDocument}
          />
        )}
      </Appbar.Header>
      
      {isOffline && (
        <View style={styles.offlineBar}>
          <Text style={styles.offlineText}>You are offline. Some features may be limited.</Text>
        </View>
      )}
      
      {downloadingDocument && (
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
      
      {envelope.documents.length > 0 && (
        <WebView
          ref={webViewRef}
          source={{ 
            uri: `${envelope.documents[0].url}${signingToken ? `?token=${signingToken}` : ''}` 
          }}
          style={styles.webView}
          onLoad={() => webViewRef.current?.injectJavaScript(injectJavaScript)}
          onMessage={handleWebViewMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.webViewLoading}>
              <ActivityIndicator size="large" color="#DAB44A" />
            </View>
          )}
        />
      )}
      
      {/* Signature Pad Dialog */}
      <Portal>
        <Dialog
          visible={showSignaturePad}
          onDismiss={() => setShowSignaturePad(false)}
          style={styles.signatureDialog}
        >
          <Dialog.Title>Add Your Signature</Dialog.Title>
          <Dialog.Content>
            <SignaturePad 
              onSignatureSubmit={handleSignatureSubmit} 
              onCancel={() => setShowSignaturePad(false)} 
            />
          </Dialog.Content>
        </Dialog>
      </Portal>
      
      {/* Compliance Dialog */}
      <Portal>
        <Dialog
          visible={showComplianceDialog}
          onDismiss={() => setShowComplianceDialog(false)}
          style={styles.complianceDialog}
        >
          <Dialog.Title>Compliance Notice</Dialog.Title>
          <Dialog.Content>
            <ComplianceNotice onAccept={handleComplianceAccept} />
          </Dialog.Content>
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
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    width: 200,
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
  offlineBar: {
    backgroundColor: '#F44336',
    padding: 8,
    alignItems: 'center',
  },
  offlineText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
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
  signatureDialog: {
    maxWidth: Platform.OS === 'web' ? 500 : '90%',
  },
  complianceDialog: {
    maxWidth: Platform.OS === 'web' ? 600 : '90%',
  },
});

export default SigningScreen;
