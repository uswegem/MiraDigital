import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import {
  Text,
  Button,
  useTheme,
  Surface,
  List,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { spacing } from '../../theme';
import { useOnboardingStore } from '../../store/onboardingStore';

type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';

export function StatusScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  const {
    isLoading,
    error,
    currentStep,
    mifosClientId,
    mifosAccountId,
    selectedProduct,
    personalInfo,
    checkStatus,
    resetOnboarding,
  } = useOnboardingStore();

  const [status, setStatus] = useState<ApplicationStatus>('PENDING');
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Check if already approved
    if (currentStep === 'complete') {
      setStatus('APPROVED');
    } else {
      // Start polling for status
      checkApplicationStatus();
    }
  }, [currentStep]);

  useEffect(() => {
    // Pulse animation for pending status
    if (status === 'PENDING' || status === 'UNDER_REVIEW') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  const checkApplicationStatus = async () => {
    setIsChecking(true);
    const result = await checkStatus();
    setIsChecking(false);
    
    if (result.success && result.status) {
      setStatus(result.status as ApplicationStatus);
    }
  };

  const handleGoToLogin = () => {
    resetOnboarding();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' as never }],
    });
  };

  const handleStartOver = () => {
    resetOnboarding();
    navigation.reset({
      index: 0,
      routes: [{ name: 'OnboardingWelcome' as never }],
    });
  };

  const renderPendingStatus = () => (
    <View style={styles.statusContainer}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Surface 
          style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]} 
          elevation={0}
        >
          <List.Icon icon="clock-outline" color={theme.colors.primary} style={{ width: 80, height: 80 }} />
        </Surface>
      </Animated.View>

      <Text variant="headlineSmall" style={[styles.statusTitle, { color: theme.colors.onBackground }]}>
        Application Submitted!
      </Text>
      
      <Text variant="bodyLarge" style={[styles.statusMessage, { color: theme.colors.outline }]}>
        Your application is being reviewed. This usually takes less than 24 hours.
      </Text>

      <Surface style={[styles.infoCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
        <List.Icon icon="information" color={theme.colors.onSurfaceVariant} />
        <View style={{ flex: 1 }}>
          <Text variant="labelMedium" style={{ fontWeight: 'bold' }}>What happens next?</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
            • Our team will verify your documents{'\n'}
            • You'll receive an SMS notification{'\n'}
            • Once approved, you can log in to your account
          </Text>
        </View>
      </Surface>

      <Button
        mode="outlined"
        onPress={checkApplicationStatus}
        loading={isChecking}
        disabled={isChecking}
        icon="refresh"
        style={{ marginTop: spacing.lg }}
      >
        Check Status
      </Button>
    </View>
  );

  const renderApprovedStatus = () => (
    <View style={styles.statusContainer}>
      <Surface 
        style={[styles.iconCircle, { backgroundColor: theme.colors.primaryContainer }]} 
        elevation={0}
      >
        <List.Icon icon="check-circle" color={theme.colors.primary} style={{ width: 80, height: 80 }} />
      </Surface>

      <Text variant="headlineSmall" style={[styles.statusTitle, { color: theme.colors.onBackground }]}>
        Congratulations! 🎉
      </Text>
      
      <Text variant="bodyLarge" style={[styles.statusMessage, { color: theme.colors.outline }]}>
        Your account has been approved and is ready to use.
      </Text>

      <Surface style={[styles.accountCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
        <View style={styles.accountHeader}>
          <List.Icon icon="bank" color={theme.colors.primary} />
          <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.onPrimaryContainer }}>
            {selectedProduct?.productName || 'Savings Account'}
          </Text>
        </View>
        
        <View style={styles.accountDetails}>
          <View style={styles.accountRow}>
            <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
              Account Holder
            </Text>
            <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onPrimaryContainer }}>
              {personalInfo?.firstName} {personalInfo?.lastName}
            </Text>
          </View>
          
          {mifosAccountId && (
            <View style={styles.accountRow}>
              <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer }}>
                Account Number
              </Text>
              <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onPrimaryContainer }}>
                {mifosAccountId}
              </Text>
            </View>
          )}
        </View>
      </Surface>

      <Surface style={[styles.infoCard, { backgroundColor: theme.colors.secondaryContainer }]} elevation={0}>
        <List.Icon icon="lightbulb" color={theme.colors.onSecondaryContainer} />
        <View style={{ flex: 1 }}>
          <Text variant="labelMedium" style={{ fontWeight: 'bold', color: theme.colors.onSecondaryContainer }}>
            Get Started
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSecondaryContainer, marginTop: 4 }}>
            Log in with your phone number and the PIN you'll receive via SMS to start banking!
          </Text>
        </View>
      </Surface>

      <Button
        mode="contained"
        onPress={handleGoToLogin}
        icon="login"
        style={{ marginTop: spacing.xl }}
      >
        Go to Login
      </Button>
    </View>
  );

  const renderRejectedStatus = () => (
    <View style={styles.statusContainer}>
      <Surface 
        style={[styles.iconCircle, { backgroundColor: theme.colors.errorContainer }]} 
        elevation={0}
      >
        <List.Icon icon="close-circle" color={theme.colors.error} style={{ width: 80, height: 80 }} />
      </Surface>

      <Text variant="headlineSmall" style={[styles.statusTitle, { color: theme.colors.onBackground }]}>
        Application Not Approved
      </Text>
      
      <Text variant="bodyLarge" style={[styles.statusMessage, { color: theme.colors.outline }]}>
        We're sorry, but we couldn't approve your application at this time.
      </Text>

      <Surface style={[styles.infoCard, { backgroundColor: theme.colors.errorContainer }]} elevation={0}>
        <List.Icon icon="information" color={theme.colors.onErrorContainer} />
        <View style={{ flex: 1 }}>
          <Text variant="labelMedium" style={{ fontWeight: 'bold', color: theme.colors.onErrorContainer }}>
            What you can do
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer, marginTop: 4 }}>
            • Contact customer support for more details{'\n'}
            • You may reapply after 30 days{'\n'}
            • Ensure your documents are clear and valid
          </Text>
        </View>
      </Surface>

      <View style={styles.buttonRow}>
        <Button
          mode="outlined"
          onPress={handleStartOver}
          style={{ flex: 1 }}
        >
          Start Over
        </Button>
        <Button
          mode="contained"
          onPress={() => {/* Open support */}}
          icon="phone"
          style={{ flex: 1 }}
        >
          Contact Us
        </Button>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {status === 'PENDING' || status === 'UNDER_REVIEW' ? renderPendingStatus() : null}
      {status === 'APPROVED' ? renderApprovedStatus() : null}
      {status === 'REJECTED' ? renderRejectedStatus() : null}

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  statusTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  statusMessage: {
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: 12,
    width: '100%',
  },
  accountCard: {
    padding: spacing.lg,
    borderRadius: 16,
    width: '100%',
    marginBottom: spacing.md,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  accountDetails: {
    gap: spacing.sm,
  },
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    width: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default StatusScreen;
