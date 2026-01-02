import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  Button,
  TextInput,
  useTheme,
  HelperText,
  SegmentedButtons,
  Menu,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useOnboardingStore } from '../../store/onboardingStore';
import { spacing, borderRadius } from '../../theme';
import OnboardingProgress from './components/OnboardingProgress';

interface PersonalInfoScreenProps {
  navigation: any;
}

export function PersonalInfoScreen({ navigation }: PersonalInfoScreenProps) {
  const theme = useTheme();
  const {
    applicationId,
    sessionToken,
    savePersonalInfo,
    isLoading,
    error,
    clearError,
  } = useOnboardingStore();

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [email, setEmail] = useState('');
  const [showMaritalMenu, setShowMaritalMenu] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const maritalOptions = [
    { label: 'Single', value: 'SINGLE' },
    { label: 'Married', value: 'MARRIED' },
    { label: 'Divorced', value: 'DIVORCED' },
    { label: 'Widowed', value: 'WIDOWED' },
  ];

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const age = Math.floor((Date.now() - dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) {
        newErrors.dateOfBirth = 'You must be at least 18 years old';
      }
    }
    if (!gender) {
      newErrors.gender = 'Please select your gender';
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    clearError();
    
    if (!validate()) return;

    const success = await savePersonalInfo({
      firstName: firstName.trim(),
      middleName: middleName.trim() || undefined,
      lastName: lastName.trim(),
      dateOfBirth: dateOfBirth!.toISOString(),
      gender,
      maritalStatus: maritalStatus || undefined,
      email: email.trim() || undefined,
    });

    if (success) {
      navigation.navigate('OnboardingDocument');
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 18); // Must be 18+

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <OnboardingProgress currentStep={2} totalSteps={9} />

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text variant="headlineSmall" style={styles.title}>
            Personal Information
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.outline }]}>
            Please enter your details exactly as they appear on your ID
          </Text>

          {/* First Name */}
          <TextInput
            mode="outlined"
            label="First Name *"
            value={firstName}
            onChangeText={setFirstName}
            error={!!errors.firstName}
            style={styles.input}
            autoCapitalize="words"
          />
          {errors.firstName && (
            <HelperText type="error" visible>{errors.firstName}</HelperText>
          )}

          {/* Middle Name */}
          <TextInput
            mode="outlined"
            label="Middle Name (Optional)"
            value={middleName}
            onChangeText={setMiddleName}
            style={styles.input}
            autoCapitalize="words"
          />

          {/* Last Name */}
          <TextInput
            mode="outlined"
            label="Last Name *"
            value={lastName}
            onChangeText={setLastName}
            error={!!errors.lastName}
            style={styles.input}
            autoCapitalize="words"
          />
          {errors.lastName && (
            <HelperText type="error" visible>{errors.lastName}</HelperText>
          )}

          {/* Date of Birth */}
          <Button
            mode="outlined"
            onPress={() => setShowDatePicker(true)}
            style={[styles.dateButton, errors.dateOfBirth && { borderColor: theme.colors.error }]}
            contentStyle={styles.dateButtonContent}
          >
            <View style={styles.dateButtonInner}>
              <Icon name="calendar" size={20} color={theme.colors.outline} />
              <Text style={{ marginLeft: spacing.sm }}>
                {dateOfBirth ? formatDate(dateOfBirth) : 'Date of Birth *'}
              </Text>
            </View>
          </Button>
          {errors.dateOfBirth && (
            <HelperText type="error" visible>{errors.dateOfBirth}</HelperText>
          )}

          {showDatePicker && (
            <DateTimePicker
              value={dateOfBirth || maxDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={maxDate}
              onChange={(event, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) setDateOfBirth(date);
              }}
            />
          )}

          {/* Gender */}
          <Text variant="labelLarge" style={styles.sectionLabel}>Gender *</Text>
          <SegmentedButtons
            value={gender}
            onValueChange={setGender}
            buttons={[
              { value: 'MALE', label: 'Male', icon: 'gender-male' },
              { value: 'FEMALE', label: 'Female', icon: 'gender-female' },
            ]}
            style={styles.segmentedButtons}
          />
          {errors.gender && (
            <HelperText type="error" visible>{errors.gender}</HelperText>
          )}

          {/* Marital Status */}
          <Menu
            visible={showMaritalMenu}
            onDismiss={() => setShowMaritalMenu(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setShowMaritalMenu(true)}
                style={styles.dropdownButton}
                contentStyle={styles.dropdownButtonContent}
              >
                {maritalStatus
                  ? maritalOptions.find(o => o.value === maritalStatus)?.label
                  : 'Marital Status (Optional)'}
              </Button>
            }
          >
            {maritalOptions.map((option) => (
              <Menu.Item
                key={option.value}
                onPress={() => {
                  setMaritalStatus(option.value);
                  setShowMaritalMenu(false);
                }}
                title={option.label}
              />
            ))}
          </Menu>

          {/* Email */}
          <TextInput
            mode="outlined"
            label="Email Address (Optional)"
            value={email}
            onChangeText={setEmail}
            error={!!errors.email}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email && (
            <HelperText type="error" visible>{errors.email}</HelperText>
          )}

          {error && (
            <HelperText type="error" visible style={styles.apiError}>
              {error}
            </HelperText>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleContinue}
            loading={isLoading}
            disabled={isLoading}
            style={styles.continueButton}
            contentStyle={styles.buttonContent}
          >
            Continue
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 120,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.xl,
  },
  input: {
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  segmentedButtons: {
    marginBottom: spacing.md,
  },
  dateButton: {
    marginBottom: spacing.sm,
    justifyContent: 'flex-start',
  },
  dateButtonContent: {
    justifyContent: 'flex-start',
    paddingVertical: spacing.sm,
  },
  dateButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownButton: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    justifyContent: 'flex-start',
  },
  dropdownButtonContent: {
    justifyContent: 'flex-start',
  },
  apiError: {
    textAlign: 'center',
    marginTop: spacing.md,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
  },
  continueButton: {
    borderRadius: borderRadius.md,
  },
  buttonContent: {
    paddingVertical: spacing.xs,
  },
});

export default PersonalInfoScreen;
