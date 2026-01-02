import React, { useState } from 'react';
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
  RadioButton,
  List,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { spacing } from '../../theme';
import { OnboardingProgress } from './components/OnboardingProgress';
import { useOnboardingStore, EmploymentInfo } from '../../store/onboardingStore';

type EmploymentStatus = 'EMPLOYED' | 'SELF_EMPLOYED' | 'UNEMPLOYED' | 'STUDENT' | 'RETIRED';

const EMPLOYMENT_OPTIONS: { value: EmploymentStatus; label: string; description: string }[] = [
  { value: 'EMPLOYED', label: 'Employed', description: 'Working for a company or organization' },
  { value: 'SELF_EMPLOYED', label: 'Self-Employed', description: 'Running your own business' },
  { value: 'UNEMPLOYED', label: 'Unemployed', description: 'Currently not working' },
  { value: 'STUDENT', label: 'Student', description: 'Full-time student' },
  { value: 'RETIRED', label: 'Retired', description: 'No longer working due to retirement' },
];

const INCOME_RANGES = [
  { value: 0, label: 'Under 500,000 TZS' },
  { value: 500000, label: '500,000 - 1,000,000 TZS' },
  { value: 1000000, label: '1,000,000 - 3,000,000 TZS' },
  { value: 3000000, label: '3,000,000 - 5,000,000 TZS' },
  { value: 5000000, label: '5,000,000 - 10,000,000 TZS' },
  { value: 10000000, label: 'Above 10,000,000 TZS' },
];

export function EmploymentScreen() {
  const theme = useTheme();
  const navigation = useNavigation();

  const {
    isLoading,
    error,
    employmentInfo,
    saveEmploymentInfo,
    setError,
  } = useOnboardingStore();

  const [formData, setFormData] = useState<EmploymentInfo>({
    status: employmentInfo?.status || 'EMPLOYED',
    employerName: employmentInfo?.employerName || '',
    occupation: employmentInfo?.occupation || '',
    monthlyIncome: employmentInfo?.monthlyIncome || 0,
    incomeSource: employmentInfo?.incomeSource || '',
  });

  const [showIncomeOptions, setShowIncomeOptions] = useState(false);

  const updateField = <K extends keyof EmploymentInfo>(field: K, value: EmploymentInfo[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const needsEmployerDetails = formData.status === 'EMPLOYED';
  const needsBusinessDetails = formData.status === 'SELF_EMPLOYED';
  const needsIncomeDetails = formData.status !== 'UNEMPLOYED' && formData.status !== 'STUDENT';

  const validateForm = (): boolean => {
    if (needsEmployerDetails) {
      if (!formData.employerName?.trim()) {
        Alert.alert('Validation Error', 'Please enter your employer name');
        return false;
      }
      if (!formData.occupation?.trim()) {
        Alert.alert('Validation Error', 'Please enter your occupation/job title');
        return false;
      }
    }

    if (needsBusinessDetails) {
      if (!formData.occupation?.trim()) {
        Alert.alert('Validation Error', 'Please describe your business');
        return false;
      }
    }

    if (needsIncomeDetails && formData.monthlyIncome === 0 && formData.status !== 'RETIRED') {
      Alert.alert('Validation Error', 'Please select your income range');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const result = await saveEmploymentInfo(formData);
    if (result.success) {
      navigation.navigate('ProductSelection' as never);
    } else {
      Alert.alert('Error', result.error || 'Failed to save employment info');
    }
  };

  const getIncomeLabel = (value: number): string => {
    const range = INCOME_RANGES.find(r => r.value === value);
    return range?.label || 'Select income range';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <OnboardingProgress currentStep={6} totalSteps={9} />

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
          Employment Information
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.outline }]}>
          Tell us about your employment status and income
        </Text>

        {/* Employment Status */}
        <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onBackground }]}>
          Employment Status *
        </Text>
        
        <RadioButton.Group
          onValueChange={(value) => updateField('status', value as EmploymentStatus)}
          value={formData.status}
        >
          {EMPLOYMENT_OPTIONS.map((option) => (
            <Surface 
              key={option.value}
              style={[
                styles.optionCard,
                formData.status === option.value && { 
                  borderColor: theme.colors.primary,
                  borderWidth: 2,
                }
              ]} 
              elevation={0}
            >
              <RadioButton.Item
                label=""
                value={option.value}
                style={styles.radioItem}
              />
              <View style={styles.optionContent}>
                <Text variant="bodyLarge" style={{ fontWeight: '600' }}>
                  {option.label}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                  {option.description}
                </Text>
              </View>
            </Surface>
          ))}
        </RadioButton.Group>

        <Divider style={styles.divider} />

        {/* Employer Details (for Employed) */}
        {needsEmployerDetails && (
          <>
            <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onBackground }]}>
              Employer Details
            </Text>

            <TextInput
              label="Employer Name *"
              value={formData.employerName}
              onChangeText={(text) => updateField('employerName', text)}
              mode="outlined"
              placeholder="e.g., Vodacom Tanzania"
              style={styles.input}
            />

            <TextInput
              label="Job Title / Occupation *"
              value={formData.occupation}
              onChangeText={(text) => updateField('occupation', text)}
              mode="outlined"
              placeholder="e.g., Software Engineer"
              style={styles.input}
            />
          </>
        )}

        {/* Business Details (for Self-Employed) */}
        {needsBusinessDetails && (
          <>
            <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onBackground }]}>
              Business Details
            </Text>

            <TextInput
              label="Business Name"
              value={formData.employerName}
              onChangeText={(text) => updateField('employerName', text)}
              mode="outlined"
              placeholder="e.g., Mama Ntilie Restaurant"
              style={styles.input}
            />

            <TextInput
              label="Business Type / Description *"
              value={formData.occupation}
              onChangeText={(text) => updateField('occupation', text)}
              mode="outlined"
              placeholder="e.g., Food and Restaurant"
              style={styles.input}
            />
          </>
        )}

        {/* Income Details */}
        {needsIncomeDetails && (
          <>
            <Text variant="labelLarge" style={[styles.sectionLabel, { color: theme.colors.onBackground }]}>
              Monthly Income {formData.status !== 'RETIRED' ? '*' : ''}
            </Text>

            <Surface 
              style={[styles.incomeSelector, { backgroundColor: theme.colors.surfaceVariant }]} 
              elevation={0}
            >
              <List.Accordion
                title={getIncomeLabel(formData.monthlyIncome || 0)}
                expanded={showIncomeOptions}
                onPress={() => setShowIncomeOptions(!showIncomeOptions)}
                left={props => <List.Icon {...props} icon="cash" />}
                style={{ backgroundColor: 'transparent' }}
              >
                {INCOME_RANGES.map((range) => (
                  <List.Item
                    key={range.value}
                    title={range.label}
                    onPress={() => {
                      updateField('monthlyIncome', range.value);
                      setShowIncomeOptions(false);
                    }}
                    left={props => 
                      formData.monthlyIncome === range.value ? 
                      <List.Icon {...props} icon="check" color={theme.colors.primary} /> : 
                      null
                    }
                  />
                ))}
              </List.Accordion>
            </Surface>

            <TextInput
              label="Source of Income"
              value={formData.incomeSource}
              onChangeText={(text) => updateField('incomeSource', text)}
              mode="outlined"
              placeholder="e.g., Salary, Business profits, etc."
              style={styles.input}
            />
          </>
        )}

        {/* Note for special cases */}
        {(formData.status === 'UNEMPLOYED' || formData.status === 'STUDENT') && (
          <Surface style={[styles.noteCard, { backgroundColor: theme.colors.secondaryContainer }]} elevation={0}>
            <List.Icon icon="information-outline" color={theme.colors.onSecondaryContainer} />
            <Text variant="bodySmall" style={{ color: theme.colors.onSecondaryContainer, flex: 1 }}>
              {formData.status === 'STUDENT' 
                ? 'Student accounts have special features and lower minimum balance requirements.'
                : 'You can still open a basic savings account. Some services may be limited.'}
            </Text>
          </Surface>
        )}

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
        >
          Continue
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
  sectionLabel: {
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: spacing.sm,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  radioItem: {
    width: 50,
  },
  optionContent: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
  },
  divider: {
    marginVertical: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
  },
  incomeSelector: {
    borderRadius: 12,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.md,
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

export default EmploymentScreen;
