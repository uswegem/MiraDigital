import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
} from 'react-native';
import {
  Text,
  Button,
  Surface,
  useTheme,
  TextInput,
  HelperText,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useOnboardingStore } from '../../store/onboardingStore';
import { spacing, borderRadius } from '../../theme';

interface PhoneVerificationScreenProps {
  navigation: any;
}

export function PhoneVerificationScreen({ navigation }: PhoneVerificationScreenProps) {
  const theme = useTheme();
  const { 
    phoneNumber, 
    setPhoneNumber, 
    initiateOnboarding, 
    verifyOtp,
    isLoading,
    error,
    clearError,
  } = useOnboardingStore();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const [localPhone, setLocalPhone] = useState(phoneNumber || '');

  const otpRefs = useRef<(RNTextInput | null)[]>([]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async () => {
    clearError();
    
    if (!localPhone || localPhone.length < 9) {
      return;
    }

    const success = await initiateOnboarding(localPhone);
    if (success) {
      setStep('otp');
      setCountdown(60);
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) return;

    const success = await verifyOtp(otpCode);
    if (success) {
      navigation.navigate('OnboardingPersonalInfo');
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (index === 5 && value) {
      const otpCode = newOtp.join('');
      if (otpCode.length === 6) {
        handleVerifyOtp();
      }
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    
    const success = await initiateOnboarding(localPhone);
    if (success) {
      setOtp(['', '', '', '', '', '']);
      setCountdown(60);
    }
  };

  if (step === 'otp') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            {/* Back button */}
            <Button
              mode="text"
              icon="arrow-left"
              onPress={() => setStep('phone')}
              style={styles.backButton}
            >
              Back
            </Button>

            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
              <Icon name="message-text-lock" size={40} color={theme.colors.primary} />
            </View>

            <Text variant="headlineSmall" style={styles.title}>
              Verify Your Phone
            </Text>
            <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.outline }]}>
              Enter the 6-digit code sent to{'\n'}
              <Text style={{ fontWeight: 'bold', color: theme.colors.onBackground }}>
                +255 {localPhone}
              </Text>
            </Text>

            {/* OTP Input */}
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <RNTextInput
                  key={index}
                  ref={(ref) => (otpRefs.current[index] = ref)}
                  style={[
                    styles.otpInput,
                    {
                      borderColor: digit ? theme.colors.primary : theme.colors.outline,
                      color: theme.colors.onBackground,
                    },
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value.slice(-1), index)}
                  onKeyPress={(e) => handleOtpKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            {error && (
              <HelperText type="error" visible style={styles.error}>
                {error}
              </HelperText>
            )}

            {/* Resend */}
            <View style={styles.resendContainer}>
              {countdown > 0 ? (
                <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
                  Resend code in {countdown}s
                </Text>
              ) : (
                <Button mode="text" onPress={handleResendOtp}>
                  Resend Code
                </Button>
              )}
            </View>

            {/* Verify Button */}
            <Button
              mode="contained"
              onPress={handleVerifyOtp}
              loading={isLoading}
              disabled={isLoading || otp.join('').length !== 6}
              style={styles.verifyButton}
              contentStyle={styles.buttonContent}
            >
              Verify
            </Button>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Back button */}
          <Button
            mode="text"
            icon="arrow-left"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            Back
          </Button>

          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
            <Icon name="cellphone" size={40} color={theme.colors.primary} />
          </View>

          <Text variant="headlineSmall" style={styles.title}>
            Enter Your Phone Number
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.outline }]}>
            We'll send you a verification code to confirm your identity
          </Text>

          {/* Phone Input */}
          <Surface style={[styles.phoneInputContainer, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.countryCode}>
              <Text variant="bodyLarge">🇹🇿 +255</Text>
            </View>
            <TextInput
              mode="flat"
              value={localPhone}
              onChangeText={(text) => setLocalPhone(text.replace(/\D/g, '').slice(0, 9))}
              placeholder="7XX XXX XXX"
              keyboardType="phone-pad"
              style={styles.phoneInput}
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              maxLength={9}
            />
          </Surface>

          {error && (
            <HelperText type="error" visible style={styles.error}>
              {error}
            </HelperText>
          )}

          <Text variant="bodySmall" style={[styles.disclaimer, { color: theme.colors.outline }]}>
            By continuing, you agree to receive SMS messages. Standard rates may apply.
          </Text>

          {/* Continue Button */}
          <Button
            mode="contained"
            onPress={handleSendOtp}
            loading={isLoading}
            disabled={isLoading || localPhone.length < 9}
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
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginLeft: -spacing.sm,
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  countryCode: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.1)',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 18,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderRadius: borderRadius.md,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
  },
  error: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  disclaimer: {
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  continueButton: {
    borderRadius: borderRadius.md,
  },
  verifyButton: {
    borderRadius: borderRadius.md,
  },
  buttonContent: {
    paddingVertical: spacing.xs,
  },
});

export default PhoneVerificationScreen;
