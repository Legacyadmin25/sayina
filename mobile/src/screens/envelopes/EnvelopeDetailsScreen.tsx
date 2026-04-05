import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Share, TouchableOpacity, Linking } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Chip, Divider, Menu, IconButton, Portal, Dialog, List } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainStack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import NetInfo from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import api from '../../services/api';

type Props = NativeStackScreenProps<MainStackParamList, 'EnvelopeDetails'>;

interface EnvelopeDetail {
  id: string;
  name: string;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
  expiry_date: string;
  is_owner: boolean;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  documents: {
    id: string;
    name: string;
    pages: number;
    size: number;
    url: string;
  }[];
  signers: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    status: string;
    signed_at?: string;
    order: number;
  }[];
  history: {
    id: string;
    action: string;
    user_name: string;
    timestamp: string;
    ip_address?: string;
    device_info?: string;
  }[];
}

const EnvelopeDetailsScreen = ({ route, navigation }: Props) => {
  const { envelopeId } = route.params;
  const [isOffline, setIsOffline] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadingDocument, setDownloadingDocument] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const queryClient = useQueryClient();

  // Track network status
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  // Fetch envelope details
  const { 
    data: envelope,
    isLoading,
    isError,
    refetch,
  } = useQuery<EnvelopeDetail>(
    ['envelope', envelopeId],
    async () => {
      const response = await api.get(`/api/v1/envelopes/${envelopeId}`);
      return response.data.data;
    },
    {
      enabled: !isOffline,
      retry: 2,
      onError: (error) => {
        console.error('Failed to fetch envelope details:', error);
      },
    }
  );

  // Delete envelope mutation
  const deleteMutation = useMutation(
    async () => {
      return api.delete(`/api/v1/envelopes/${envelopeId}`);
    },
    {
      onSuccess: () => {
        navigation.goBack();
        // Invalidate envelopes query to refresh the list
        queryClient.invalidateQueries('envelopes');
      },
      onError: (error) => {
        console.error('Failed to delete envelope:', error);
        Alert.alert('Error', 'Failed to delete envelope. Please try again.');
      },
    }
  );

  // Void envelope mutation
  const voidMutation = useMutation(
    async (reason: string) => {
      return api.post(`/api/v1/envelopes/${envelopeId}/void`, { reason });
    },
    {
      onSuccess: () => {
        refetch();
        Alert.alert('Success', 'Envelope has been voided.');
      },
      onError: (error) => {
        console.error('Failed to void envelope:', error);
        Alert.alert('Error', 'Failed to void envelope. Please try again.');
      },
    }
  );

  // Send reminder mutation
  const reminderMutation = useMutation(
    async (signerId: string) => {
      return api.post(`/api/v1/envelopes/${envelopeId}/reminder`, { signer_id: signerId });
    },
    {
      onSuccess: () => {
        Alert.alert('Success', 'Reminder sent successfully.');
      },
      onError: (error) => {
        console.error('Failed to send reminder:', error);
        Alert.alert('Error', 'Failed to send reminder. Please try again.');
      },
    }
  );

  // Handle delete envelope
  const handleDeleteEnvelope = () => {
    setShowDeleteDialog(false);
    deleteMutation.mutate();
  };

  // Handle void envelope
  const handleVoidEnvelope = () => {
    setShowVoidDialog(false);
    voidMutation.mutate('Voided from mobile app');
  };

  // Handle send reminder
  const handleSendReminder = (signerId: string) => {
    Alert.alert(
      'Send Reminder',
      'Do you want to send a reminder to this signer?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send',
          onPress: () => reminderMutation.mutate(signerId),
        },
      ]
    );
  };

  // Handle share envelope
  const handleShareEnvelope = async () => {
    if (!envelope) return;

    try {
      const shareUrl = `https://app.sayina.co.za/envelopes/${envelopeId}`;
      await Share.share({
        message: `Please review envelope "${envelope.name}" on Sayina: ${shareUrl}`,
        url: shareUrl,
      });
    } catch (error) {
      console.error('Error sharing envelope:', error);
    }
  };

  // Handle copy link
  const handleCopyLink = async () => {
    try {
      const shareUrl = `https://app.sayina.co.za/envelopes/${envelopeId}`;
      await Clipboard.setStringAsync(shareUrl);
      Alert.alert('Success', 'Link copied to clipboard');
    } catch (error) {
      console.error('Error copying link:', error);
    }
  };

  // Download and share document
  const downloadDocument = async (documentId: string, documentName: string) => {
    if (!envelope) return;
    
    try {
      setDownloadingDocument(true);
      
      const document = envelope.documents.find(doc => doc.id === documentId);
      if (!document) throw new Error('Document not found');
      
      const downloadResumable = FileSystem.createDownloadResumable(
        document.url,
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

  // Format date
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return '#9E9E9E';
      case 'sent':
        return '#2196F3';
      case 'in_progress':
        return '#FF9800';
      case 'completed':
        return '#4CAF50';
      case 'expired':
        return '#F44336';
      case 'declined':
        return '#D32F2F';
      case 'voided':
        return '#795548';
      default:
        return '#9E9E9E';
    }
  };

  // Format status for display
  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Get file size display
  const getFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Navigation options
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <IconButton
          icon="dots-vertical"
          size={24}
          onPress={() => setMenuVisible(true)}
        />
      ),
      title: envelope?.name || 'Envelope Details',
    });
  }, [navigation, envelope]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DAB44A" />
        <Text style={styles.loadingText}>Loading envelope details...</Text>
      </SafeAreaView>
    );
  }

  if (isError || !envelope) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
        <Text style={styles.errorTitle}>Error Loading Envelope</Text>
        <Text style={styles.errorText}>
          There was a problem loading this envelope. Please try again.
        </Text>
        <Button 
          mode="contained"
          onPress={() => refetch()}
          style={styles.button}
        >
          Retry
        </Button>
        <Button 
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={[styles.button, styles.cancelButton]}
        >
          Go Back
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Options Menu */}
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={{ x: 0, y: 0 }}
        style={styles.menu}
      >
        <Menu.Item
          onPress={() => {
            setMenuVisible(false);
            handleShareEnvelope();
          }}
          title="Share Envelope"
          leadingIcon="share-variant"
        />
        <Menu.Item
          onPress={() => {
            setMenuVisible(false);
            handleCopyLink();
          }}
          title="Copy Link"
          leadingIcon="content-copy"
        />
        <Menu.Item
          onPress={() => {
            setMenuVisible(false);
            setShowHistoryDialog(true);
          }}
          title="View Audit Trail"
          leadingIcon="history"
        />
        {envelope.is_owner && envelope.status !== 'completed' && envelope.status !== 'voided' && (
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              setShowVoidDialog(true);
            }}
            title="Void Envelope"
            leadingIcon="cancel"
          />
        )}
        {envelope.is_owner && envelope.status === 'draft' && (
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              setShowDeleteDialog(true);
            }}
            title="Delete Envelope"
            leadingIcon="delete"
            titleStyle={{ color: '#F44336' }}
          />
        )}
      </Menu>

      {/* Download Progress */}
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Status Bar */}
        <View style={styles.statusContainer}>
          <Chip
            mode="flat"
            textStyle={{ color: '#FFF', fontWeight: 'bold' }}
            style={[styles.statusChip, { backgroundColor: getStatusColor(envelope.status) }]}
          >
            {formatStatus(envelope.status)}
          </Chip>
          <Text style={styles.dateText}>
            Updated: {formatDate(envelope.updated_at)}
          </Text>
        </View>

        {/* Envelope Details */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Envelope Details
            </Text>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Owner:</Text>
              <Text style={styles.detailValue}>{envelope.owner.name}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Created:</Text>
              <Text style={styles.detailValue}>{formatDate(envelope.created_at)}</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Expires:</Text>
              <Text style={styles.detailValue}>{formatDate(envelope.expiry_date)}</Text>
            </View>
            
            {envelope.message && (
              <View style={styles.messageContainer}>
                <Text style={styles.messageLabel}>Message to Signers:</Text>
                <Text style={styles.messageText}>{envelope.message}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Documents */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Documents ({envelope.documents.length})
            </Text>
            
            {envelope.documents.map((document) => (
              <TouchableOpacity
                key={document.id}
                style={styles.documentItem}
                onPress={() => downloadDocument(document.id, document.name)}
                disabled={downloadingDocument}
              >
                <View style={styles.documentIcon}>
                  <Ionicons name="document" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentName} numberOfLines={1}>
                    {document.name}
                  </Text>
                  <Text style={styles.documentMeta}>
                    {document.pages} page{document.pages !== 1 ? 's' : ''} • {getFileSize(document.size)}
                  </Text>
                </View>
                <IconButton
                  icon="download"
                  size={20}
                  onPress={() => downloadDocument(document.id, document.name)}
                  disabled={downloadingDocument}
                />
              </TouchableOpacity>
            ))}
          </Card.Content>
        </Card>

        {/* Signers */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Signers ({envelope.signers.length})
            </Text>
            
            {envelope.signers.map((signer) => (
              <View key={signer.id} style={styles.signerItem}>
                <View style={styles.signerMain}>
                  <View style={[styles.signerStatus, { backgroundColor: getStatusColor(signer.status) }]}>
                    <Text style={styles.signerOrder}>{signer.order}</Text>
                  </View>
                  <View style={styles.signerInfo}>
                    <Text style={styles.signerName}>{signer.name}</Text>
                    <Text style={styles.signerEmail}>{signer.email}</Text>
                    <View style={styles.signerMeta}>
                      <Chip style={styles.roleChip} textStyle={styles.roleText}>
                        {signer.role}
                      </Chip>
                      {signer.status === 'completed' && (
                        <Text style={styles.signedDate}>
                          Signed: {formatDate(signer.signed_at)}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
                
                {envelope.is_owner && signer.status !== 'completed' && envelope.status === 'sent' && (
                  <Button
                    mode="text"
                    compact
                    onPress={() => handleSendReminder(signer.id)}
                    icon="bell"
                  >
                    Remind
                  </Button>
                )}
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {envelope.status === 'sent' && (
            <Button
              mode="contained"
              icon="eye"
              onPress={() => {
                navigation.navigate('Signing', { envelopeId: envelope.id });
              }}
              style={styles.actionButton}
            >
              View & Sign
            </Button>
          )}
          
          {envelope.status === 'completed' && (
            <Button
              mode="contained"
              icon="download"
              onPress={() => {
                if (envelope.documents.length > 0) {
                  downloadDocument(envelope.documents[0].id, envelope.documents[0].name);
                }
              }}
              style={styles.actionButton}
              loading={downloadingDocument}
              disabled={downloadingDocument}
            >
              Download
            </Button>
          )}
          
          <Button
            mode="outlined"
            icon="share-variant"
            onPress={handleShareEnvelope}
            style={styles.actionButton}
          >
            Share
          </Button>
        </View>
      </ScrollView>

      {/* Delete Dialog */}
      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Delete Envelope</Dialog.Title>
          <Dialog.Content>
            <Text>
              Are you sure you want to delete this envelope? This action cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button onPress={handleDeleteEnvelope} textColor="#F44336">Delete</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Void Dialog */}
      <Portal>
        <Dialog visible={showVoidDialog} onDismiss={() => setShowVoidDialog(false)}>
          <Dialog.Title>Void Envelope</Dialog.Title>
          <Dialog.Content>
            <Text>
              Are you sure you want to void this envelope? This will cancel the signing process and notify all signers.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowVoidDialog(false)}>Cancel</Button>
            <Button onPress={handleVoidEnvelope} textColor="#F44336">Void</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* History Dialog */}
      <Portal>
        <Dialog visible={showHistoryDialog} onDismiss={() => setShowHistoryDialog(false)} style={styles.historyDialog}>
          <Dialog.Title>Audit Trail</Dialog.Title>
          <Dialog.ScrollArea style={styles.historyScrollArea}>
            <ScrollView>
              {envelope.history.map((event, index) => (
                <List.Item
                  key={event.id || index}
                  title={event.action}
                  description={`${event.user_name} • ${formatDate(event.timestamp)}`}
                  left={props => <List.Icon {...props} icon="history" />}
                  descriptionNumberOfLines={2}
                />
              ))}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowHistoryDialog(false)}>Close</Button>
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
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#757575',
  },
  menu: {
    marginTop: 40,
    marginRight: 16,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusChip: {
    height: 28,
  },
  dateText: {
    color: '#757575',
    fontSize: 12,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: 'bold',
    width: 80,
  },
  detailValue: {
    flex: 1,
  },
  messageContainer: {
    marginTop: 12,
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 4,
  },
  messageLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  messageText: {
    fontStyle: 'italic',
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 8,
  },
  documentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DAB44A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  documentMeta: {
    color: '#757575',
    fontSize: 12,
  },
  signerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
  },
  signerMain: {
    flexDirection: 'row',
    flex: 1,
  },
  signerStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#BDBDBD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  signerOrder: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  signerInfo: {
    flex: 1,
  },
  signerName: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  signerEmail: {
    color: '#757575',
    fontSize: 12,
  },
  signerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  roleChip: {
    height: 24,
    backgroundColor: '#EEEEEE',
  },
  roleText: {
    fontSize: 10,
  },
  signedDate: {
    fontSize: 10,
    color: '#4CAF50',
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  button: {
    width: 200,
    marginVertical: 8,
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  historyDialog: {
    maxHeight: '80%',
  },
  historyScrollArea: {
    maxHeight: 400,
  },
});

export default EnvelopeDetailsScreen;
