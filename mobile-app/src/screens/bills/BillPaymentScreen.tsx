import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  StatusBar,
  Alert,
} from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  TextInput,
  Button,
  HelperText,
  Searchbar,
  ActivityIndicator,
  Divider,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  Layout,
  FadeInDown,
} from 'react-native-reanimated';
import apiService from '../../services/api';
import { useAccountsStore, useBillerStore } from '../../store';
import { spacing, borderRadius } from '../../theme';
import { colors } from '../../theme/colors';
import { AccountInfoCardSimple } from '../../components/AccountInfoCard';
import { ConfirmTransactionModal, SuccessModal, TransactionDetail } from '../../components/TransactionModals';

interface BillPaymentScreenProps {
  navigation: any;
  route: any;
}

interface Biller {
  code: string;
  name: string;
  category: string;
  icon?: string;
  color?: string;
  logo?: string;
  minAmount?: number;
  maxAmount?: number;
}

interface BillerCategory {
  title: string;
  items: Biller[];
}

// All available billers with icons
const ALL_BILLERS: Biller[] = [
  // Airtime
  { code: 'AIRTEL', name: 'Airtel', category: 'airtime', icon: 'cellphone-wireless', color: '#E60000' },
  { code: 'YAS', name: 'Yas', category: 'airtime', icon: 'cellphone-text', color: '#00A859' },
  { code: 'VODACOM', name: 'Vodacom', category: 'airtime', icon: 'cellphone-sound', color: '#E60000' },
  { code: 'HALOTEL', name: 'Halotel', category: 'airtime', icon: 'cellphone-arrow-down', color: '#F7941E' },
  { code: 'TTCL', name: 'TTCL', category: 'airtime', icon: 'phone-classic', color: '#0066CC' },
  
  // Internet & Broadband
  { code: 'ZUKU_FIBER', name: 'Zuku Fiber', category: 'internet', icon: 'wifi', color: '#FF6B00' },
  { code: 'TTCL_4G', name: 'TTCL 4G', category: 'internet', icon: 'router-wireless', color: '#0066CC' },
  { code: 'SIMPLY', name: 'SIMPLY', category: 'internet', icon: 'web', color: '#4CAF50' },
  { code: 'GOFIBRE', name: 'GoFibre', category: 'internet', icon: 'lan', color: '#2196F3' },
  { code: 'ZESHA', name: 'Zesha', category: 'internet', icon: 'access-point', color: '#9C27B0' },
  
  // TV Subscriptions
  { code: 'AZAMTV', name: 'AzamTV', category: 'tv', icon: 'television-classic', color: '#00A651' },
  { code: 'DSTV', name: 'DSTV', category: 'tv', icon: 'satellite-variant', color: '#0033A0' },
  { code: 'STARTIMES', name: 'StarTimes', category: 'tv', icon: 'star-circle', color: '#FFD700' },
  { code: 'ZUKU_TV', name: 'ZUKU', category: 'tv', icon: 'television-box', color: '#FF6B00' },
  { code: 'AZAMTV_APP', name: 'AzamTV App', category: 'tv', icon: 'television-play', color: '#00A651' },
  
  // Utility Payments
  { code: 'LUKU', name: 'LUKU', category: 'utilities', icon: 'lightning-bolt', color: '#FFC107' },
  { code: 'DAWASA', name: 'DAWASA', category: 'utilities', icon: 'water', color: '#2196F3' },
  { code: 'TUKUZA', name: 'TUKUZA', category: 'utilities', icon: 'water-pump', color: '#00BCD4' },
  { code: 'NHC', name: 'NHC', category: 'utilities', icon: 'home-city', color: '#795548' },
  { code: 'IBE', name: 'IBE', category: 'utilities', icon: 'flash', color: '#FF9800' },
  { code: 'THORNLUX', name: 'Thornlux', category: 'utilities', icon: 'lightbulb-on', color: '#FDD835' },
  { code: 'ECOWATER', name: 'Ecowater', category: 'utilities', icon: 'water-circle', color: '#4CAF50' },
  
  // Government Payments
  { code: 'GEPG', name: 'GEPG', category: 'government', icon: 'bank', color: '#1976D2' },
  { code: 'ZANMALIPO', name: 'ZanMalipo', category: 'government', icon: 'flag', color: '#388E3C' },
  { code: 'TRAFFIC_FINE', name: 'Traffic Fine', category: 'government', icon: 'car-brake-alert', color: '#D32F2F' },
  { code: 'TARURA', name: 'Tarura', category: 'government', icon: 'highway', color: '#757575' },
  { code: 'TRA', name: 'TRA', category: 'government', icon: 'file-document', color: '#0277BD' },
  
  // Insurance
  { code: 'BRITAM', name: 'Britam', category: 'insurance', icon: 'shield-check', color: '#E30613' },
  { code: 'STAR_GENERAL', name: 'Star General', category: 'insurance', icon: 'shield-star', color: '#FFD700' },
  { code: 'MO_INSURANCE', name: 'MO Insurance', category: 'insurance', icon: 'shield-account', color: '#1976D2' },
  { code: 'PHOENIX', name: 'Phoenix Assurance', category: 'insurance', icon: 'shield-sun', color: '#FF6F00' },
  { code: 'HERITAGE', name: 'Heritage Insurance', category: 'insurance', icon: 'shield-home', color: '#6A1B9A' },
  { code: 'GA_INSURANCE', name: 'GA Insurance', category: 'insurance', icon: 'shield-car', color: '#00897B' },
  { code: 'RELIANCE', name: 'Reliance Insurance', category: 'insurance', icon: 'shield-lock', color: '#2E7D32' },
  { code: 'AAR', name: 'AAR Insurance', category: 'insurance', icon: 'shield-plus', color: '#D32F2F' },
  { code: 'METROPOLITAN', name: 'Metropolitan Strategies', category: 'insurance', icon: 'shield-airplane', color: '#1565C0' },
  { code: 'JUBILEE', name: 'Jubilee Insurance', category: 'insurance', icon: 'shield-heart', color: '#C62828' },
  { code: 'BUMACO', name: 'BUMACO', category: 'insurance', icon: 'shield', color: '#5D4037' },
  { code: 'MAXINSURANCE', name: 'Maxinsurance', category: 'insurance', icon: 'shield-check-outline', color: '#00796B' },
  { code: 'RESOLUTION', name: 'Resolution Insurance', category: 'insurance', icon: 'shield-key', color: '#283593' },
  { code: 'JUBILEE_LIFE', name: 'Jubilee Life', category: 'insurance', icon: 'shield-cross', color: '#AD1457' },
  { code: 'ALLIANCE', name: 'Alliance Insurance', category: 'insurance', icon: 'shield-link-variant', color: '#0277BD' },
  { code: 'MGEN', name: 'MGEN Insurance', category: 'insurance', icon: 'shield-account-outline', color: '#558B2F' },
  { code: 'MAYFAIR', name: 'Mayfair Insurance', category: 'insurance', icon: 'shield-bug', color: '#6A1B9A' },
  { code: 'ICEA_LION', name: 'ICEA Lion', category: 'insurance', icon: 'shield-alert', color: '#F57C00' },
  { code: 'INSURANCE_GROUP', name: 'Insurance Group', category: 'insurance', icon: 'shield-half-full', color: '#455A64' },
  
  // Investments
  { code: 'UTT_AMIS', name: 'UTT Amis', category: 'investments', icon: 'chart-line', color: '#1976D2' },
  { code: 'ITRUST', name: 'iTrust', category: 'investments', icon: 'hand-coin', color: '#00897B' },
  
  // Fitness
  { code: 'ATARI_FITNESS', name: 'Atari Fitness', category: 'fitness', icon: 'dumbbell', color: '#E91E63' },
  
  // Renewable Energy
  { code: 'ZOLA', name: 'Zola', category: 'renewable', icon: 'solar-panel', color: '#FFC107' },
  { code: 'RAFIKI_POWER', name: 'Rafiki Power', category: 'renewable', icon: 'solar-power', color: '#4CAF50' },
  { code: 'RISE', name: 'Rise', category: 'renewable', icon: 'sun-wireless', color: '#FF9800' },
  { code: 'RIFT_VALLEY', name: 'Rift Valley', category: 'renewable', icon: 'wind-turbine', color: '#2196F3' },
];

export function BillPaymentScreen({ navigation, route }: BillPaymentScreenProps) {
  const theme = useTheme();
  const { accounts, selectedAccount } = useAccountsStore();
  const { getFrequentlyUsed, trackBillerUsage } = useBillerStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [billerCategories, setBillerCategories] = useState<BillerCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<BillerCategory[]>([]);
  const [selectedBiller, setSelectedBiller] = useState<Biller | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [validatedInfo, setValidatedInfo] = useState<{ name?: string; balance?: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [transactionResult, setTransactionResult] = useState<any>(null);

  useEffect(() => {
    loadBillers();
  }, []);

  useEffect(() => {
    filterBillers();
  }, [searchQuery]);

  // Handle route params to pre-select biller
  useEffect(() => {
    const params = route.params as { billerCode?: string } | undefined;
    if (params?.billerCode) {
      const biller = ALL_BILLERS.find(b => b.code === params.billerCode);
      if (biller) {
        setSelectedBiller(biller);
        // Track usage when biller is pre-selected
        trackBillerUsage(biller.code);
      }
    }
  }, [route.params, trackBillerUsage]);

  // Reload billers when screen comes into focus to update frequently used
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadBillers();
    });

    return unsubscribe;
  }, [navigation]);

  const loadBillers = async () => {
    setIsLoading(true);
    try {
      // In production, load from API
      // const data = await apiService.getBillers();
      
      // Get frequently used biller codes based on user's actual usage
      // This is dynamic and updates as the user interacts with billers
      const frequentCodes = getFrequentlyUsed(5);
      
      // Create frequently used section with actual user data
      const frequentlyUsed = frequentCodes
        .map(code => ALL_BILLERS.find(b => b.code === code))
        .filter(Boolean) as Biller[];

      // Group billers by category
      const categorized: BillerCategory[] = [];

      // Add frequently used if there are any
      if (frequentlyUsed.length > 0) {
        categorized.push({
          title: 'Frequently Used',
          items: frequentlyUsed,
        });
      }

      // Add other categories
      const categories = {
        'Airtime': ALL_BILLERS.filter(b => b.category === 'airtime'),
        'Internet & Broadband': ALL_BILLERS.filter(b => b.category === 'internet'),
        'TV Subscriptions': ALL_BILLERS.filter(b => b.category === 'tv'),
        'Utility Payments': ALL_BILLERS.filter(b => b.category === 'utilities'),
        'Government Payments': ALL_BILLERS.filter(b => b.category === 'government'),
        'Insurance': ALL_BILLERS.filter(b => b.category === 'insurance'),
        'Investments': ALL_BILLERS.filter(b => b.category === 'investments'),
        'Fitness': ALL_BILLERS.filter(b => b.category === 'fitness'),
        'Renewable Energy': ALL_BILLERS.filter(b => b.category === 'renewable'),
      };

      Object.entries(categories).forEach(([title, items]) => {
        if (items.length > 0) {
          categorized.push({ title, items });
        }
      });

      setBillerCategories(categorized);
      setFilteredCategories(categorized);
    } catch (error) {
      console.error('Failed to load billers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterBillers = () => {
    if (!searchQuery.trim()) {
      setFilteredCategories(billerCategories);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = billerCategories
      .map((category) => ({
        ...category,
        items: category.items.filter(
          (biller) =>
            biller.name.toLowerCase().includes(query) ||
            biller.code.toLowerCase().includes(query)
        ),
      }))
      .filter((category) => category.items.length > 0);

    setFilteredCategories(filtered);
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

  const validatePayment = () => {
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
    return Object.keys(newErrors).length === 0;
  };

  const handlePayBill = async () => {
    if (!validatePayment()) return;
    setShowConfirmModal(true);
  };

  const processPayment = async () => {
    setShowConfirmModal(false);
    setIsLoading(true);
    try {
      const result = await apiService.payBill({
        billerCode: selectedBiller!.code,
        accountNumber,
        amount: parseFloat(amount),
        fromAccountId: selectedAccount?.id || accounts[0]?.id,
      });

      // Track biller usage for frequently used feature
      trackBillerUsage(selectedBiller!.code);

      // Reload billers to update frequently used section
      await loadBillers();

      // Store result and show success modal
      setTransactionResult({
        amount: parseFloat(amount),
        timestamp: new Date().toISOString(),
        transactionId: result.transactionId || `TXN${Date.now()}`,
        billerName: selectedBiller!.name,
        accountName: result.accountName || accountNumber,
        meterNumber: selectedBiller!.code === 'LUKU' ? accountNumber : undefined,
        receiptNumber: result.receiptNumber,
        units: result.units,
        token: result.token,
      });
      setShowSuccessModal(true);
    } catch (error: any) {
      setErrors({
        general: error.response?.data?.message || 'Payment failed. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessDone = () => {
    setShowSuccessModal(false);
    navigation.navigate('BillPaymentSuccess', { 
      transaction: transactionResult,
    });
  };

  // Prepare transaction details for confirmation modal
  const confirmationDetails: TransactionDetail[] = useMemo(() => [
    { label: 'From Account', value: selectedAccount?.accountNo || accounts[0]?.accountNo || '' },
    { label: 'Biller', value: selectedBiller?.name || '', bold: true },
    { label: 'Account/Reference', value: accountNumber },
    ...(validatedInfo?.name ? [{ label: 'Account Name', value: validatedInfo.name }] : []),
    { label: 'Amount', value: formatCurrency(parseFloat(amount) || 0), highlight: true },
  ], [selectedAccount, accounts, selectedBiller, accountNumber, validatedInfo, amount]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getBillerIcon = (billerName: string, category: string) => {
    const iconMap: { [key: string]: string } = {
      LUKU: 'lightbulb-on',
      'UTT AMIS': 'water',
      AzamTV: 'television',
      GEPG: 'bank',
      Vodacom: 'cellphone',
      Airtel: 'cellphone-wireless',
      Yaa: 'phone',
      Halotel: 'cellphone-check',
      TTCL: 'router-wireless',
      'ZUKU Fiber': 'wifi',
      'TTCL 4G': 'antenna',
      GOfiber: 'web',
      SIMPLY: 'lan',
      Zantel: 'access-point',
      StarTimes: 'television-classic',
      DStv: 'satellite-variant',
      'Star Sat': 'satellite-uplink',
    };

    return iconMap[billerName] || 'receipt';
  };

  const getBillerColor = (billerName: string) => {
    const colorMap: { [key: string]: string } = {
      LUKU: '#4CAF50',
      'UTT AMIS': '#2196F3',
      AzamTV: '#00BCD4',
      GEPG: '#3F51B5',
      Vodacom: '#E91E63',
      Airtel: '#F44336',
      Yaa: '#9C27B0',
      Halotel: '#FF9800',
      TTCL: '#795548',
      'ZUKU Fiber': '#009688',
      'TTCL 4G': '#607D8B',
      GOfiber: '#8BC34A',
      SIMPLY: '#CDDC39',
      Zantel: '#FFC107',
      StarTimes: '#FF5722',
      DStv: '#673AB7',
      'Star Sat': '#3F51B5',
    };

    return colorMap[billerName] || theme.colors.primary;
  };

  const renderCategorySection = ({ item }: { item: BillerCategory }) => (
    <Animated.View
      entering={FadeIn.duration(400)}
      layout={Layout.springify()}
      style={styles.categorySection}
    >
      <View style={styles.categoryHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            variant="titleMedium"
            style={[styles.categoryTitle, { color: theme.colors.onSurface }]}
          >
            {item.title}
          </Text>
          {item.title === 'Frequently Used' && (
            <View style={[styles.badge, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text variant="labelSmall" style={{ color: theme.colors.primary, fontSize: 10 }}>
                Based on your usage
              </Text>
            </View>
          )}
        </View>
        {item.title === 'Frequently Used' && item.items.length > 0 && (
          <TouchableOpacity onPress={() => {}}>
            <Text
              variant="labelMedium"
              style={{ color: theme.colors.primary, fontWeight: '500' }}
            >
              View all
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={item.items}
        renderItem={({ item: biller, index }) => (
          <Animated.View
            entering={FadeInDown.delay(index * 30).springify()}
            layout={Layout.springify()}
          >
            <TouchableOpacity
              style={styles.billerItemHorizontal}
              onPress={() => {
                setSelectedBiller(biller);
                trackBillerUsage(biller.code);
              }}
              activeOpacity={0.7}
            >
              <Surface style={styles.billerCardHorizontal} elevation={1}>
                <View
                  style={[
                    styles.billerIconContainer,
                    { backgroundColor: biller.color ? biller.color + '15' : theme.colors.primaryContainer },
                  ]}
                >
                  <Icon
                    name={biller.icon || getBillerIcon(biller.name, biller.category)}
                    size={28}
                    color={biller.color || getBillerColor(biller.name)}
                  />
                </View>
                <Text
                  variant="labelMedium"
                  numberOfLines={2}
                  style={styles.billerNameHorizontal}
                >
                  {biller.name}
                </Text>
              </Surface>
            </TouchableOpacity>
          </Animated.View>
        )}
        keyExtractor={(biller) => biller.code}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      />
    </Animated.View>
  );

  const renderBillerSelection = () => (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => navigation.goBack()}
        />
        <Text variant="headlineSmall" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
          Bill Payments
        </Text>
        <View style={styles.headerActions}>
          <IconButton icon="magnify" size={20} />
        </View>
      </View>

      {/* Account Balance Card - Corporate Amber */}
      <AccountInfoCardSimple
        label="MiraDigital available balance"
        balance={selectedAccount?.availableBalance || selectedAccount?.balance || 0}
        currency="TZS"
        initialVisible={false}
        animationDelay={50}
      />

      {/* Past Bills Banner */}
      <Surface style={styles.pastBillsBanner} elevation={1}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
          Your past bill payment
        </Text>
        <TouchableOpacity>
          <Text
            variant="labelMedium"
            style={{ color: theme.colors.primary, fontWeight: '500' }}
          >
            View all
          </Text>
        </TouchableOpacity>
      </Surface>

      <FlatList
        data={filteredCategories}
        renderItem={renderCategorySection}
        keyExtractor={(category) => category.title}
        contentContainerStyle={styles.categoriesList}
        showsVerticalScrollIndicator={false}
      />
    </Animated.View>
  );

  const renderPaymentForm = () => (
    <Animated.View
      entering={SlideInRight.duration(300)}
      exiting={SlideOutLeft.duration(200)}
    >
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={() => setSelectedBiller(null)}
        />
        <Text variant="headlineSmall" style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
          Pay Bill
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <Surface style={styles.formCard} elevation={2}>
        <View style={styles.selectedBiller}>
          <View style={styles.selectedBillerInfo}>
            <View
              style={[
                styles.selectedIconContainer,
                { backgroundColor: selectedBiller?.color ? selectedBiller.color + '15' : theme.colors.primaryContainer },
              ]}
            >
              <Icon
                name={selectedBiller?.icon || getBillerIcon(selectedBiller?.name || '', selectedBiller?.category || '')}
                size={32}
                color={selectedBiller?.color || getBillerColor(selectedBiller?.name || '')}
              />
            </View>
            <View>
              <Text variant="titleLarge" style={{ fontWeight: '600' }}>
                {selectedBiller?.name}
              </Text>
              <Text
                variant="bodyMedium"
                style={{ color: theme.colors.onSurfaceVariant, textTransform: 'capitalize' }}
              >
                {selectedBiller?.category}
              </Text>
            </View>
          </View>
        </View>

        <Divider style={styles.divider} />

        {errors.general && (
          <HelperText type="error" visible>
            {errors.general}
          </HelperText>
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
          right={
            isValidating ? (
              <TextInput.Icon icon={() => <ActivityIndicator size={20} />} />
            ) : null
          }
          style={styles.input}
        />
        {errors.accountNumber && (
          <HelperText type="error">{errors.accountNumber}</HelperText>
        )}

        {validatedInfo && (
          <Animated.View entering={FadeInDown.springify()}>
            <Surface style={styles.validatedInfo} elevation={1}>
              <Icon name="check-circle" size={20} color={theme.colors.primary} />
              <View style={styles.validatedText}>
                <Text variant="bodyMedium" style={{ fontWeight: '500' }}>
                  {validatedInfo.name}
                </Text>
                {validatedInfo.balance !== undefined && (
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Outstanding: TZS {validatedInfo.balance.toLocaleString()}
                  </Text>
                )}
              </View>
            </Surface>
          </Animated.View>
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
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundLight }]} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundLight} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {selectedBiller ? renderPaymentForm() : renderBillerSelection()}
      </ScrollView>

      {/* Confirmation Modal */}
      <ConfirmTransactionModal
        visible={showConfirmModal}
        title="Confirm Bill Payment"
        details={confirmationDetails}
        onCancel={() => setShowConfirmModal(false)}
        onConfirm={processPayment}
        isProcessing={isLoading}
      />

      {/* Success Modal */}
      <SuccessModal
        visible={showSuccessModal}
        amount={transactionResult?.amount || 0}
        currency="TZS"
        recipientName={transactionResult?.billerName || ''}
        transactionId={transactionResult?.transactionId || ''}
        onDone={handleSuccessDone}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
  },
  pastBillsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  categoriesList: {
    paddingHorizontal: spacing.lg,
  },
  categorySection: {
    marginBottom: spacing.xl,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  categoryTitle: {
    fontWeight: '700',
    fontSize: 18,
  },
  badge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  horizontalList: {
    paddingHorizontal: spacing.lg,
  },
  billerItemHorizontal: {
    marginRight: spacing.md,
  },
  billerCardHorizontal: {
    width: 90,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.backgroundWhite,
  },
  billerNameHorizontal: {
    textAlign: 'center',
    marginTop: spacing.xs,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textDark,
  },
  billerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  formCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
  },
  selectedBiller: {
    marginBottom: spacing.md,
  },
  selectedBillerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
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
    flex: 1,
  },
  payButton: {
    marginTop: spacing.lg,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
});

export default BillPaymentScreen;
