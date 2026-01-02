import React from 'react';
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
  Surface,
  List,
  Divider,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { spacing } from '../../theme';
import { OnboardingProgress } from './components/OnboardingProgress';
import { useOnboardingStore } from '../../store/onboardingStore';

export function ReviewScreen() {
  const theme = useTheme();
  const navigation = useNavigation();

  const {
    isLoading,
    error,
    personalInfo,
    documentInfo,
    selfieInfo,
    addressInfo,
    employmentInfo,
    selectedProduct,
    submitApplication,
    goToStep,
    setError,
  } = useOnboardingStore();

  const handleSubmit = async () => {
    Alert.alert(
      'Submit Application',
      'Are you sure you want to submit your application? Please ensure all information is correct.',
      [
        { text: 'Review Again', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            const result = await submitApplication();
            if (result.success) {
              navigation.navigate('Status' as never);
            } else {
              Alert.alert('Submission Failed', result.error || 'Please try again');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (screen: string) => {
    navigation.navigate(screen as never);
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatIncome = (amount: number): string => {
    if (amount >= 1000000) {
      return `TZS ${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `TZS ${(amount / 1000).toFixed(0)}K`;
    }
    return `TZS ${amount}`;
  };

  const renderSection = (
    title: string,
    icon: string,
    content: React.ReactNode,
    editScreen?: string
  ) => (
    <Surface style={styles.section} elevation={1}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <List.Icon icon={icon} color={theme.colors.primary} />
          <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
            {title}
          </Text>
        </View>
        {editScreen && (
          <IconButton
            icon="pencil"
            size={20}
            onPress={() => handleEdit(editScreen)}
          />
        )}
      </View>
      <Divider style={styles.sectionDivider} />
      <View style={styles.sectionContent}>
        {content}
      </View>
    </Surface>
  );

  const renderInfoRow = (label: string, value: string | undefined | null) => (
    <View style={styles.infoRow}>
      <Text variant="bodySmall" style={{ color: theme.colors.outline, flex: 1 }}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={{ flex: 2, textAlign: 'right' }}>
        {value || '-'}
      </Text>
    </View>
  );

  const renderVerificationBadge = (verified: boolean, label: string) => (
    <View style={[
      styles.badge,
      { backgroundColor: verified ? theme.colors.primaryContainer : theme.colors.errorContainer }
    ]}>
      <List.Icon 
        icon={verified ? 'check-circle' : 'alert-circle'} 
        color={verified ? theme.colors.primary : theme.colors.error}
        style={styles.badgeIcon}
      />
      <Text 
        variant="labelSmall" 
        style={{ color: verified ? theme.colors.onPrimaryContainer : theme.colors.onErrorContainer }}
      >
        {label}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <OnboardingProgress currentStep={9} totalSteps={9} />

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
          Review Your Application
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.outline }]}>
          Please verify all information before submitting
        </Text>

        {/* Personal Information */}
        {renderSection(
          'Personal Information',
          'account',
          <>
            {renderInfoRow('Full Name', `${personalInfo?.firstName} ${personalInfo?.middleName || ''} ${personalInfo?.lastName}`.trim())}
            {renderInfoRow('Date of Birth', personalInfo?.dateOfBirth ? formatDate(personalInfo.dateOfBirth) : '-')}
            {renderInfoRow('Gender', personalInfo?.gender)}
            {renderInfoRow('Marital Status', personalInfo?.maritalStatus)}
            {personalInfo?.email && renderInfoRow('Email', personalInfo.email)}
          </>,
          'PersonalInfo'
        )}

        {/* Identity Verification */}
        {renderSection(
          'Identity Verification',
          'card-account-details',
          <>
            {renderInfoRow('Document Type', documentInfo?.type?.replace('_', ' '))}
            {documentInfo?.nidaNumber && renderInfoRow('NIDA Number', documentInfo.nidaNumber)}
            <View style={styles.badgesRow}>
              {renderVerificationBadge(!!documentInfo?.frontImageKey, 'ID Captured')}
              {renderVerificationBadge(!!documentInfo?.nidaVerified, 'NIDA Verified')}
              {renderVerificationBadge(!!selfieInfo?.imageKey, 'Selfie Captured')}
            </View>
          </>,
          'DocumentCapture'
        )}

        {/* Address */}
        {renderSection(
          'Residential Address',
          'map-marker',
          <>
            {renderInfoRow('Region', addressInfo?.region)}
            {renderInfoRow('District', addressInfo?.district)}
            {addressInfo?.ward && renderInfoRow('Ward', addressInfo.ward)}
            {renderInfoRow('Street', addressInfo?.street)}
            {addressInfo?.houseNumber && renderInfoRow('House/Plot No.', addressInfo.houseNumber)}
          </>,
          'Address'
        )}

        {/* Employment */}
        {renderSection(
          'Employment Details',
          'briefcase',
          <>
            {renderInfoRow('Status', employmentInfo?.status?.replace('_', ' '))}
            {employmentInfo?.employerName && renderInfoRow(
              employmentInfo.status === 'SELF_EMPLOYED' ? 'Business Name' : 'Employer',
              employmentInfo.employerName
            )}
            {employmentInfo?.occupation && renderInfoRow('Occupation', employmentInfo.occupation)}
            {employmentInfo?.monthlyIncome && renderInfoRow('Monthly Income', formatIncome(employmentInfo.monthlyIncome))}
          </>,
          'Employment'
        )}

        {/* Selected Product */}
        {renderSection(
          'Account Selection',
          'bank',
          <>
            <View style={styles.productRow}>
              <View style={[styles.productIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <List.Icon icon="piggy-bank" color={theme.colors.primary} />
              </View>
              <View>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                  {selectedProduct?.productName}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                  {selectedProduct?.productType} Account
                </Text>
              </View>
            </View>
          </>,
          'ProductSelection'
        )}

        {/* Confirmation Notice */}
        <Surface style={[styles.confirmNotice, { backgroundColor: theme.colors.tertiaryContainer }]} elevation={0}>
          <List.Icon icon="information" color={theme.colors.onTertiaryContainer} />
          <View style={{ flex: 1 }}>
            <Text variant="labelMedium" style={{ color: theme.colors.onTertiaryContainer, fontWeight: 'bold' }}>
              Ready to Submit?
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onTertiaryContainer }}>
              By submitting, you confirm that all information provided is accurate. Your application 
              will be reviewed and you'll receive a notification once approved.
            </Text>
          </View>
        </Surface>

        {error && (
          <Text variant="bodySmall" style={[styles.error, { color: theme.colors.error }]}>
            {error}
          </Text>
        )}
      </ScrollView>

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
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading}
          style={styles.footerButton}
          icon="send"
        >
          Submit
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
  section: {
    borderRadius: 12,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionDivider: {
    marginHorizontal: spacing.md,
  },
  sectionContent: {
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeIcon: {
    width: 20,
    height: 20,
    margin: 0,
    marginRight: 4,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  confirmNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
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

export default ReviewScreen;
