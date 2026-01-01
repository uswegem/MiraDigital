import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  TextInput,
  Button,
  HelperText,
  SegmentedButtons,
  Searchbar,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiService from '../../services/api';
import { useAccountsStore } from '../../store';
import { spacing, borderRadius } from '../../theme';

interface BillPaymentScreenProps {
  navigation: any;
}

interface Biller {
  code: string;
  name: string;
  category: string;
  logo?: string;
  minAmount?: number;
  maxAmount?: number;
}

type BillCategory = 'all' | 'utilities' | 'telecom' | 'government' | 'education';

export function BillPaymentScreen({ navigation }: BillPaymentScreenProps) {
  const theme = useTheme();
  const { accounts, selectedAccount } = useAccountsStore();

  const [category, setCategory] = useState<BillCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [billers, setBillers] = useState<Biller[]>([]);
  const [filteredBillers, setFilteredBillers] = useState<Biller[]>([]);
  const [selectedBiller, setSelectedBiller] = useState<Biller | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [validatedInfo, setValidatedInfo] = useState<{ name?: string; balance?: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadBillers();
  }, []);

  useEffect(() => {
    filterBillers();
  }, [category, searchQuery, billers]);

  const loadBillers = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getBillers();
      setBillers(data);
    } catch (error) {
      console.error('Failed to load billers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterBillers = () => {
    let filtered = billers;

    if (category !== 'all') {
      filtered = filtered.filter((b) => b.category.toLowerCase() === category);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) => b.name.toLowerCase().includes(query) || b.code.toLowerCase().includes(query)
      );
    }

    setFilteredBillers(filtered);
  };

  const validateBiller = async () => {
    if (!selectedBiller || !accountNumber) return;

    setIsValidating(true);
    setValidatedInfo(null);
    try {
      const result = await apiService.validateBiller(selectedBiller.code, accountNumber);
      if (result.valid) {
        setValidatedInfo({
          name: result.customerName,
          balance: result.balance,
        });
        if (result.balance) {
          setAmount(result.balance.toString());
        }
      } else {
        setErrors({ accountNumber: result.message || 'Invalid account number' });
      }
    } catch (error: any) {
      setErrors({ accountNumber: error.response?.data?.message || 'Validation failed' });
    } finally {
      setIsValidating(false);
    }
  };

  const handlePayBill = async () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!selectedBiller) newErrors.biller = 'Select a biller';
    if (!accountNumber) newErrors.accountNumber = 'Enter account number';
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = 'Enter valid amount';
    
    if (selectedBiller) {
      const amountNum = parseFloat(amount);
      if (selectedBiller.minAmount && amountNum < selectedBiller.minAmount) {
        newErrors.amount = `Minimum amount is ${selectedBiller.minAmount}`;
      }
      if (selectedBiller.maxAmount && amountNum > selectedBiller.maxAmount) {
        newErrors.amount = `Maximum amount is ${selectedBiller.maxAmount}`;
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      const result = await apiService.payBill({
        billerCode: selectedBiller!.code,
        accountNumber,
        amount: parseFloat(amount),
        fromAccountId: selectedAccount?.id || accounts[0]?.id,
      });

      navigation.navigate('PaymentSuccess', { transaction: result });
    } catch (error: any) {
      setErrors({
        general: error.response?.data?.message || 'Payment failed. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryIcon = (cat: string) => {
    const icons: { [key: string]: string } = {
      utilities: 'flash',
      telecom: 'cellphone',
      government: 'bank',
      education: 'school',
      insurance: 'shield',
      other: 'dots-horizontal',
    };
    return icons[cat.toLowerCase()] || 'receipt';
  };

  const renderBillerSelection = () => (
    <>
      <Searchbar
        placeholder="Search billers..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchbar}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        <SegmentedButtons
          value={category}
          onValueChange={(val) => setCategory(val as BillCategory)}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'utilities', label: 'Utilities' },
            { value: 'telecom', label: 'Telecom' },
            { value: 'government', label: 'Govt' },
            { value: 'education', label: 'Education' },
          ]}
          density="small"
        />
      </ScrollView>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <View style={styles.billersGrid}>
          {filteredBillers.map((biller) => (
            <TouchableOpacity
              key={biller.code}
              style={styles.billerItem}
              onPress={() => setSelectedBiller(biller)}
            >
              <Surface style={styles.billerCard} elevation={1}>
                {biller.logo ? (
                  <Image source={{ uri: biller.logo }} style={styles.billerLogo} />
                ) : (
                  <View style={[styles.billerIconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                    <Icon name={getCategoryIcon(biller.category)} size={24} color={theme.colors.primary} />
                  </View>
                )}
                <Text variant="labelSmall" numberOfLines={2} style={styles.billerName}>
                  {biller.name}
                </Text>
              </Surface>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );

  const renderPaymentForm = () => (
    <Surface style={styles.formCard} elevation={2}>
      <TouchableOpacity
        style={styles.selectedBiller}
        onPress={() => setSelectedBiller(null)}
      >
        <View style={styles.selectedBillerInfo}>
          {selectedBiller?.logo ? (
            <Image source={{ uri: selectedBiller.logo }} style={styles.selectedLogo} />
          ) : (
            <View style={[styles.selectedIconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
              <Icon name={getCategoryIcon(selectedBiller?.category || '')} size={24} color={theme.colors.primary} />
            </View>
          )}
          <View>
            <Text variant="titleMedium">{selectedBiller?.name}</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {selectedBiller?.category}
            </Text>
          </View>
        </View>
        <Icon name="pencil" size={20} color={theme.colors.primary} />
      </TouchableOpacity>

      <Divider style={styles.divider} />

      {errors.general && (
        <HelperText type="error" visible>{errors.general}</HelperText>
      )}

      <TextInput
        label="Account/Reference Number"
        value={accountNumber}
        onChangeText={(text) => {
          setAccountNumber(text);
          setValidatedInfo(null);
          setErrors((prev) => ({ ...prev, accountNumber: '' }));
        }}
        onBlur={validateBiller}
        mode="outlined"
        error={!!errors.accountNumber}
        right={isValidating ? <TextInput.Icon icon={() => <ActivityIndicator size={20} />} /> : null}
        style={styles.input}
      />
      {errors.accountNumber && <HelperText type="error">{errors.accountNumber}</HelperText>}
      
      {validatedInfo && (
        <Surface style={styles.validatedInfo} elevation={1}>
          <Icon name="check-circle" size={20} color={theme.colors.primary} />
          <View style={styles.validatedText}>
            <Text variant="bodyMedium">{validatedInfo.name}</Text>
            {validatedInfo.balance !== undefined && (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Outstanding: TZS {validatedInfo.balance.toLocaleString()}
              </Text>
            )}
          </View>
        </Surface>
      )}

      <TextInput
        label="Amount (TZS)"
        value={amount}
        onChangeText={(text) => {
          setAmount(text.replace(/[^0-9.]/g, ''));
          setErrors((prev) => ({ ...prev, amount: '' }));
        }}
        mode="outlined"
        keyboardType="decimal-pad"
        error={!!errors.amount}
        style={styles.input}
      />
      {errors.amount && <HelperText type="error">{errors.amount}</HelperText>}

      <Button
        mode="contained"
        onPress={handlePayBill}
        loading={isLoading}
        disabled={isLoading || !validatedInfo}
        style={styles.payButton}
        contentStyle={styles.buttonContent}
      >
        Pay Bill
      </Button>
    </Surface>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {selectedBiller ? renderPaymentForm() : renderBillerSelection()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  searchbar: {
    marginBottom: spacing.md,
  },
  categoryScroll: {
    marginBottom: spacing.lg,
  },
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  billersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  billerItem: {
    width: '25%',
    padding: spacing.xs,
  },
  billerCard: {
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  billerLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: spacing.xs,
  },
  billerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  billerName: {
    textAlign: 'center',
  },
  formCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  selectedBiller: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedBillerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
  },
  selectedIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  divider: {
    marginVertical: spacing.lg,
  },
  input: {
    marginBottom: spacing.sm,
  },
  validatedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    backgroundColor: '#E8F5E9',
  },
  validatedText: {
    marginLeft: spacing.sm,
  },
  payButton: {
    marginTop: spacing.lg,
  },
  buttonContent: {
    paddingVertical: spacing.xs,
  },
});

export default BillPaymentScreen;
