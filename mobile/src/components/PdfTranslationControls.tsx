import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PdfTranslationService, { 
  TranslationLanguage,
  TranslationStatus,
  LanguageNames
} from '../services/pdfTranslationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PdfTranslationControlsProps {
  pdfUrl: string;
  onTranslationComplete: (translatedUrl: string) => void;
  onResetToOriginal: () => void;
}

const PdfTranslationControls: React.FC<PdfTranslationControlsProps> = ({
  pdfUrl,
  onTranslationComplete,
  onResetToOriginal
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<TranslationLanguage | null>(null);
  const [preferredLanguage, setPreferredLanguage] = useState<TranslationLanguage>(TranslationLanguage.ENGLISH);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [translationStatus, setTranslationStatus] = useState<TranslationStatus>(TranslationStatus.IDLE);
  const [isTranslated, setIsTranslated] = useState(false);
  
  const translationService = PdfTranslationService.getInstance();
  
  // Get available languages for the dropdown
  const availableLanguages = Object.values(TranslationLanguage);
  
  // Load preferred language from storage
  useEffect(() => {
    const loadPreferredLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('PREFERRED_TRANSLATION_LANGUAGE');
        if (savedLanguage && Object.values(TranslationLanguage).includes(savedLanguage as TranslationLanguage)) {
          setPreferredLanguage(savedLanguage as TranslationLanguage);
        }
      } catch (error) {
        console.error('Error loading preferred language:', error);
      }
    };
    
    loadPreferredLanguage();
  }, []);
  
  // Save preferred language when it changes
  useEffect(() => {
    const savePreferredLanguage = async () => {
      try {
        await AsyncStorage.setItem('PREFERRED_TRANSLATION_LANGUAGE', preferredLanguage);
      } catch (error) {
        console.error('Error saving preferred language:', error);
      }
    };
    
    if (preferredLanguage) {
      savePreferredLanguage();
    }
  }, [preferredLanguage]);
  
  // Start translation process
  const handleTranslate = async (language: TranslationLanguage) => {
    if (!pdfUrl) return;
    
    try {
      setSelectedLanguage(language);
      setPreferredLanguage(language);
      setTranslationStatus(TranslationStatus.TRANSLATING);
      setModalVisible(false);
      
      const translatedUrl = await translationService.translatePdf(
        pdfUrl,
        language,
        (progress) => setTranslationProgress(progress)
      );
      
      setTranslationStatus(TranslationStatus.COMPLETED);
      setIsTranslated(true);
      onTranslationComplete(translatedUrl);
    } catch (error) {
      console.error('Translation error:', error);
      setTranslationStatus(TranslationStatus.FAILED);
    }
  };
  
  // Reset to original PDF
  const handleResetToOriginal = () => {
    setIsTranslated(false);
    setTranslationStatus(TranslationStatus.IDLE);
    setTranslationProgress(0);
    onResetToOriginal();
  };
  
  // Render language selection item
  const renderLanguageItem = ({ item }: { item: TranslationLanguage }) => (
    <TouchableOpacity
      style={[
        styles.languageItem,
        selectedLanguage === item && styles.selectedLanguageItem
      ]}
      onPress={() => handleTranslate(item)}
    >
      <Text style={[
        styles.languageName,
        selectedLanguage === item && styles.selectedLanguageText
      ]}>
        {LanguageNames[item]}
      </Text>
      {selectedLanguage === item && (
        <Ionicons name="checkmark" size={18} color="#DAB44A" />
      )}
    </TouchableOpacity>
  );
  
  return (
    <View style={styles.container}>
      {/* Translation Controls */}
      <View style={styles.controls}>
        {translationStatus === TranslationStatus.TRANSLATING ? (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color="#DAB44A" />
            <Text style={styles.progressText}>
              Translating... {Math.round(translationProgress * 100)}%
            </Text>
          </View>
        ) : isTranslated ? (
          <TouchableOpacity
            style={styles.button}
            onPress={handleResetToOriginal}
          >
            <Ionicons name="refresh" size={20} color="#DAB44A" />
            <Text style={styles.buttonText}>View Original</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="language" size={20} color="#DAB44A" />
            <Text style={styles.buttonText}>Translate</Text>
          </TouchableOpacity>
        )}
        
        {translationStatus === TranslationStatus.FAILED && (
          <Text style={styles.errorText}>Translation failed. Try again.</Text>
        )}
      </View>
      
      {/* Language Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={availableLanguages}
              renderItem={renderLanguageItem}
              keyExtractor={(item) => item}
              style={styles.languageList}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DAB44A',
  },
  buttonText: {
    marginLeft: 6,
    color: '#333',
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    marginLeft: 8,
    color: '#333',
  },
  errorText: {
    color: 'red',
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  languageList: {
    paddingHorizontal: 15,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  selectedLanguageItem: {
    backgroundColor: 'rgba(218, 180, 74, 0.1)',
  },
  languageName: {
    fontSize: 16,
    color: '#333',
  },
  selectedLanguageText: {
    fontWeight: 'bold',
    color: '#DAB44A',
  },
});

export default PdfTranslationControls;
