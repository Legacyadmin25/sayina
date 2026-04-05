import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Text, Portal, Dialog, Searchbar, Divider, RadioButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { Language } from '../../services/i18n/translationService';

interface LanguageSelectorProps {
  isVisible: boolean;
  onClose: () => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ isVisible, onClose }) => {
  const { currentLanguage, changeLanguage, t, supportedLanguages } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);

  // Filter languages based on search query
  const filteredLanguages = supportedLanguages.filter(
    (language) =>
      language.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      language.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle language selection
  const handleSelectLanguage = (languageCode: string) => {
    setSelectedLanguage(languageCode);
  };

  // Handle saving language preference
  const handleSaveLanguage = async () => {
    if (selectedLanguage !== currentLanguage) {
      await changeLanguage(selectedLanguage);
    }
    onClose();
  };

  // Render language item
  const renderLanguageItem = ({ item }: { item: Language }) => (
    <TouchableOpacity
      style={[
        styles.languageItem,
        selectedLanguage === item.code && styles.selectedLanguageItem,
      ]}
      onPress={() => handleSelectLanguage(item.code)}
    >
      <View style={styles.languageInfo}>
        <Text style={styles.languageName}>{item.name}</Text>
        <Text style={styles.nativeName}>{item.nativeName}</Text>
      </View>
      <RadioButton
        value={item.code}
        status={selectedLanguage === item.code ? 'checked' : 'unchecked'}
        onPress={() => handleSelectLanguage(item.code)}
        color="#DAB44A"
      />
    </TouchableOpacity>
  );

  return (
    <Portal>
      <Dialog visible={isVisible} onDismiss={onClose} style={styles.dialog}>
        <Dialog.Title>{t('select_language')}</Dialog.Title>
        
        <Dialog.Content>
          <Searchbar
            placeholder={t('search')}
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
            iconColor="#666666"
          />
          
          <Divider style={styles.divider} />
          
          <FlatList
            data={filteredLanguages}
            renderItem={renderLanguageItem}
            keyExtractor={(item) => item.code}
            style={styles.languageList}
            ItemSeparatorComponent={() => <Divider style={styles.itemDivider} />}
          />
        </Dialog.Content>
        
        <Dialog.Actions>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text>{t('cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSaveLanguage} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>{t('save')}</Text>
          </TouchableOpacity>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    maxHeight: '80%',
  },
  searchBar: {
    marginBottom: 12,
    backgroundColor: '#F5F5F5',
    elevation: 0,
    height: 40,
  },
  divider: {
    marginBottom: 8,
  },
  languageList: {
    maxHeight: 300,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  selectedLanguageItem: {
    backgroundColor: 'rgba(218, 180, 74, 0.1)',
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    color: '#333333',
  },
  nativeName: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#EEEEEE',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  saveButtonText: {
    color: '#DAB44A',
    fontWeight: 'bold',
  },
});

export default LanguageSelector;
