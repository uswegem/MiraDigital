import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import {
  Text,
  Button,
  useTheme,
  Surface,
  Checkbox,
  List,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { spacing } from '../../theme';
import { OnboardingProgress } from './components/OnboardingProgress';
import { useOnboardingStore } from '../../store/onboardingStore';

export function TermsScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);

  const {
    isLoading,
    error,
    selectedProduct,
    acceptTerms,
    setError,
  } = useOnboardingStore();

  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedMarketing, setAcceptedMarketing] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 50;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      setScrolledToEnd(true);
      setHasReadTerms(true);
    }
  };

  const handleAcceptTerms = async () => {
    if (!acceptedTerms || !acceptedPrivacy) {
      Alert.alert('Required', 'You must accept the Terms & Conditions and Privacy Policy to continue');
      return;
    }

    const result = await acceptTerms();
    if (result.success) {
      navigation.navigate('Review' as never);
    } else {
      Alert.alert('Error', result.error || 'Failed to accept terms');
    }
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(err => console.error('Failed to open URL:', err));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <OnboardingProgress currentStep={8} totalSteps={9} />

      <View style={styles.content}>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
          Terms & Conditions
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.outline }]}>
          Please read and accept our terms to continue
        </Text>

        {/* Scrollable Terms Content */}
        <Surface style={[styles.termsContainer, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.termsScroll}
            onScroll={handleScroll}
            scrollEventThrottle={400}
          >
            <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: spacing.md }}>
              MIRA Digital Banking Terms and Conditions
            </Text>

            <Text variant="labelLarge" style={styles.sectionTitle}>1. Account Opening</Text>
            <Text variant="bodySmall" style={styles.termsText}>
              By opening a {selectedProduct?.productName || 'savings'} account with MIRA Digital, you agree to maintain 
              accurate personal information and notify us of any changes. You must be at least 18 years of age to open 
              an individual account. Accounts are subject to verification and approval.
            </Text>

            <Text variant="labelLarge" style={styles.sectionTitle}>2. Account Usage</Text>
            <Text variant="bodySmall" style={styles.termsText}>
              Your account must be used for lawful purposes only. You are responsible for all transactions conducted 
              using your account credentials. MIRA Digital reserves the right to close accounts that violate these terms 
              or are used for illegal activities.
            </Text>

            <Text variant="labelLarge" style={styles.sectionTitle}>3. Fees and Charges</Text>
            <Text variant="bodySmall" style={styles.termsText}>
              Account fees and charges are outlined in our fee schedule, which may be updated from time to time. 
              You will be notified of any changes to fees at least 30 days in advance. Current fees include 
              transaction fees, monthly maintenance fees (if applicable), and ATM withdrawal fees.
            </Text>

            <Text variant="labelLarge" style={styles.sectionTitle}>4. Electronic Services</Text>
            <Text variant="bodySmall" style={styles.termsText}>
              Mobile banking and other electronic services are provided "as is." While we strive for 24/7 availability, 
              we do not guarantee uninterrupted access. You are responsible for maintaining the security of your 
              PIN, password, and other credentials.
            </Text>

            <Text variant="labelLarge" style={styles.sectionTitle}>5. Privacy and Data</Text>
            <Text variant="bodySmall" style={styles.termsText}>
              Your personal information will be processed in accordance with our Privacy Policy and applicable 
              data protection laws. We may share information with regulatory authorities, credit bureaus, and 
              service providers as required by law or to provide our services.
            </Text>

            <Text variant="labelLarge" style={styles.sectionTitle}>6. Liability</Text>
            <Text variant="bodySmall" style={styles.termsText}>
              MIRA Digital shall not be liable for losses arising from unauthorized transactions reported more 
              than 48 hours after discovery, system failures beyond our control, or actions taken to comply 
              with legal requirements.
            </Text>

            <Text variant="labelLarge" style={styles.sectionTitle}>7. Dispute Resolution</Text>
            <Text variant="bodySmall" style={styles.termsText}>
              Any disputes shall first be addressed through our internal complaints procedure. If unresolved, 
              disputes may be referred to the Bank of Tanzania for mediation. These terms are governed by 
              the laws of the United Republic of Tanzania.
            </Text>

            <Text variant="labelLarge" style={styles.sectionTitle}>8. Changes to Terms</Text>
            <Text variant="bodySmall" style={styles.termsText}>
              We may modify these terms at any time with 30 days notice. Continued use of your account after 
              such changes constitutes acceptance of the new terms. You may close your account if you do not 
              agree with the changes.
            </Text>

            <View style={styles.scrollEndPadding} />
          </ScrollView>

          {!scrolledToEnd && (
            <View style={[styles.scrollHint, { backgroundColor: theme.colors.primaryContainer }]}>
              <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer }}>
                ↓ Scroll to read all terms
              </Text>
            </View>
          )}
        </Surface>

        {/* Checkboxes */}
        <View style={styles.checkboxContainer}>
          <Checkbox.Item
            label="I have read and accept the Terms & Conditions *"
            status={acceptedTerms ? 'checked' : 'unchecked'}
            onPress={() => setAcceptedTerms(!acceptedTerms)}
            disabled={!hasReadTerms}
            labelStyle={[styles.checkboxLabel, !hasReadTerms && { color: theme.colors.outline }]}
            position="leading"
          />

          <Checkbox.Item
            label="I have read and accept the Privacy Policy *"
            status={acceptedPrivacy ? 'checked' : 'unchecked'}
            onPress={() => setAcceptedPrivacy(!acceptedPrivacy)}
            disabled={!hasReadTerms}
            labelStyle={[styles.checkboxLabel, !hasReadTerms && { color: theme.colors.outline }]}
            position="leading"
          />

          <Checkbox.Item
            label="I agree to receive marketing communications (optional)"
            status={acceptedMarketing ? 'checked' : 'unchecked'}
            onPress={() => setAcceptedMarketing(!acceptedMarketing)}
            labelStyle={styles.checkboxLabel}
            position="leading"
          />
        </View>

        {/* Links */}
        <View style={styles.linksContainer}>
          <Button 
            mode="text" 
            compact 
            onPress={() => openLink('https://mira.co.tz/terms')}
          >
            View Full Terms
          </Button>
          <Button 
            mode="text" 
            compact 
            onPress={() => openLink('https://mira.co.tz/privacy')}
          >
            View Privacy Policy
          </Button>
        </View>

        {error && (
          <Text variant="bodySmall" style={[styles.error, { color: theme.colors.error }]}>
            {error}
          </Text>
        )}
      </View>

      <View style={[styles.footer, { borderTopColor: theme.colors.outlineVariant }]}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.footerButton}
        >
          Back
        </Button>
        <Button
          mode="contained"
          onPress={handleAcceptTerms}
          loading={isLoading}
          disabled={!acceptedTerms || !acceptedPrivacy || isLoading}
          style={styles.footerButton}
        >
          Accept & Continue
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  title: {
    marginTop: spacing.lg,
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  termsContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  termsScroll: {
    flex: 1,
    padding: spacing.md,
  },
  sectionTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  termsText: {
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  scrollEndPadding: {
    height: 40,
  },
  scrollHint: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.sm,
    alignItems: 'center',
  },
  checkboxContainer: {
    marginTop: spacing.md,
  },
  checkboxLabel: {
    fontSize: 13,
  },
  linksContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  error: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  footerButton: {
    flex: 1,
  },
});

export default TermsScreen;
