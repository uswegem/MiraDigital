import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  Button,
  useTheme,
  TextInput,
  Surface,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { spacing } from '../../theme';
import { OnboardingProgress } from './components/OnboardingProgress';
import { useOnboardingStore } from '../../store/onboardingStore';

export function NidaVerificationScreen() {
  const theme = useTheme();
  const navigation = useNavigation();

  const {
    isLoading,
    error,
    personalInfo,
    documentInfo,
    verifyNida,
    setError,
  } = useOnboardingStore();

  const [nidaNumber, setNidaNumber] = useState(documentInfo?.nidaNumber || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<'success' | 'mismatch' | null>(null);

  const formatNidaNumber = (text: string): string => {
    // Remove non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    // NIDA numbers are typically 20 digits
    return cleaned.slice(0, 20);
  };

  const validateNidaNumber = (number: string): boolean => {
    // NIDA numbers should be 20 digits
    return number.length === 20;
  };

  const handleVerifyNida = async () => {
    if (!validateNidaNumber(nidaNumber)) {
      Alert.alert('Invalid NIDA Number', 'Please enter a valid 20-digit NIDA number');
      return;
    }

    setIsVerifying(true);
    setError(null);

    const result = await verifyNida(nidaNumber);

    setIsVerifying(false);

    if (result.success) {
      if (result.verified) {
        setVerificationResult('success');
        // Auto-navigate after short delay
        setTimeout(() => {
          navigation.navigate('Selfie' as never);
        }, 1500);
      } else {
        setVerificationResult('mismatch');
      }
    } else {
      Alert.alert('Verification Failed', result.error || 'Could not verify NIDA number');
    }
  };

  const renderVerificationStatus = () => {
    if (isVerifying) {
      return (
        <Surface style={[styles.statusCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyLarge" style={{ marginTop: spacing.md, textAlign: 'center' }}>
            Verifying with NIDA...
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: spacing.xs }}>
            This may take a few moments
          </Text>
        </Surface>
      );
    }

    if (verificationResult === 'success') {
      return (
        <Surface style={[styles.statusCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
          <IconButton icon="check-circle" size={64} iconColor={theme.colors.primary} />
          <Text variant="titleMedium" style={{ color: theme.colors.onPrimaryContainer, fontWeight: 'bold' }}>
            Identity Verified!
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, marginTop: spacing.xs }}>
            Your NIDA information matches our records
          </Text>
        </Surface>
      );
    }

    if (verificationResult === 'mismatch') {
      return (
        <Surface style={[styles.statusCard, { backgroundColor: theme.colors.errorContainer }]} elevation={0}>
          <IconButton icon="alert-circle" size={64} iconColor={theme.colors.error} />
          <Text variant="titleMedium" style={{ color: theme.colors.onErrorContainer, fontWeight: 'bold' }}>
            Verification Mismatch
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer, marginTop: spacing.xs, textAlign: 'center' }}>
            The information doesn't match. Please check your details and try again.
          </Text>
          <Button
            mode="outlined"
            onPress={() => {
              setVerificationResult(null);
              setNidaNumber('');
            }}
            style={{ marginTop: spacing.md }}
          >
            Try Again
          </Button>
        </Surface>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <OnboardingProgress currentStep={3} totalSteps={9} />

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
          NIDA Verification
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.outline }]}>
          Enter your NIDA number to verify your identity
        </Text>

        {/* Personal Info Summary */}
        <Surface style={[styles.infoCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
          <Text variant="labelLarge" style={{ marginBottom: spacing.sm }}>
            Your Details
          </Text>
          <View style={styles.infoRow}>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Name:</Text>
            <Text variant="bodyMedium">
              {personalInfo?.firstName} {personalInfo?.middleName} {personalInfo?.lastName}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>Date of Birth:</Text>
            <Text variant="bodyMedium">{personalInfo?.dateOfBirth}</Text>
          </View>
        </Surface>

        {!verificationResult && !isVerifying ? (
          <>
            {/* NIDA Number Input */}
            <TextInput
              label="NIDA Number"
              value={nidaNumber}
              onChangeText={(text) => setNidaNumber(formatNidaNumber(text))}
              mode="outlined"
              keyboardType="numeric"
              maxLength={20}
              placeholder="Enter your 20-digit NIDA number"
              style={styles.input}
              left={<TextInput.Icon icon="card-account-details" />}
              error={!!error}
            />

            <Text variant="bodySmall" style={[styles.hint, { color: theme.colors.outline }]}>
              Your NIDA number is printed on your National ID card
            </Text>

            {/* What is NIDA info */}
            <Surface style={[styles.infoBox, { backgroundColor: theme.colors.secondaryContainer }]} elevation={0}>
              <View style={styles.infoBoxHeader}>
                <IconButton icon="information" size={20} iconColor={theme.colors.onSecondaryContainer} />
                <Text variant="labelMedium" style={{ color: theme.colors.onSecondaryContainer }}>
                  About NIDA Verification
                </Text>
              </View>
              <Text variant="bodySmall" style={{ color: theme.colors.onSecondaryContainer, paddingHorizontal: spacing.md }}>
                NIDA (National Identification Authority) verification ensures your identity 
                is authentic. We compare your provided information with the national database.
              </Text>
            </Surface>
          </>
        ) : (
          renderVerificationStatus()
        )}

        {error && !verificationResult && (
          <Text variant="bodySmall" style={[styles.error, { color: theme.colors.error }]}>
            {error}
          </Text>
        )}
      </ScrollView>

      {!isVerifying && verificationResult !== 'success' && (
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
            onPress={handleVerifyNida}
            loading={isLoading}
            disabled={!validateNidaNumber(nidaNumber) || isLoading}
            style={styles.footerButton}
          >
            Verify
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    marginTop: spacing.lg,
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  infoCard: {
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  input: {
    marginBottom: spacing.sm,
  },
  hint: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  infoBox: {
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.md,
  },
  infoBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusCard: {
    padding: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: spacing.lg,
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

export default NidaVerificationScreen;
