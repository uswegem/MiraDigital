import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  useTheme,
  HelperText,
  SegmentedButtons,
  Menu,
  Divider,
  List,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAccountsStore } from '../../store';
import apiService from '../../services/api';
import { spacing, borderRadius } from '../../theme';

interface TransferScreenProps {
  navigation: any;
}

type TransferType = 'internal' | 'bank' | 'mobile';

export function TransferScreen({ navigation }: TransferScreenProps) {
  const theme = useTheme();
  const { accounts, selectedAccount } = useAccountsStore();

  const [transferType, setTransferType] = useState<TransferType>('internal');
  const [fromAccount, setFromAccount] = useState(selectedAccount?.id || '');
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [selectedBank, setSelectedBank] = useState<{ code: string; name: string } | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const [banks, setBanks] = useState<{ code: string; name: string }[]>([]);
  const [showBankMenu, setShowBankMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validatedName, setValidatedName] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const mobileNetworks = [
    { value: 'MPESA', label: 'M-Pesa (Vodacom)' },
    { value: 'TIGOPESA', label: 'Tigo Pesa' },
    { value: 'AIRTELMONEY', label: 'Airtel Money' },
    { value: 'HALOPESA', label: 'Halo Pesa' },
  ];

  useEffect(() => {
    if (transferType === 'bank') {
      loadBanks();
    }
  }, [transferType]);

  const loadBanks = async () => {
    try {
      const bankList = await apiService.getBanks();
      setBanks(bankList);
    } catch (error) {
      console.error('Failed to load banks:', error);
    }
  };

  const validateAccount = async () => {
    if (transferType !== 'bank' || !toAccount || !selectedBank) return;

    setIsValidating(true);
    try {
      const result = await apiService.validateBankAccount({
        accountNumber: toAccount,
        bankCode: selectedBank.code,
      });
      setValidatedName(result.accountName || '');
      setRecipientName(result.accountName || '');
    } catch (error) {
      setErrors((prev) => ({ ...prev, toAccount: 'Could not validate account' }));
    } finally {
      setIsValidating(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!fromAccount) newErrors.fromAccount = 'Select source account';
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Enter valid amount';

    if (transferType === 'internal') {
      if (!toAccount) newErrors.toAccount = 'Enter destination account';
      if (toAccount === fromAccount) newErrors.toAccount = 'Cannot transfer to same account';
    } else if (transferType === 'bank') {
      if (!toAccount) newErrors.toAccount = 'Enter account number';
      if (!selectedBank) newErrors.bank = 'Select bank';
      if (!recipientName) newErrors.recipientName = 'Enter recipient name';
    } else if (transferType === 'mobile') {
      if (!phoneNumber) newErrors.phoneNumber = 'Enter phone number';
      if (!selectedNetwork) newErrors.network = 'Select network';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTransfer = async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      let result;

      if (transferType === 'internal') {
        result = await apiService.transferInternal({
          fromAccountId: fromAccount,
          toAccountId: toAccount,
          amount: parseFloat(amount),
          narration,
        });
      } else if (transferType === 'bank') {
        result = await apiService.transferExternal({
          fromAccountId: fromAccount,
          destinationAccount: toAccount,
          destinationBank: selectedBank!.code,
          amount: parseFloat(amount),
          recipientName,
          narration,
        });
      } else {
        result = await apiService.transferMobile({
          fromAccountId: fromAccount,
          phoneNumber,
          network: selectedNetwork,
          amount: parseFloat(amount),
          recipientName,
        });
      }

      navigation.navigate('TransferSuccess', { transaction: result });
    } catch (error: any) {
      setErrors({
        general: error.response?.data?.message || 'Transfer failed. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAccountDisplay = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    return account ? `${account.productName} - ${account.accountNo}` : 'Select Account';
  };

  const formatAmount = (value: string) => {
    const num = value.replace(/[^0-9.]/g, '');
    return num;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Transfer Type */}
          <SegmentedButtons
            value={transferType}
            onValueChange={(value) => {
              setTransferType(value as TransferType);
              setToAccount('');
              setValidatedName('');
              setErrors({});
            }}
            buttons={[
              { value: 'internal', label: 'Internal' },
              { value: 'bank', label: 'Bank' },
              { value: 'mobile', label: 'Mobile' },
            ]}
            style={styles.segmentedButtons}
          />

          <Surface style={styles.formCard} elevation={2}>
            {errors.general && (
              <HelperText type="error" visible style={styles.generalError}>
                {errors.general}
              </HelperText>
            )}

            {/* From Account */}
            <Text variant="labelLarge" style={styles.label}>From Account</Text>
            <Menu
              visible={false}
              onDismiss={() => {}}
              anchor={
                <Surface style={styles.selectButton} elevation={1}>
                  <Text>{getAccountDisplay(fromAccount)}</Text>
                </Surface>
              }
            >
              {accounts.map((account) => (
                <Menu.Item
                  key={account.id}
                  title={`${account.productName} - ${account.accountNo}`}
                  onPress={() => setFromAccount(account.id)}
                />
              ))}
            </Menu>

            <Divider style={styles.divider} />

            {/* Transfer Type Specific Fields */}
            {transferType === 'internal' && (
              <>
                <TextInput
                  label="Destination Account Number"
                  value={toAccount}
                  onChangeText={(text) => {
                    setToAccount(text);
                    setErrors((prev) => ({ ...prev, toAccount: '' }));
                  }}
                  mode="outlined"
                  keyboardType="number-pad"
                  error={!!errors.toAccount}
                  style={styles.input}
                />
                {errors.toAccount && <HelperText type="error">{errors.toAccount}</HelperText>}
              </>
            )}

            {transferType === 'bank' && (
              <>
                <Text variant="labelLarge" style={styles.label}>Select Bank</Text>
                <Menu
                  visible={showBankMenu}
                  onDismiss={() => setShowBankMenu(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setShowBankMenu(true)}
                      style={styles.bankButton}
                    >
                      {selectedBank?.name || 'Select Bank'}
                    </Button>
                  }
                >
                  <ScrollView style={{ maxHeight: 300 }}>
                    {banks.map((bank) => (
                      <Menu.Item
                        key={bank.code}
                        title={bank.name}
                        onPress={() => {
                          setSelectedBank(bank);
                          setShowBankMenu(false);
                        }}
                      />
                    ))}
                  </ScrollView>
                </Menu>
                {errors.bank && <HelperText type="error">{errors.bank}</HelperText>}

                <TextInput
                  label="Account Number"
                  value={toAccount}
                  onChangeText={(text) => {
                    setToAccount(text);
                    setValidatedName('');
                  }}
                  onBlur={validateAccount}
                  mode="outlined"
                  keyboardType="number-pad"
                  error={!!errors.toAccount}
                  style={styles.input}
                />
                {errors.toAccount && <HelperText type="error">{errors.toAccount}</HelperText>}
                {validatedName && (
                  <HelperText type="info" style={{ color: theme.colors.primary }}>
                    Account Name: {validatedName}
                  </HelperText>
                )}

                <TextInput
                  label="Recipient Name"
                  value={recipientName}
                  onChangeText={setRecipientName}
                  mode="outlined"
                  error={!!errors.recipientName}
                  style={styles.input}
                />
                {errors.recipientName && <HelperText type="error">{errors.recipientName}</HelperText>}
              </>
            )}

            {transferType === 'mobile' && (
              <>
                <Text variant="labelLarge" style={styles.label}>Select Network</Text>
                <SegmentedButtons
                  value={selectedNetwork}
                  onValueChange={setSelectedNetwork}
                  buttons={mobileNetworks.map((n) => ({
                    value: n.value,
                    label: n.label,
                  }))}
                  style={styles.networkButtons}
                  density="small"
                />
                {errors.network && <HelperText type="error">{errors.network}</HelperText>}

                <TextInput
                  label="Phone Number"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  mode="outlined"
                  keyboardType="phone-pad"
                  placeholder="0712345678"
                  error={!!errors.phoneNumber}
                  style={styles.input}
                />
                {errors.phoneNumber && <HelperText type="error">{errors.phoneNumber}</HelperText>}

                <TextInput
                  label="Recipient Name (Optional)"
                  value={recipientName}
                  onChangeText={setRecipientName}
                  mode="outlined"
                  style={styles.input}
                />
              </>
            )}

            <Divider style={styles.divider} />

            {/* Amount */}
            <TextInput
              label="Amount (TZS)"
              value={amount}
              onChangeText={(text) => setAmount(formatAmount(text))}
              mode="outlined"
              keyboardType="decimal-pad"
              error={!!errors.amount}
              style={styles.input}
            />
            {errors.amount && <HelperText type="error">{errors.amount}</HelperText>}

            {/* Narration */}
            <TextInput
              label="Narration (Optional)"
              value={narration}
              onChangeText={setNarration}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.input}
            />

            <Button
              mode="contained"
              onPress={handleTransfer}
              loading={isLoading}
              disabled={isLoading}
              style={styles.transferButton}
              contentStyle={styles.buttonContent}
            >
              Transfer
            </Button>
          </Surface>
        </ScrollView>
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
  scrollContent: {
    padding: spacing.lg,
  },
  segmentedButtons: {
    marginBottom: spacing.lg,
  },
  formCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  generalError: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  selectButton: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  bankButton: {
    marginBottom: spacing.sm,
  },
  networkButtons: {
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.xs,
  },
  divider: {
    marginVertical: spacing.md,
  },
  transferButton: {
    marginTop: spacing.lg,
  },
  buttonContent: {
    paddingVertical: spacing.xs,
  },
});

export default TransferScreen;
