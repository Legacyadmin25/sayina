import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { 
  Text, 
  Button, 
  TextInput,
  Appbar,
  Card,
  Chip
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation';
import { useTranslation } from '../../hooks/useTranslation';
import api from '../../services/api';

type EnvelopeCreateScreenRouteProp = RouteProp<RootStackParamList, 'EnvelopeCreate'>;

const EnvelopeCreateScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<EnvelopeCreateScreenRouteProp>();
  
  const { templateId } = route.params || { templateId: undefined };
  
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(!!templateId);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [signerEmail, setSignerEmail] = useState('');
  const [templateData, setTemplateData] = useState<any>(null);
  
  // Load template data if templateId is provided
  useEffect(() => {
    if (templateId) {
      loadTemplateData();
    }
  }, [templateId]);
  
  const loadTemplateData = async () => {
    try {
      setLoadingTemplate(true);
      const response = await api.get(`/api/v1/templates/${templateId}`);
      
      setTemplateData(response.data);
      
      // Pre-fill fields from template
      setTitle(response.data.title || '');
      setMessage(response.data.message || '');
      
      // Set selected documents from template
      if (response.data.documents && response.data.documents.length > 0) {
        setSelectedDocuments(response.data.documents.map((doc: any) => doc.id));
      }
      
    } catch (error) {
      Alert.alert(
        t('error', 'Error'),
        t('template_load_error', 'Failed to load template. Please try again.')
      );
      console.error('Error loading template:', error);
    } finally {
      setLoadingTemplate(false);
    }
  };
  
  const handleCreateEnvelope = async () => {
    if (!title.trim()) {
      Alert.alert(
        t('error', 'Error'),
        t('title_required', 'Please enter an envelope title')
      );
      return;
    }
    
    if (selectedDocuments.length === 0) {
      Alert.alert(
        t('error', 'Error'),
        t('documents_required', 'Please select at least one document')
      );
      return;
    }
    
    if (!signerEmail.trim()) {
      Alert.alert(
        t('error', 'Error'),
        t('signer_required', 'Please enter a signer email')
      );
      return;
    }
    
    try {
      setLoading(true);
      
      const payload = {
        title,
        message,
        documents: selectedDocuments,
        signers: [{ email: signerEmail, role: 'signer' }],
        templateId: templateId || undefined
      };
      
      const response = await api.post('/api/v1/envelopes', payload);
      
      Alert.alert(
        t('success', 'Success'),
        t('envelope_created', 'Envelope created successfully'),
        [
          { 
            text: t('continue', 'Continue'), 
            onPress: () => {
              navigation.navigate('EnvelopeDetails', { 
                envelopeId: response.data.id 
              });
            }
          }
        ]
      );
      
    } catch (error) {
      Alert.alert(
        t('error', 'Error'),
        t('envelope_create_error', 'Failed to create envelope. Please try again.')
      );
      console.error('Error creating envelope:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddDocument = () => {
    // This would typically open a document picker or list
    // For simplicity, we're just showing an alert
    Alert.alert(
      t('document_selection', 'Document Selection'),
      t('document_selection_not_implemented', 'Document selection is not implemented in this demo')
    );
  };
  
  if (loadingTemplate) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DAB44A" />
        <Text style={styles.loadingText}>
          {t('loading_template', 'Loading template...')}
        </Text>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={templateId 
          ? t('create_from_template', 'Create from Template') 
          : t('create_envelope', 'Create Envelope')} 
        />
      </Appbar.Header>
      
      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Title title={t('envelope_details', 'Envelope Details')} />
          <Card.Content>
            <TextInput
              label={t('title', 'Title')}
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              mode="outlined"
            />
            
            <TextInput
              label={t('message', 'Message (Optional)')}
              value={message}
              onChangeText={setMessage}
              style={styles.input}
              multiline
              numberOfLines={3}
              mode="outlined"
            />
          </Card.Content>
        </Card>
        
        <Card style={styles.card}>
          <Card.Title title={t('documents', 'Documents')} />
          <Card.Content>
            {selectedDocuments.length > 0 ? (
              <View style={styles.documentsContainer}>
                {selectedDocuments.map((docId, index) => (
                  <Chip 
                    key={docId} 
                    style={styles.documentChip}
                    onClose={() => {
                      const newDocs = [...selectedDocuments];
                      newDocs.splice(index, 1);
                      setSelectedDocuments(newDocs);
                    }}
                  >
                    {`Document ${index + 1}`}
                  </Chip>
                ))}
              </View>
            ) : (
              <Text style={styles.noDocumentsText}>
                {t('no_documents', 'No documents selected')}
              </Text>
            )}
            
            <Button 
              mode="outlined" 
              onPress={handleAddDocument}
              style={styles.addButton}
            >
              {t('add_document', 'Add Document')}
            </Button>
          </Card.Content>
        </Card>
        
        <Card style={styles.card}>
          <Card.Title title={t('signers', 'Signers')} />
          <Card.Content>
            <TextInput
              label={t('signer_email', 'Signer Email')}
              value={signerEmail}
              onChangeText={setSignerEmail}
              keyboardType="email-address"
              style={styles.input}
              mode="outlined"
            />
          </Card.Content>
        </Card>
        
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleCreateEnvelope}
            style={styles.createButton}
            loading={loading}
            disabled={loading}
          >
            {t('create_envelope', 'Create Envelope')}
          </Button>
        </View>
      </ScrollView>
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
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  documentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  documentChip: {
    margin: 4,
  },
  noDocumentsText: {
    marginBottom: 16,
    fontStyle: 'italic',
    color: '#777777',
  },
  addButton: {
    marginBottom: 8,
  },
  buttonContainer: {
    marginVertical: 24,
    alignItems: 'center',
  },
  createButton: {
    width: '80%',
    paddingVertical: 8,
    backgroundColor: '#DAB44A',
  },
});

export default EnvelopeCreateScreen;
