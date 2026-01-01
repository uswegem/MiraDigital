import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  Button,
  Surface,
  useTheme,
  HelperText,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OtpInput } from 'react-native-otp-entry';
import { useAuthStore } from '../../store';
import { spacing, borderRadius } from '../../theme';
import { APP_CONFIG } from '../../config';

interface OtpVerificationScreenProps {
  navigation: any;
  route: {
    params: {
      sessionId: string;
    };
  };
}

export function OtpVerificationScreen({ navigation, route }: OtpVerificationScreenProps) {
  const theme = useTheme();
  const { verifyOtp, isLoading } = useAuthStore();
  const { sessionId } = route.params;

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(APP_CONFIG.otpTimeout);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleVerify = async () => {
    if (otp.length !== APP_CONFIG.otpLength) {
      setError(`Please enter ${APP_CONFIG.otpLength}-digit OTP`);
      return;
    }

    try {
      await verifyOtp(otp, sessionId);
      // Navigation will happen automatically when authenticated
    } catch (error: any) {
      setError(error.response?.data?.message || 'Invalid OTP. Please try again.');
      setOtp('');
    }
  };

  const handleResend = async () => {
    setCanResend(false);
    setCountdown(APP_CONFIG.otpTimeout);
    setError('');
    // TODO: Call resend OTP API
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Surface style={styles.surface} elevation={2}>
            <Text variant="headlineSmall" style={styles.title}>
              Verify OTP
            </Text>
            
            <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Enter the 6-digit code sent to your registered phone number
            </Text>

            {error ? (
              <HelperText type="error" visible style={styles.error}>
                {error}
              </HelperText>
            ) : null}

            <OtpInput
              numberOfDigits={APP_CONFIG.otpLength}
              onTextChange={(text) => {
                setOtp(text);
                setError('');
              }}
              focusColor={theme.colors.primary}
              theme={{
                containerStyle: styles.otpContainer,
                pinCodeContainerStyle: [
                  styles.otpInput,
                  { borderColor: error ? theme.colors.error : theme.colors.outline },
                ],
                pinCodeTextStyle: { color: theme.colors.onSurface },
              }}
            />

            <Button
              mode="contained"
              onPress={handleVerify}
              loading={isLoading}
              disabled={isLoading || otp.length !== APP_CONFIG.otpLength}
              style={styles.verifyButton}
              contentStyle={styles.buttonContent}
            >
              Verify
            </Button>

            <View style={styles.resendContainer}>
              {canResend ? (
                <Button mode="text" onPress={handleResend}>
                  Resend OTP
                </Button>
              ) : (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  Resend OTP in {formatTime(countdown)}
                </Text>
              )}
            </View>
          </Surface>

          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            Back to Login
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
    justifyContent: 'center',
    padding: spacing.lg,
  },
  surface: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  error: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  otpContainer: {
    marginBottom: spacing.lg,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderRadius: borderRadius.md,
  },
  verifyButton: {
    marginTop: spacing.md,
  },
  buttonContent: {
    paddingVertical: spacing.xs,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  backButton: {
    marginTop: spacing.lg,
  },
});

export default OtpVerificationScreen;
