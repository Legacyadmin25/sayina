import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Checkbox, Button, Divider } from 'react-native-paper';
import { theme } from '../../constants/theme';

interface ComplianceNoticeProps {
  onAccept: () => void;
}

const ComplianceNotice: React.FC<ComplianceNoticeProps> = ({ onAccept }) => {
  const [consentChecked, setConsentChecked] = useState(false);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Electronic Signature Consent
        </Text>
        
        <Text style={styles.paragraph}>
          By clicking "I Agree" below, you agree to be legally bound by this electronic signature, and to be subject to the terms and conditions of this agreement as if you had physically signed this document.
        </Text>
        
        <Divider style={styles.divider} />
        
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Consent to Electronic Transactions
        </Text>
        
        <Text style={styles.paragraph}>
          You agree that all transactions related to your use of Sayina services can be conducted electronically, including but not limited to:
        </Text>
        
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Legal notices and disclosures</Text>
          <Text style={styles.bullet}>• Contractual agreements</Text>
          <Text style={styles.bullet}>• Privacy policies and terms of service</Text>
          <Text style={styles.bullet}>• Transaction records and receipts</Text>
        </View>
        
        <Divider style={styles.divider} />
        
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Legal Compliance
        </Text>
        
        <Text style={styles.paragraph}>
          Your electronic signature through Sayina complies with applicable electronic signature laws, including:
        </Text>
        
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Electronic Signatures in Global and National Commerce Act (ESIGN)</Text>
          <Text style={styles.bullet}>• Uniform Electronic Transactions Act (UETA) in the United States</Text>
          <Text style={styles.bullet}>• Electronic Communications Act in the United Kingdom</Text>
          <Text style={styles.bullet}>• eIDAS Regulation in the European Union</Text>
          <Text style={styles.bullet}>• Electronic Communications and Transactions Act in South Africa</Text>
        </View>
        
        <Divider style={styles.divider} />
        
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Electronic Record Keeping
        </Text>
        
        <Text style={styles.paragraph}>
          You acknowledge and agree that Sayina will maintain electronic records of this transaction, including:
        </Text>
        
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>• Your identity verification data</Text>
          <Text style={styles.bullet}>• IP address and device information</Text>
          <Text style={styles.bullet}>• Date and time of signature</Text>
          <Text style={styles.bullet}>• A cryptographic hash of the document to prevent tampering</Text>
        </View>
        
        <Text style={styles.paragraph}>
          These records will be maintained for the legally required retention period and may be used as evidence of your consent to this agreement.
        </Text>
        
        <Divider style={styles.divider} />
        
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Right to Withdraw Consent
        </Text>
        
        <Text style={styles.paragraph}>
          You have the right to withdraw your consent to use electronic signatures for future transactions by contacting Sayina support. However, this withdrawal will not affect the legal validity of any electronic signatures you have already provided.
        </Text>
      </ScrollView>
      
      <View style={styles.consentContainer}>
        <View style={styles.checkboxContainer}>
          <Checkbox
            status={consentChecked ? 'checked' : 'unchecked'}
            onPress={() => setConsentChecked(!consentChecked)}
            color={theme.colors.primary}
          />
          <Text style={styles.checkboxLabel}>
            I have read, understand, and agree to be legally bound by the terms above
          </Text>
        </View>
        
        <Button
          mode="contained"
          onPress={onAccept}
          disabled={!consentChecked}
          style={styles.button}
        >
          I Agree to Sign Electronically
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 400,
  },
  scrollView: {
    maxHeight: 320,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  paragraph: {
    marginBottom: 12,
    lineHeight: 20,
  },
  divider: {
    marginVertical: 16,
  },
  bulletList: {
    marginLeft: 8,
    marginBottom: 12,
  },
  bullet: {
    marginBottom: 6,
    lineHeight: 20,
  },
  consentContainer: {
    marginTop: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxLabel: {
    flex: 1,
    marginLeft: 8,
  },
  button: {
    marginTop: 8,
  },
});

export default ComplianceNotice;
