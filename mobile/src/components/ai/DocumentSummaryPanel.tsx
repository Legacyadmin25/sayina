import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Card, Chip, Button, Divider, Portal, Dialog, IconButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from 'react-query';
import aiService, { DocumentSummary } from '../../services/ai/aiService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface DocumentSummaryPanelProps {
  documentId: string;
  visible: boolean;
  onClose: () => void;
}

const DocumentSummaryPanel: React.FC<DocumentSummaryPanelProps> = ({
  documentId,
  visible,
  onClose,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // Fetch document summary
  const {
    data: summary,
    isLoading,
    isError,
    refetch,
  } = useQuery<DocumentSummary>(
    ['documentSummary', documentId, selectedLanguage],
    () => aiService.getDocumentSummary(documentId, false, selectedLanguage),
    {
      enabled: visible,
      staleTime: 1000 * 60 * 60, // 1 hour
      retry: 1,
      onError: (error) => {
        console.error('Error fetching document summary:', error);
      },
    }
  );

  // Refresh summary when language changes
  useEffect(() => {
    if (visible) {
      refetch();
    }
  }, [selectedLanguage, visible]);

  // Handle refresh
  const handleRefresh = () => {
    queryClient.invalidateQueries(['documentSummary', documentId, selectedLanguage]);
  };

  // Handle language change
  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    setShowLanguageDialog(false);
  };

  // Get language name from code
  const getLanguageName = (code: string) => {
    const languages: Record<string, string> = {
      en: 'English',
      fr: 'Français',
      es: 'Español',
      de: 'Deutsch',
      pt: 'Português',
      af: 'Afrikaans',
    };
    return languages[code] || code;
  };

  // Render language dialog
  const renderLanguageDialog = () => (
    <Portal>
      <Dialog visible={showLanguageDialog} onDismiss={() => setShowLanguageDialog(false)}>
        <Dialog.Title>Select Summary Language</Dialog.Title>
        <Dialog.Content>
          <ScrollView style={styles.languageScrollView}>
            {['en', 'fr', 'es', 'de', 'pt', 'af'].map((code) => (
              <TouchableOpacity
                key={code}
                style={[
                  styles.languageOption,
                  selectedLanguage === code && styles.selectedLanguageOption,
                ]}
                onPress={() => handleLanguageChange(code)}
              >
                <Text
                  style={[
                    styles.languageText,
                    selectedLanguage === code && styles.selectedLanguageText,
                  ]}
                >
                  {getLanguageName(code)}
                </Text>
                {selectedLanguage === code && (
                  <Ionicons name="checkmark" size={18} color="#DAB44A" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowLanguageDialog(false)}>Cancel</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  if (!visible) {
    return null;
  }

  return (
    <>
      <View
        style={[
          styles.container,
          {
            paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="sparkles-outline" size={24} color="#DAB44A" />
            <Text variant="titleMedium" style={styles.headerTitle}>
              AI Summary
            </Text>
          </View>
          
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.languageButton}
              onPress={() => setShowLanguageDialog(true)}
            >
              <Text style={styles.languageButtonText}>
                {getLanguageName(selectedLanguage)}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#666666" />
            </TouchableOpacity>
            
            <IconButton
              icon="refresh"
              size={20}
              onPress={handleRefresh}
              disabled={isLoading}
            />
            
            <IconButton
              icon="close"
              size={20}
              onPress={onClose}
            />
          </View>
        </View>
        
        <Divider style={styles.divider} />
        
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#DAB44A" />
              <Text style={styles.loadingText}>Generating summary...</Text>
            </View>
          ) : isError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#F44336" />
              <Text style={styles.errorTitle}>Couldn't Generate Summary</Text>
              <Text style={styles.errorText}>
                There was a problem generating the summary for this document.
              </Text>
              <Button mode="contained" onPress={refetch} style={styles.retryButton}>
                Try Again
              </Button>
            </View>
          ) : summary ? (
            <View style={styles.summaryContainer}>
              <Text variant="titleMedium" style={styles.summaryTitle}>
                {summary.title}
              </Text>
              
              <Text style={styles.summaryText}>{summary.summary}</Text>
              
              {summary.key_points.length > 0 && (
                <View style={styles.section}>
                  <Text variant="titleSmall" style={styles.sectionTitle}>
                    Key Points
                  </Text>
                  <View style={styles.pointsList}>
                    {summary.key_points.map((point, index) => (
                      <View key={index} style={styles.pointItem}>
                        <View style={styles.pointBullet} />
                        <Text style={styles.pointText}>{point}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              
              {summary.participants.length > 0 && (
                <View style={styles.section}>
                  <Text variant="titleSmall" style={styles.sectionTitle}>
                    Participants
                  </Text>
                  <View style={styles.chipContainer}>
                    {summary.participants.map((participant, index) => (
                      <Chip key={index} style={styles.chip} textStyle={styles.chipText}>
                        {participant}
                      </Chip>
                    ))}
                  </View>
                </View>
              )}
              
              {summary.dates.length > 0 && (
                <View style={styles.section}>
                  <Text variant="titleSmall" style={styles.sectionTitle}>
                    Important Dates
                  </Text>
                  <View style={styles.chipContainer}>
                    {summary.dates.map((date, index) => (
                      <Chip key={index} style={styles.chip} textStyle={styles.chipText}>
                        {date}
                      </Chip>
                    ))}
                  </View>
                </View>
              )}
              
              {summary.financial_terms && summary.financial_terms.length > 0 && (
                <View style={styles.section}>
                  <Text variant="titleSmall" style={styles.sectionTitle}>
                    Financial Terms
                  </Text>
                  <View style={styles.chipContainer}>
                    {summary.financial_terms.map((term, index) => (
                      <Chip key={index} style={styles.chip} textStyle={styles.chipText}>
                        {term}
                      </Chip>
                    ))}
                  </View>
                </View>
              )}
              
              {summary.legal_terms && summary.legal_terms.length > 0 && (
                <View style={styles.section}>
                  <Text variant="titleSmall" style={styles.sectionTitle}>
                    Legal Terms
                  </Text>
                  <View style={styles.chipContainer}>
                    {summary.legal_terms.map((term, index) => (
                      <Chip key={index} style={styles.chip} textStyle={styles.chipText}>
                        {term}
                      </Chip>
                    ))}
                  </View>
                </View>
              )}
              
              <View style={styles.footer}>
                <View style={styles.confidenceContainer}>
                  <Text style={styles.confidenceLabel}>Confidence:</Text>
                  <View style={styles.confidenceBar}>
                    <View
                      style={[
                        styles.confidenceFill,
                        { width: `${summary.confidence_score * 100}%` },
                        getConfidenceColor(summary.confidence_score),
                      ]}
                    />
                  </View>
                  <Text style={styles.confidenceText}>
                    {Math.round(summary.confidence_score * 100)}%
                  </Text>
                </View>
                
                <Text style={styles.disclaimer}>
                  This summary was generated by AI and may not be 100% accurate.
                  Always review the original document for complete details.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={48} color="#BDBDBD" />
              <Text style={styles.emptyText}>No summary available</Text>
            </View>
          )}
        </ScrollView>
      </View>
      
      {renderLanguageDialog()}
    </>
  );
};

// Helper function to get confidence color
const getConfidenceColor = (score: number) => {
  if (score >= 0.8) {
    return styles.confidenceHigh;
  } else if (score >= 0.6) {
    return styles.confidenceMedium;
  } else {
    return styles.confidenceLow;
  }
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    marginLeft: 8,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  languageButtonText: {
    fontSize: 12,
    color: '#666666',
    marginRight: 4,
  },
  divider: {
    backgroundColor: '#E0E0E0',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    color: '#666666',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    textAlign: 'center',
    color: '#666666',
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: '#DAB44A',
  },
  summaryContainer: {
    flex: 1,
  },
  summaryTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
    color: '#333333',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#555555',
  },
  pointsList: {
    marginLeft: 8,
  },
  pointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  pointBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DAB44A',
    marginTop: 6,
    marginRight: 8,
  },
  pointText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    margin: 4,
    backgroundColor: '#F5F5F5',
  },
  chipText: {
    fontSize: 12,
  },
  footer: {
    marginTop: 16,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  confidenceLabel: {
    fontSize: 12,
    color: '#666666',
    marginRight: 8,
  },
  confidenceBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#EEEEEE',
    borderRadius: 3,
    marginRight: 8,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 3,
  },
  confidenceHigh: {
    backgroundColor: '#4CAF50',
  },
  confidenceMedium: {
    backgroundColor: '#FFC107',
  },
  confidenceLow: {
    backgroundColor: '#F44336',
  },
  confidenceText: {
    fontSize: 12,
    color: '#666666',
    width: 36,
  },
  disclaimer: {
    fontSize: 10,
    color: '#999999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    color: '#999999',
  },
  languageScrollView: {
    maxHeight: 240,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  selectedLanguageOption: {
    backgroundColor: 'rgba(218, 180, 74, 0.1)',
  },
  languageText: {
    fontSize: 16,
    color: '#333333',
  },
  selectedLanguageText: {
    color: '#DAB44A',
    fontWeight: 'bold',
  },
});

export default DocumentSummaryPanel;
