import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  Button,
  ActivityIndicator,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LottieView from 'lottie-react-native';
import apiService from '../../services/api';
import { visaNFC } from '../../native-modules/VisaNFC';
import { spacing, borderRadius } from '../../theme';

const { width } = Dimensions.get('window');

interface TapToPayScreenProps {
  navigation: any;
  route: {
    params?: {
      cardId?: string;
    };
  };
}

type PaymentState = 'idle' | 'preparing' | 'ready' | 'processing' | 'success' | 'error';

export function TapToPayScreen({ navigation, route }: TapToPayScreenProps) {
  const theme = useTheme();
  const { cardId } = route.params || {};

  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [nfcStatus, setNfcStatus] = useState<{
    supported: boolean;
    enabled: boolean;
  } | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    checkNFCStatus();
    startPulseAnimation();
  }, []);

  const checkNFCStatus = async () => {
    const status = await visaNFC.checkNFCSupport();
    setNfcStatus(status);
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const preparePayment = async () => {
    if (!cardId) {
      setError('No card selected');
      return;
    }

    setPaymentState('preparing');
    setError('');

    try {
      // Get payment data from server
      const data = await apiService.prepareTapToPay(cardId, {
        merchantId: 'DEMO_MERCHANT',
        merchantName: 'Demo Store',
        amount: 10000, // Demo amount
      });

      setPaymentData(data);
      setPaymentState('ready');

      // Start NFC session
      await startNFCPayment(data);
    } catch (err: any) {
      setError(err.message || 'Failed to prepare payment');
      setPaymentState('error');
    }
  };

  const startNFCPayment = async (data: any) => {
    setPaymentState('processing');

    try {
      const result = await visaNFC.startPaymentSession({
        token: data.paymentData.token,
        cryptogram: data.paymentData.cryptogram,
        amount: data.transaction.amount,
        merchantName: data.transaction.merchantName,
      });

      if (result.success) {
        setResult(result.transactionResult);
        setPaymentState('success');
      } else {
        setError('Payment declined');
        setPaymentState('error');
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      setPaymentState('error');
    }
  };

  const handleEnableNFC = async () => {
    try {
      await visaNFC.requestEnableNFC();
      // Recheck after user returns
      setTimeout(checkNFCStatus, 1000);
    } catch (err) {
      // Handle error
    }
  };

  const renderNFCUnavailable = () => (
    <View style={styles.centeredContent}>
      <Icon name="nfc-off" size={80} color={theme.colors.error} />
      <Text variant="headlineSmall" style={styles.title}>
        NFC Not Available
      </Text>
      <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        {nfcStatus?.supported
          ? 'Please enable NFC in your device settings'
          : 'This device does not support NFC payments'}
      </Text>
      {nfcStatus?.supported && !nfcStatus?.enabled && (
        <Button mode="contained" onPress={handleEnableNFC} style={styles.button}>
          Open NFC Settings
        </Button>
      )}
    </View>
  );

  const renderIdle = () => (
    <View style={styles.centeredContent}>
      <Surface style={[styles.nfcCircle, { backgroundColor: theme.colors.primaryContainer }]} elevation={4}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Icon name="contactless-payment" size={80} color={theme.colors.primary} />
        </Animated.View>
      </Surface>
      <Text variant="headlineSmall" style={styles.title}>
        Tap & Pay
      </Text>
      <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Hold your phone near the payment terminal to pay
      </Text>
      <Button mode="contained" onPress={preparePayment} style={styles.button}>
        Start Payment
      </Button>
    </View>
  );

  const renderPreparing = () => (
    <View style={styles.centeredContent}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text variant="titleMedium" style={styles.statusText}>
        Preparing payment...
      </Text>
    </View>
  );

  const renderReady = () => (
    <View style={styles.centeredContent}>
      <Surface style={[styles.nfcCircle, { backgroundColor: theme.colors.primary }]} elevation={4}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Icon name="contactless-payment" size={80} color="#FFFFFF" />
        </Animated.View>
      </Surface>
      <Text variant="headlineSmall" style={styles.title}>
        Ready to Pay
      </Text>
      <Text variant="headlineMedium" style={[styles.amount, { color: theme.colors.primary }]}>
        TZS {paymentData?.transaction?.amount?.toLocaleString() || '0'}
      </Text>
      <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Hold your phone near the terminal
      </Text>
    </View>
  );

  const renderProcessing = () => (
    <View style={styles.centeredContent}>
      <Surface style={[styles.nfcCircle, { backgroundColor: theme.colors.tertiary }]} elevation={4}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </Surface>
      <Text variant="titleMedium" style={styles.statusText}>
        Processing payment...
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Do not move your phone
      </Text>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.centeredContent}>
      <Surface style={[styles.nfcCircle, { backgroundColor: '#4CAF50' }]} elevation={4}>
        <Icon name="check" size={80} color="#FFFFFF" />
      </Surface>
      <Text variant="headlineSmall" style={styles.title}>
        Payment Successful!
      </Text>
      <Text variant="headlineMedium" style={[styles.amount, { color: '#4CAF50' }]}>
        TZS {result?.amount?.toLocaleString() || '0'}
      </Text>
      <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        {result?.merchantName}
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Auth Code: {result?.authorizationCode}
      </Text>
      <Button mode="contained" onPress={() => navigation.goBack()} style={styles.button}>
        Done
      </Button>
    </View>
  );

  const renderError = () => (
    <View style={styles.centeredContent}>
      <Surface style={[styles.nfcCircle, { backgroundColor: theme.colors.error }]} elevation={4}>
        <Icon name="close" size={80} color="#FFFFFF" />
      </Surface>
      <Text variant="headlineSmall" style={styles.title}>
        Payment Failed
      </Text>
      <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.error }]}>
        {error}
      </Text>
      <Button mode="contained" onPress={preparePayment} style={styles.button}>
        Try Again
      </Button>
      <Button mode="text" onPress={() => navigation.goBack()}>
        Cancel
      </Button>
    </View>
  );

  const renderContent = () => {
    if (!nfcStatus) {
      return (
        <View style={styles.centeredContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    if (!nfcStatus.supported || !nfcStatus.enabled) {
      return renderNFCUnavailable();
    }

    switch (paymentState) {
      case 'preparing':
        return renderPreparing();
      case 'ready':
        return renderReady();
      case 'processing':
        return renderProcessing();
      case 'success':
        return renderSuccess();
      case 'error':
        return renderError();
      default:
        return renderIdle();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  nfcCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  amount: {
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  statusText: {
    marginTop: spacing.lg,
  },
  button: {
    marginTop: spacing.lg,
    minWidth: 200,
  },
});

export default TapToPayScreen;
