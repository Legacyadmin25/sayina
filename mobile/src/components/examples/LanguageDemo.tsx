import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button, Divider } from 'react-native-paper';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Component to demonstrate multilingual support in the Sayina app
 */
const LanguageDemo = () => {
  const { currentLanguage, changeLanguage, t, supportedLanguages } = useLanguage();

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge">{t('multilingual_support')}</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            {t('current_language')}: {supportedLanguages.find(lang => lang.code === currentLanguage)?.name}
          </Text>
          
          <Divider style={styles.divider} />
          
          <Text variant="titleMedium">{t('app_name')}</Text>
          <Text variant="bodyMedium" style={styles.description}>
            {t('tagline')}
          </Text>
          
          <View style={styles.demoSection}>
            <Text variant="titleMedium">{t('common_actions')}</Text>
            <View style={styles.buttonsRow}>
              <Button mode="contained" style={styles.button} onPress={() => {}}>
                {t('sign_document')}
              </Button>
              <Button mode="outlined" style={styles.button} onPress={() => {}}>
                {t('cancel')}
              </Button>
            </View>
          </View>
          
          <View style={styles.demoSection}>
            <Text variant="titleMedium">{t('authentication')}</Text>
            <View style={styles.formDemo}>
              <Text>{t('email')}</Text>
              <Text>{t('password')}</Text>
              <View style={styles.buttonsRow}>
                <Button mode="contained" style={styles.button} onPress={() => {}}>
                  {t('login')}
                </Button>
                <Button mode="text" style={styles.button} onPress={() => {}}>
                  {t('forgot_password')}
                </Button>
              </View>
            </View>
          </View>
          
          <View style={styles.demoSection}>
            <Text variant="titleMedium">{t('select_language')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.languageScroll}>
              {supportedLanguages.map(language => (
                <Button
                  key={language.code}
                  mode={currentLanguage === language.code ? 'contained' : 'outlined'}
                  style={styles.languageButton}
                  onPress={() => changeLanguage(language.code)}
                >
                  {language.name}
                </Button>
              ))}
            </ScrollView>
          </View>
          
          <View style={styles.demoSection}>
            <Text variant="titleMedium">{t('notifications')}</Text>
            <Card style={styles.notificationCard}>
              <Card.Content>
                <Text variant="titleSmall">{t('document_ready')}</Text>
                <Text variant="bodySmall">{t('document_ready_message')}</Text>
              </Card.Content>
            </Card>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  subtitle: {
    marginTop: 8,
    color: '#666',
  },
  divider: {
    marginVertical: 16,
  },
  description: {
    marginTop: 8,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  demoSection: {
    marginTop: 16,
  },
  buttonsRow: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'flex-start',
  },
  button: {
    marginRight: 8,
    marginTop: 8,
  },
  formDemo: {
    marginTop: 8,
  },
  languageScroll: {
    marginTop: 8,
  },
  languageButton: {
    marginRight: 8,
  },
  notificationCard: {
    marginTop: 8,
    backgroundColor: '#f0f8ff',
  },
});

export default LanguageDemo;
