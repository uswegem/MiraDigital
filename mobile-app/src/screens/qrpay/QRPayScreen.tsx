import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
  Vibration,
  Alert,
} from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  Button,
  TextInput,
  ActivityIndicator,
  Portal,
  Modal,
  IconButton,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, CameraType } from 'react-native-camera-kit';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiService from '../../services/api';
import { useAccountsStore } from '../../store';
import { spacing, borderRadius } from '../../theme';

const { width, height } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.7;

interface QRPayScreenProps {
  navigation: any;
}

// TanQR / EMVCo QR Code Data Structure
interface MerchantQRData {
  // EMVCo standard fields
  payloadFormatIndicator: string;
  pointOfInitiation: '11' | '12'; // 11 = Static, 12 = Dynamic
  merchantAccountInfo: {
    globallyUniqueId: string;
    merchantId: string;
    merchantName?: string;
  };
  merchantCategoryCode: string;
  transactionCurrency: string;
  transactionAmount?: number;
  countryCode: string;
  merchantName: string;
  merchantCity: string;
  additionalData?: {
    billNumber?: string;
    referenceLabel?: string;
    terminalLabel?: string;
  };
  crc: string;
  // Parsed convenience fields
  rawQRData: string;
  isValid: boolean;
  errorMessage?: string;
}

type ScanMode = 'camera' | 'manual';

export function QRPayScreen({ navigation }: QRPayScreenProps) {
  const theme = useTheme();
  const { accounts, selectedAccount } = useAccountsStore();

  // State management
  const [scanMode, setScanMode] = useState<ScanMode>('camera');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [scannedData, setScannedData] = useState<MerchantQRData | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validatedMerchant, setValidatedMerchant] = useState<{
    name: string;
    accountNumber: string;
    bankName: string;
  } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Check camera permission
  useEffect(() => {
    checkCameraPermission();
  }, []);

  const checkCameraPermission = async () => {
    // react-native-camera-kit handles permissions internally
    // but we should still show appropriate UI
    setHasPermission(true);
  };

  /**
   * Parse EMVCo / TanQR QR Code
   * TanQR follows EMVCo QR Code Specification for Payment Systems
   * 
   * Format: Tag-Length-Value (TLV) structure
   * Common Tags:
   * - 00: Payload Format Indicator
   * - 01: Point of Initiation Method
   * - 26-51: Merchant Account Information
   * - 52: Merchant Category Code
   * - 53: Transaction Currency
   * - 54: Transaction Amount
   * - 58: Country Code
   * - 59: Merchant Name
   * - 60: Merchant City
   * - 62: Additional Data Field Template
   * - 63: CRC
   */
  const parseEMVCoQR = (qrString: string): MerchantQRData => {
    const result: MerchantQRData = {
      payloadFormatIndicator: '',
      pointOfInitiation: '11',
      merchantAccountInfo: {
        globallyUniqueId: '',
        merchantId: '',
      },
      merchantCategoryCode: '',
      transactionCurrency: '834', // TZS
      countryCode: 'TZ',
      merchantName: '',
      merchantCity: '',
      crc: '',
      rawQRData: qrString,
      isValid: false,
    };

    try {
      let position = 0;

      while (position < qrString.length) {
        // Read tag (2 characters)
        const tag = qrString.substring(position, position + 2);
        position += 2;

        // Read length (2 characters)
        const length = parseInt(qrString.substring(position, position + 2), 10);
        position += 2;

        // Read value
        const value = qrString.substring(position, position + length);
        position += length;

        switch (tag) {
          case '00':
            result.payloadFormatIndicator = value;
            break;
          case '01':
            result.pointOfInitiation = value as '11' | '12';
            break;
          case '26': // TanQR Merchant Account Info (Bank of Tanzania)
          case '27':
          case '28':
          case '29':
          case '30':
          case '31':
            // Parse nested TLV for merchant account info
            const merchantInfo = parseMerchantAccountInfo(value);
            result.merchantAccountInfo = {
              ...result.merchantAccountInfo,
              ...merchantInfo,
            };
            break;
          case '52':
            result.merchantCategoryCode = value;
            break;
          case '53':
            result.transactionCurrency = value;
            break;
          case '54':
            result.transactionAmount = parseFloat(value);
            break;
          case '58':
            result.countryCode = value;
            break;
          case '59':
            result.merchantName = value;
            break;
          case '60':
            result.merchantCity = value;
            break;
          case '62':
            result.additionalData = parseAdditionalData(value);
            break;
          case '63':
            result.crc = value;
            break;
        }
      }

      // Validate CRC16
      const isValidCRC = validateCRC16(qrString);
      result.isValid = isValidCRC && result.merchantName.length > 0;

      if (!result.isValid) {
        result.errorMessage = 'Invalid QR code format or CRC check failed';
      }
    } catch (error) {
      result.isValid = false;
      result.errorMessage = 'Failed to parse QR code';
    }

    return result;
  };

  /**
   * Parse Merchant Account Information (nested TLV)
   */
  const parseMerchantAccountInfo = (data: string): Partial<MerchantQRData['merchantAccountInfo']> => {
    const info: Partial<MerchantQRData['merchantAccountInfo']> = {};
    let position = 0;

    while (position < data.length) {
      const tag = data.substring(position, position + 2);
      position += 2;
      const length = parseInt(data.substring(position, position + 2), 10);
      position += 2;
      const value = data.substring(position, position + length);
      position += length;

      switch (tag) {
        case '00':
          info.globallyUniqueId = value;
          break;
        case '01':
          info.merchantId = value;
          break;
        case '02':
        case '03':
          info.merchantName = value;
          break;
      }
    }

    return info;
  };

  /**
   * Parse Additional Data Field (Tag 62)
   */
  const parseAdditionalData = (data: string): MerchantQRData['additionalData'] => {
    const additionalData: MerchantQRData['additionalData'] = {};
    let position = 0;

    while (position < data.length) {
      const tag = data.substring(position, position + 2);
      position += 2;
      const length = parseInt(data.substring(position, position + 2), 10);
      position += 2;
      const value = data.substring(position, position + length);
      position += length;

      switch (tag) {
        case '01':
          additionalData.billNumber = value;
          break;
        case '05':
          additionalData.referenceLabel = value;
          break;
        case '07':
          additionalData.terminalLabel = value;
          break;
      }
    }

    return additionalData;
  };

  /**
   * Validate CRC16 checksum (CCITT)
   */
  const validateCRC16 = (qrString: string): boolean => {
    if (qrString.length < 8) return false;

    // CRC is last 4 characters
    const dataToCheck = qrString.slice(0, -4);
    const providedCRC = qrString.slice(-4).toUpperCase();

    // Calculate CRC16-CCITT
    let crc = 0xFFFF;
    const polynomial = 0x1021;

    for (let i = 0; i < dataToCheck.length; i++) {
      crc ^= dataToCheck.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ polynomial;
        } else {
          crc <<= 1;
        }
        crc &= 0xFFFF;
      }
    }

    const calculatedCRC = crc.toString(16).toUpperCase().padStart(4, '0');
    return calculatedCRC === providedCRC;
  };

  /**
   * Handle QR code scanned from camera
   */
  const onQRCodeScanned = useCallback((event: { nativeEvent: { codeStringValue: string } }) => {
    if (!isScanning) return;

    const qrData = event.nativeEvent.codeStringValue;
    if (!qrData) return;

    setIsScanning(false);
    Vibration.vibrate(100);

    // Parse the QR code
    const parsedData = parseEMVCoQR(qrData);
    
    if (parsedData.isValid) {
      setScannedData(parsedData);
      
      // If amount is in QR code (dynamic QR), pre-fill it
      if (parsedData.transactionAmount) {
        setAmount(parsedData.transactionAmount.toString());
      }
      
      // Pre-fill reference if available
      if (parsedData.additionalData?.referenceLabel) {
        setReference(parsedData.additionalData.referenceLabel);
      }

      // Validate merchant through TIPS
      validateMerchant(parsedData);
    } else {
      Alert.alert(
        'Invalid QR Code',
        parsedData.errorMessage || 'This QR code is not a valid TanQR payment code.',
        [
          { text: 'Scan Again', onPress: () => setIsScanning(true) },
          { text: 'Enter Manually', onPress: () => setScanMode('manual') },
        ]
      );
    }
  }, [isScanning]);

  /**
   * Validate merchant account through TIPS
   */
  const validateMerchant = async (qrData: MerchantQRData) => {
    setIsValidating(true);
    try {
      const result = await apiService.validateQRMerchant({
        merchantId: qrData.merchantAccountInfo.merchantId,
        merchantName: qrData.merchantName,
        qrData: qrData.rawQRData,
      });

      if (result.valid) {
        setValidatedMerchant({
          name: result.merchantName,
          accountNumber: result.accountNumber,
          bankName: result.bankName,
        });
      } else {
        Alert.alert('Validation Failed', result.message || 'Could not validate merchant');
        setScannedData(null);
        setIsScanning(true);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to validate merchant');
      setScannedData(null);
      setIsScanning(true);
    } finally {
      setIsValidating(false);
    }
  };

  /**
   * Handle manual merchant ID entry
   */
  const handleManualLookup = async () => {
    if (!manualInput.trim()) {
      setErrors({ manualInput: 'Enter merchant ID or pay bill number' });
      return;
    }

    setIsValidating(true);
    setErrors({});

    try {
      const result = await apiService.lookupQRMerchant(manualInput.trim());

      if (result.found) {
        setValidatedMerchant({
          name: result.merchantName,
          accountNumber: result.accountNumber,
          bankName: result.bankName,
        });
        
        // Create synthetic QR data for consistency
        setScannedData({
          payloadFormatIndicator: '01',
          pointOfInitiation: '11',
          merchantAccountInfo: {
            globallyUniqueId: 'TZ.BOT.TIPS',
            merchantId: manualInput.trim(),
          },
          merchantCategoryCode: result.mcc || '0000',
          transactionCurrency: '834',
          countryCode: 'TZ',
          merchantName: result.merchantName,
          merchantCity: result.city || '',
          crc: '',
          rawQRData: '',
          isValid: true,
        });
      } else {
        setErrors({ manualInput: result.message || 'Merchant not found' });
      }
    } catch (error: any) {
      setErrors({ manualInput: error.message || 'Lookup failed' });
    } finally {
      setIsValidating(false);
    }
  };

  /**
   * Validate payment form
   */
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Enter a valid amount';
    }

    // Check minimum amount (e.g., 100 TZS)
    if (parseFloat(amount) < 100) {
      newErrors.amount = 'Minimum amount is TZS 100';
    }

    // Check maximum amount (e.g., 10,000,000 TZS)
    if (parseFloat(amount) > 10000000) {
      newErrors.amount = 'Maximum amount is TZS 10,000,000';
    }

    // Check sufficient balance
    const sourceAccount = accounts.find(a => a.id === selectedAccount?.id) || accounts[0];
    if (sourceAccount && parseFloat(amount) > sourceAccount.availableBalance) {
      newErrors.amount = 'Insufficient balance';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Process the QR payment through TIPS
   */
  const handlePayment = async () => {
    if (!validateForm()) return;
    if (!scannedData || !validatedMerchant) return;

    setShowConfirmModal(false);
    setIsProcessing(true);

    try {
      const sourceAccount = accounts.find(a => a.id === selectedAccount?.id) || accounts[0];

      const result = await apiService.payQRMerchant({
        fromAccountId: sourceAccount.id,
        merchantId: scannedData.merchantAccountInfo.merchantId,
        merchantName: validatedMerchant.name,
        merchantAccount: validatedMerchant.accountNumber,
        merchantBank: validatedMerchant.bankName,
        amount: parseFloat(amount),
        reference: reference || scannedData.additionalData?.referenceLabel || '',
        qrData: scannedData.rawQRData,
        currency: 'TZS',
      });

      navigation.navigate('PaymentSuccess', {
        transaction: {
          ...result,
          type: 'QR_PAYMENT',
          merchantName: validatedMerchant.name,
        },
      });
    } catch (error: any) {
      Alert.alert(
        'Payment Failed',
        error.response?.data?.message || error.message || 'Failed to process payment',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Reset scanner to scan again
   */
  const resetScanner = () => {
    setScannedData(null);
    setValidatedMerchant(null);
    setAmount('');
    setReference('');
    setErrors({});
    setIsScanning(true);
    setScanMode('camera');
  };

  /**
   * Format currency
   */
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Camera permission not granted
  if (hasPermission === false) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.centerContent}>
          <Icon name="camera-off" size={80} color={theme.colors.outline} />
          <Text variant="titleMedium" style={styles.errorText}>
            Camera Permission Required
          </Text>
          <Text variant="bodyMedium" style={[styles.errorSubtext, { color: theme.colors.outline }]}>
            Please enable camera access to scan QR codes
          </Text>
          <Button
            mode="contained"
            onPress={() => setScanMode('manual')}
            style={styles.manualButton}
          >
            Enter Manually
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Merchant scanned/validated - Show payment form
  if (scannedData && validatedMerchant) {
    const sourceAccount = accounts.find(a => a.id === selectedAccount?.id) || accounts[0];

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
          <Text variant="titleLarge" style={styles.headerTitle}>Pay Merchant</Text>
          <IconButton icon="qrcode-scan" onPress={resetScanner} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Merchant Info Card */}
          <Surface style={[styles.merchantCard, { backgroundColor: theme.colors.primaryContainer }]}>
            <View style={styles.merchantIcon}>
              <Icon name="store" size={40} color={theme.colors.primary} />
            </View>
            <Text variant="titleMedium" style={styles.merchantName}>
              {validatedMerchant.name}
            </Text>
            <Text variant="bodySmall" style={styles.merchantDetails}>
              {validatedMerchant.bankName}
            </Text>
            <Text variant="bodySmall" style={styles.merchantDetails}>
              Account: {validatedMerchant.accountNumber}
            </Text>
          </Surface>

          {/* Source Account */}
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text variant="labelMedium" style={styles.cardLabel}>Pay From</Text>
            <View style={styles.accountRow}>
              <Icon name="wallet" size={24} color={theme.colors.primary} />
              <View style={styles.accountInfo}>
                <Text variant="bodyMedium">{sourceAccount?.productName}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                  {sourceAccount?.accountNo}
                </Text>
              </View>
              <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                {formatCurrency(sourceAccount?.availableBalance || 0)}
              </Text>
            </View>
          </Surface>

          {/* Amount Input */}
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text variant="labelMedium" style={styles.cardLabel}>Amount (TZS)</Text>
            <TextInput
              mode="outlined"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="Enter amount"
              left={<TextInput.Affix text="TZS" />}
              error={!!errors.amount}
              disabled={!!scannedData.transactionAmount}
              style={styles.input}
            />
            {errors.amount && (
              <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                {errors.amount}
              </Text>
            )}
            {scannedData.transactionAmount && (
              <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
                Amount specified by merchant
              </Text>
            )}
          </Surface>

          {/* Reference Input */}
          <Surface style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text variant="labelMedium" style={styles.cardLabel}>Reference (Optional)</Text>
            <TextInput
              mode="outlined"
              value={reference}
              onChangeText={setReference}
              placeholder="Payment reference or note"
              style={styles.input}
            />
          </Surface>
        </ScrollView>

        {/* Pay Button */}
        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={() => validateForm() && setShowConfirmModal(true)}
            loading={isProcessing}
            disabled={isProcessing || !amount}
            style={styles.payButton}
            contentStyle={styles.payButtonContent}
          >
            {isProcessing ? 'Processing...' : `Pay ${amount ? formatCurrency(parseFloat(amount)) : ''}`}
          </Button>
        </View>

        {/* Confirmation Modal */}
        <Portal>
          <Modal
            visible={showConfirmModal}
            onDismiss={() => setShowConfirmModal(false)}
            contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
          >
            <Text variant="titleLarge" style={styles.modalTitle}>Confirm Payment</Text>
            <Divider style={styles.modalDivider} />
            
            <View style={styles.confirmRow}>
              <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>Merchant</Text>
              <Text variant="bodyMedium">{validatedMerchant.name}</Text>
            </View>
            <View style={styles.confirmRow}>
              <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>Amount</Text>
              <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                {formatCurrency(parseFloat(amount || '0'))}
              </Text>
            </View>
            <View style={styles.confirmRow}>
              <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>From</Text>
              <Text variant="bodyMedium">{sourceAccount?.accountNo}</Text>
            </View>
            {reference && (
              <View style={styles.confirmRow}>
                <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>Reference</Text>
                <Text variant="bodyMedium">{reference}</Text>
              </View>
            )}

            <Divider style={styles.modalDivider} />

            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => setShowConfirmModal(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handlePayment}
                loading={isProcessing}
                style={styles.modalButton}
              >
                Confirm
              </Button>
            </View>
          </Modal>
        </Portal>
      </SafeAreaView>
    );
  }

  // Manual entry mode
  if (scanMode === 'manual') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
          <Text variant="titleLarge" style={styles.headerTitle}>Enter Merchant ID</Text>
          <IconButton icon="qrcode-scan" onPress={() => setScanMode('camera')} />
        </View>

        <View style={styles.manualContainer}>
          <Icon name="store-marker" size={80} color={theme.colors.primary} />
          <Text variant="bodyMedium" style={styles.manualDescription}>
            Enter the merchant ID, pay bill number, or till number to make a payment
          </Text>

          <TextInput
            mode="outlined"
            label="Merchant ID / Pay Bill Number"
            value={manualInput}
            onChangeText={setManualInput}
            placeholder="e.g., 888111 or MERCHANT123"
            error={!!errors.manualInput}
            style={styles.manualInput}
            autoCapitalize="characters"
          />
          {errors.manualInput && (
            <Text variant="bodySmall" style={{ color: theme.colors.error, marginBottom: spacing.md }}>
              {errors.manualInput}
            </Text>
          )}

          <Button
            mode="contained"
            onPress={handleManualLookup}
            loading={isValidating}
            disabled={isValidating || !manualInput.trim()}
            style={styles.lookupButton}
          >
            Look Up Merchant
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Camera scanner mode
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" iconColor="#FFF" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={[styles.headerTitle, { color: '#FFF' }]}>
          Scan TanQR Code
        </Text>
        <IconButton
          icon="keyboard"
          iconColor="#FFF"
          onPress={() => setScanMode('manual')}
        />
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <Camera
          style={StyleSheet.absoluteFill}
          cameraType={CameraType.Back}
          scanBarcode={isScanning}
          onReadCode={onQRCodeScanned}
          showFrame={false}
        />

        {/* Overlay with scan area */}
        <View style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.scanArea}>
              {/* Corner brackets */}
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
              
              {isValidating && (
                <View style={styles.scanningIndicator}>
                  <ActivityIndicator size="large" color="#FFF" />
                  <Text style={styles.scanningText}>Validating...</Text>
                </View>
              )}
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom}>
            <Text style={styles.instructionText}>
              Point your camera at a TanQR code
            </Text>
            <Text style={styles.subInstructionText}>
              The code will be scanned automatically
            </Text>
          </View>
        </View>
      </View>

      {/* Torch toggle and manual entry option */}
      <View style={styles.bottomControls}>
        <Button
          mode="outlined"
          onPress={() => setScanMode('manual')}
          textColor="#FFF"
          style={styles.manualEntryButton}
        >
          Enter Manually
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    zIndex: 10,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  manualButton: {
    marginTop: spacing.xl,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: SCAN_AREA_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#FFF',
    borderWidth: 3,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanningIndicator: {
    alignItems: 'center',
  },
  scanningText: {
    color: '#FFF',
    marginTop: spacing.sm,
    fontSize: 16,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: spacing.xl,
  },
  instructionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  subInstructionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: spacing.xs,
  },
  bottomControls: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: spacing.lg,
    alignItems: 'center',
  },
  manualEntryButton: {
    borderColor: 'rgba(255,255,255,0.5)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  merchantCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  merchantIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  merchantName: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  merchantDetails: {
    opacity: 0.8,
  },
  card: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  cardLabel: {
    marginBottom: spacing.sm,
    opacity: 0.7,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  input: {
    backgroundColor: 'transparent',
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
  },
  payButton: {
    borderRadius: borderRadius.md,
  },
  payButtonContent: {
    paddingVertical: spacing.sm,
  },
  modal: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  modalTitle: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalDivider: {
    marginVertical: spacing.lg,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
  manualContainer: {
    flex: 1,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualDescription: {
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    opacity: 0.7,
  },
  manualInput: {
    width: '100%',
    marginBottom: spacing.md,
  },
  lookupButton: {
    width: '100%',
  },
});

export default QRPayScreen;
