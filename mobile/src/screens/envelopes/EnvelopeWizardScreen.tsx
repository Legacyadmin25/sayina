import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { Text, Button, TextInput, ProgressBar, FAB, Chip, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainStack';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { theme, spacing } from '../../constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useMutation } from 'react-query';
import api from '../../services/api';

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'EnvelopeWizard'>;

type WizardStep = 'details' | 'documents' | 'signers' | 'fields' | 'review';

interface Signer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  order: number;
}

interface Document {
  uri: string;
  name: string;
  type: string;
  size: number;
}

const EnvelopeWizardScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [currentStep, setCurrentStep] = useState<WizardStep>('details');
  const [loading, setLoading] = useState(false);
  
  // Form data
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [expiryDays, setExpiryDays] = useState('14');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [signers, setSigners] = useState<Signer[]>([]);
  
  // Form fields for adding signers
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerPhone, setSignerPhone] = useState('');
  const [signerRole, setSignerRole] = useState('signer');

  // Create envelope mutation
  const createEnvelopeMutation = useMutation(
    async (data: FormData) => {
      const response = await api.post('/api/v1/envelopes', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        Alert.alert(
          'Success',
          'Envelope created successfully!',
          [
            {
              text: 'View Envelope',
              onPress: () => navigation.replace('EnvelopeDetails', { envelopeId: data.data.id }),
            },
            {
              text: 'Back to Envelopes',
              onPress: () => navigation.navigate('MainTabs'),
            },
          ]
        );
      },
      onError: (error) => {
        Alert.alert('Error', 'Failed to create envelope. Please try again.');
        console.error('Error creating envelope:', error);
      },
    }
  );

  const getStepProgress = () => {
    const steps = ['details', 'documents', 'signers', 'fields', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    return (currentIndex + 1) / steps.length;
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'details':
        return 'Envelope Details';
      case 'documents':
        return 'Add Documents';
      case 'signers':
        return 'Add Signers';
      case 'fields':
        return 'Add Fields';
      case 'review':
        return 'Review & Send';
      default:
        return 'Envelope Wizard';
    }
  };

  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newDocuments = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/pdf',
          size: asset.size || 0,
        }));

        setDocuments([...documents, ...newDocuments]);
      }
    } catch (error) {
      console.error('Error picking documents:', error);
      Alert.alert('Error', 'Failed to pick documents. Please try again.');
    }
  };

  const removeDocument = (index: number) => {
    const newDocuments = [...documents];
    newDocuments.splice(index, 1);
    setDocuments(newDocuments);
  };

  const addSigner = () => {
    if (!signerName || !signerEmail) {
      Alert.alert('Error', 'Name and email are required for signers.');
      return;
    }

    const newSigner: Signer = {
      id: Date.now().toString(),
      name: signerName,
      email: signerEmail,
      phone: signerPhone,
      role: signerRole,
      order: signers.length + 1,
    };

    setSigners([...signers, newSigner]);
    
    // Clear form
    setSignerName('');
    setSignerEmail('');
    setSignerPhone('');
    setSignerRole('signer');
  };

  const removeSigner = (id: string) => {
    const newSigners = signers.filter(signer => signer.id !== id);
    // Reorder remaining signers
    const reorderedSigners = newSigners.map((signer, index) => ({
      ...signer,
      order: index + 1,
    }));
    setSigners(reorderedSigners);
  };

  const nextStep = () => {
    switch (currentStep) {
      case 'details':
        if (!name) {
          Alert.alert('Error', 'Envelope name is required.');
          return;
        }
        setCurrentStep('documents');
        break;
      case 'documents':
        if (documents.length === 0) {
          Alert.alert('Error', 'At least one document is required.');
          return;
        }
        setCurrentStep('signers');
        break;
      case 'signers':
        if (signers.length === 0) {
          Alert.alert('Error', 'At least one signer is required.');
          return;
        }
        setCurrentStep('fields');
        break;
      case 'fields':
        setCurrentStep('review');
        break;
      case 'review':
        handleCreateEnvelope();
        break;
    }
  };

  const prevStep = () => {
    switch (currentStep) {
      case 'documents':
        setCurrentStep('details');
        break;
      case 'signers':
        setCurrentStep('documents');
        break;
      case 'fields':
        setCurrentStep('signers');
        break;
      case 'review':
        setCurrentStep('fields');
        break;
    }
  };

  const handleCreateEnvelope = async () => {
    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('name', name);
      formData.append('message', message);
      formData.append('expiry_days', expiryDays);

      // Add documents
      documents.forEach((doc, index) => {
        formData.append('documents', {
          uri: doc.uri,
          name: doc.name,
          type: doc.type,
        } as any);
      });

      // Add signers
      formData.append('signers', JSON.stringify(signers));

      // Submit envelope
      createEnvelopeMutation.mutate(formData);
    } catch (error) {
      console.error('Error creating envelope:', error);
      Alert.alert('Error', 'Failed to create envelope. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'details':
        return renderDetailsStep();
      case 'documents':
        return renderDocumentsStep();
      case 'signers':
        return renderSignersStep();
      case 'fields':
        return renderFieldsStep();
      case 'review':
        return renderReviewStep();
      default:
        return null;
    }
  };

  const renderDetailsStep = () => (
    <View style={styles.stepContainer}>
      <TextInput
        label="Envelope Name"
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="Message to Signers (Optional)"
        value={message}
        onChangeText={setMessage}
        mode="outlined"
        multiline
        numberOfLines={4}
        style={styles.input}
      />
      <TextInput
        label="Expiry Days"
        value={expiryDays}
        onChangeText={setExpiryDays}
        mode="outlined"
        keyboardType="number-pad"
        style={styles.input}
      />
    </View>
  );

  const renderDocumentsStep = () => (
    <View style={styles.stepContainer}>
      <Button
        mode="contained"
        onPress={pickDocuments}
        icon={({ color }) => <Ionicons name="document-attach" size={20} color={color} />}
        style={styles.button}
      >
        Add Documents
      </Button>

      {documents.length > 0 ? (
        <View style={styles.documentsContainer}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Documents ({documents.length})
          </Text>
          {documents.map((doc, index) => (
            <View key={index} style={styles.documentItem}>
              <View style={styles.documentInfo}>
                <Ionicons name="document" size={24} color={theme.colors.primary} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text variant="bodyMedium" numberOfLines={1} style={{ fontWeight: 'bold' }}>
                    {doc.name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.secondary }}>
                    {(doc.size / 1024).toFixed(1)} KB
                  </Text>
                </View>
              </View>
              <Button
                icon="close"
                mode="text"
                onPress={() => removeDocument(index)}
                compact
              />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-outline" size={48} color={theme.colors.secondary} />
          <Text style={styles.emptyText}>No documents added yet</Text>
        </View>
      )}
    </View>
  );

  const renderSignersStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.addSignerForm}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Add Signer
        </Text>
        <TextInput
          label="Name"
          value={signerName}
          onChangeText={setSignerName}
          mode="outlined"
          style={styles.input}
        />
        <TextInput
          label="Email"
          value={signerEmail}
          onChangeText={setSignerEmail}
          mode="outlined"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          label="Phone (Optional)"
          value={signerPhone}
          onChangeText={setSignerPhone}
          mode="outlined"
          keyboardType="phone-pad"
          style={styles.input}
        />
        <View style={styles.roleContainer}>
          <Text variant="bodyMedium">Role:</Text>
          <View style={styles.roleChips}>
            <Chip
              selected={signerRole === 'signer'}
              onPress={() => setSignerRole('signer')}
              style={styles.roleChip}
            >
              Signer
            </Chip>
            <Chip
              selected={signerRole === 'approver'}
              onPress={() => setSignerRole('approver')}
              style={styles.roleChip}
            >
              Approver
            </Chip>
            <Chip
              selected={signerRole === 'viewer'}
              onPress={() => setSignerRole('viewer')}
              style={styles.roleChip}
            >
              Viewer
            </Chip>
          </View>
        </View>
        <Button
          mode="contained"
          onPress={addSigner}
          icon="plus"
          style={[styles.button, { marginTop: 16 }]}
        >
          Add Signer
        </Button>
      </View>

      <Divider style={{ marginVertical: 16 }} />

      {signers.length > 0 ? (
        <View style={styles.signersContainer}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Signers ({signers.length})
          </Text>
          {signers.map((signer) => (
            <View key={signer.id} style={styles.signerItem}>
              <View style={styles.signerInfo}>
                <View style={styles.signerOrder}>
                  <Text style={styles.signerOrderText}>{signer.order}</Text>
                </View>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>
                    {signer.name}
                  </Text>
                  <Text variant="bodySmall">{signer.email}</Text>
                  <Chip
                    selected
                    selectedColor={theme.colors.primary}
                    style={styles.roleIndicator}
                  >
                    {signer.role}
                  </Chip>
                </View>
              </View>
              <Button
                icon="close"
                mode="text"
                onPress={() => removeSigner(signer.id)}
                compact
              />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color={theme.colors.secondary} />
          <Text style={styles.emptyText}>No signers added yet</Text>
        </View>
      )}
    </View>
  );

  const renderFieldsStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.fieldStepMessage}>
        <Ionicons name="information-circle" size={36} color={theme.colors.primary} />
        <Text variant="bodyLarge" style={styles.fieldStepText}>
          Fields will be auto-detected based on document content. You can also add and position fields directly on mobile.
        </Text>
        <Image
          source={require('../../../assets/field-example.png')}
          style={styles.fieldExampleImage}
          resizeMode="contain"
        />
      </View>
    </View>
  );

  const renderReviewStep = () => (
    <View style={styles.stepContainer}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Envelope Summary
      </Text>
      
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Name:</Text>
        <Text style={styles.summaryValue}>{name}</Text>
      </View>
      
      {message ? (
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Message:</Text>
          <Text style={styles.summaryValue}>{message}</Text>
        </View>
      ) : null}
      
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Expiry:</Text>
        <Text style={styles.summaryValue}>{expiryDays} days</Text>
      </View>
      
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Documents:</Text>
        <Text style={styles.summaryValue}>{documents.length}</Text>
      </View>
      
      <View style={styles.summaryItem}>
        <Text style={styles.summaryLabel}>Signers:</Text>
        <Text style={styles.summaryValue}>{signers.length}</Text>
      </View>
      
      <Divider style={{ marginVertical: 16 }} />
      
      <Text style={styles.reviewNote}>
        Once you create this envelope, you'll be able to review the fields before sending to signers.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Button
          icon="arrow-left"
          mode="text"
          onPress={() => navigation.goBack()}
          labelStyle={{ fontSize: 16 }}
        >
          Cancel
        </Button>
        <Text variant="titleLarge" style={styles.headerTitle}>
          {getStepTitle()}
        </Text>
        <View style={{ width: 80 }} />
      </View>
      
      <ProgressBar
        progress={getStepProgress()}
        color={theme.colors.primary}
        style={styles.progressBar}
      />
      
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {renderStepContent()}
      </KeyboardAwareScrollView>
      
      <View style={styles.footer}>
        {currentStep !== 'details' && (
          <Button
            mode="outlined"
            onPress={prevStep}
            style={styles.footerButton}
            disabled={loading}
          >
            Back
          </Button>
        )}
        <Button
          mode="contained"
          onPress={nextStep}
          style={[styles.footerButton, styles.primaryButton]}
          loading={loading}
          disabled={loading}
        >
          {currentStep === 'review' ? 'Create Envelope' : 'Next'}
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  stepContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginVertical: 8,
  },
  documentsContainer: {
    marginTop: 16,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 8,
    color: theme.colors.secondary,
  },
  addSignerForm: {
    marginBottom: 16,
  },
  signersContainer: {
    marginTop: 8,
  },
  signerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  signerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  signerOrder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signerOrderText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  roleContainer: {
    marginBottom: 16,
  },
  roleChips: {
    flexDirection: 'row',
    marginTop: 8,
  },
  roleChip: {
    marginRight: 8,
  },
  roleIndicator: {
    marginTop: 4,
    height: 24,
    alignSelf: 'flex-start',
  },
  fieldStepMessage: {
    alignItems: 'center',
    padding: 16,
  },
  fieldStepText: {
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  fieldExampleImage: {
    width: '100%',
    height: 200,
    marginTop: 16,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  summaryItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  summaryLabel: {
    fontWeight: 'bold',
    width: 100,
  },
  summaryValue: {
    flex: 1,
  },
  reviewNote: {
    fontStyle: 'italic',
    color: theme.colors.secondary,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
});

export default EnvelopeWizardScreen;
