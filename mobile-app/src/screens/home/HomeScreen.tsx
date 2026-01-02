import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Modal,
  TextInput,
} from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  Avatar,
  IconButton,
  Divider,
  Button,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore, useAccountsStore } from '../../store';
import { spacing } from '../../theme';
import { colors } from '../../theme/colors';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - spacing.lg * 2;

interface HomeScreenProps {
  navigation: any;
}

interface QuickService {
  id: string;
  icon: string;
  label: string;
  screen: string;
  color: string;
  category: string;
  params?: any;
}

const ALL_SERVICES: QuickService[] = [
  { id: 'send', icon: 'bank-transfer', label: 'Tuma Pesa', screen: 'Transfer', color: '#00BCD4', category: 'banking' },
  { id: 'bills', icon: 'receipt', label: 'Pay Bills', screen: 'BillPayment', color: '#4CAF50', category: 'banking' },
  { id: 'lipa', icon: 'qrcode-scan', label: 'Lipa', screen: 'QRPay', color: '#FFC107', category: 'banking' },
  { id: 'loans', icon: 'cash-fast', label: 'Mikopo', screen: 'Loans', color: '#E91E63', category: 'banking' },
  { id: 'visa', icon: 'credit-card', label: 'Visa Pay', screen: 'VisaPay', color: '#1A1F71', category: 'banking' },
  { id: 'airtime', icon: 'cellphone', label: 'Nunua Salio', screen: 'Airtime', color: '#2196F3', category: 'airtime' },
  { id: 'AIRTEL', icon: 'cellphone-wireless', label: 'Airtel', screen: 'BillPayment', color: '#E60000', category: 'airtime', params: { billerCode: 'AIRTEL' } },
  { id: 'VODACOM', icon: 'cellphone-sound', label: 'Vodacom', screen: 'BillPayment', color: '#E60000', category: 'airtime', params: { billerCode: 'VODACOM' } },
  { id: 'HALOTEL', icon: 'cellphone-arrow-down', label: 'Halotel', screen: 'BillPayment', color: '#F7941E', category: 'airtime', params: { billerCode: 'HALOTEL' } },
  { id: 'TTCL', icon: 'phone-classic', label: 'TTCL', screen: 'BillPayment', color: '#0066CC', category: 'airtime', params: { billerCode: 'TTCL' } },
  { id: 'YAS', icon: 'cellphone-text', label: 'Yas', screen: 'BillPayment', color: '#00A859', category: 'airtime', params: { billerCode: 'YAS' } },
  { id: 'luku', icon: 'lightning-bolt', label: 'LUKU', screen: 'LUKU', color: '#FF9800', category: 'utilities' },
  { id: 'water', icon: 'water', label: 'DAWASCO', screen: 'Water', color: '#00ACC1', category: 'utilities' },
  { id: 'DAWASA', icon: 'water-pump', label: 'DAWASA', screen: 'BillPayment', color: '#2196F3', category: 'utilities', params: { billerCode: 'DAWASA' } },
  { id: 'TUKUZA', icon: 'water-pump', label: 'TUKUZA', screen: 'BillPayment', color: '#00BCD4', category: 'utilities', params: { billerCode: 'TUKUZA' } },
  { id: 'NHC', icon: 'home-city', label: 'NHC', screen: 'BillPayment', color: '#795548', category: 'utilities', params: { billerCode: 'NHC' } },
  { id: 'gepg', icon: 'bank', label: 'GePG', screen: 'GePG', color: '#1976D2', category: 'government' },
  { id: 'dstv', icon: 'satellite-variant', label: 'DSTV', screen: 'DSTV', color: '#0033A0', category: 'tv' },
  { id: 'AZAMTV', icon: 'television-classic', label: 'AzamTV', screen: 'BillPayment', color: '#00A651', category: 'tv', params: { billerCode: 'AZAMTV' } },
  { id: 'STARTIMES', icon: 'star-circle', label: 'StarTimes', screen: 'BillPayment', color: '#FFD700', category: 'tv', params: { billerCode: 'STARTIMES' } },
];

const SERVICE_CATEGORIES = [
  { id: 'all', label: 'All', icon: 'apps' },
  { id: 'banking', label: 'Banking', icon: 'bank' },
  { id: 'airtime', label: 'Airtime', icon: 'cellphone' },
  { id: 'utilities', label: 'Utilities', icon: 'flash' },
  { id: 'government', label: 'Government', icon: 'bank-outline' },
  { id: 'tv', label: 'TV', icon: 'television' },
];

const DEFAULT_QUICK_ACTIONS = ['send', 'bills', 'lipa', 'airtime'];

const MOCK_TRANSACTIONS = [
  { id: '1', type: 'LUKU', amount: -50000, date: '2026-01-05' },
  { id: '2', type: 'M-Pesa', amount: -25000, date: '2026-01-04' },
  { id: '3', type: 'Vodacom', amount: -5000, date: '2026-01-03' },
];

export function HomeScreen({ navigation }: HomeScreenProps) {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { accounts, selectedAccount, loadAccounts } = useAccountsStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [quickActionIds, setQuickActionIds] = useState<string[]>(DEFAULT_QUICK_ACTIONS);
  const [showQuickActionsModal, setShowQuickActionsModal] = useState(false);
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadAccounts();
    loadQuickActions();
  }, []);

  const loadQuickActions = async () => {
    try {
      const saved = await AsyncStorage.getItem('quickActions');
      if (saved) {
        const parsed = JSON.parse(saved);
        const validIds = parsed.filter((id: string) => 
          ALL_SERVICES.some(s => s.id === id)
        );
        if (validIds.length > 0) {
          setQuickActionIds(validIds.slice(0, 4));
        }
      }
    } catch (err) {
      console.log('Failed to load quick actions:', err);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAccounts();
    setRefreshing(false);
  }, [loadAccounts]);

  const formatCurrency = (amount: number) => {
    return `TSh ${Math.abs(amount).toLocaleString('en-TZ')}`;
  };

  const navigateToService = (service: QuickService) => {
    if (!service || !service.screen) return;
    try {
      navigation.navigate(service.screen, service.params);
    } catch (error) {
      console.log('Navigation error:', error);
    }
  };

  const openQuickActionsModal = () => {
    setTempSelectedIds([...quickActionIds]);
    setSearchQuery('');
    setSelectedCategory('all');
    setShowQuickActionsModal(true);
  };

  const toggleServiceSelection = (serviceId: string) => {
    setTempSelectedIds(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else if (prev.length < 4) {
        return [...prev, serviceId];
      }
      return prev;
    });
  };

  const saveQuickActions = async () => {
    if (tempSelectedIds.length === 0) return;
    try {
      await AsyncStorage.setItem('quickActions', JSON.stringify(tempSelectedIds));
      setQuickActionIds(tempSelectedIds);
      setShowQuickActionsModal(false);
    } catch (err) {
      console.log('Failed to save quick actions:', err);
    }
  };

  const filteredServices = ALL_SERVICES.filter(service => {
    const matchesSearch = service.label.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const quickActions = quickActionIds
    .map(id => ALL_SERVICES.find(s => s.id === id))
    .filter((s): s is QuickService => s !== undefined);

  const gridServices = ['luku', 'gepg', 'dstv', 'water', 'visa', 'loans']
    .filter(id => !quickActionIds.includes(id))
    .map(id => ALL_SERVICES.find(s => s.id === id))
    .filter((s): s is QuickService => s !== undefined)
    .slice(0, 6);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Avatar.Text
              size={48}
              label={`${user?.firstName?.[0] || 'M'}${user?.lastName?.[0] || 'D'}`}
              style={styles.avatar}
              labelStyle={styles.avatarLabel}
            />
          </TouchableOpacity>
          <View style={styles.greeting}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>
              {user?.firstName || 'User'} {user?.lastName || ''}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <IconButton
            icon="bell-outline"
            iconColor="#FFFFFF"
            size={26}
            onPress={() => navigation.navigate('Notifications')}
            style={styles.notificationButton}
          />
        </View>
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Surface style={styles.accountCard} elevation={0}>
          <View style={styles.accountHeader}>
            <View>
              <Text style={styles.accountTitle}>
                {selectedAccount?.productName || 'Savings Account'}
              </Text>
              <Text style={styles.accountNumber}>
                {selectedAccount?.accountNo || '****-****-****'}
              </Text>
            </View>
            <IconButton
              icon={showBalance ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              iconColor="#757575"
              onPress={() => setShowBalance(!showBalance)}
            />
          </View>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceAmount}>
              {showBalance
                ? formatCurrency(selectedAccount?.availableBalance || 0)
                : 'TSh ****'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.viewStatement}
            onPress={() => navigation.navigate('Transactions')}
          >
            <Text style={styles.viewStatementText}>View Statement</Text>
            <Icon name="chevron-right" size={18} color={colors.primary} />
          </TouchableOpacity>
        </Surface>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity onPress={openQuickActionsModal} style={styles.editButton}>
            <Icon name="pencil" size={16} color={colors.primary} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.quickActionsContainer}>
          {quickActions.map(action => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickAction}
              onPress={() => navigateToService(action)}
              activeOpacity={0.7}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
                <Icon name={action.icon} size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionLabel} numberOfLines={1}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Surface style={styles.insightsCard} elevation={0}>
          <View style={styles.insightsHeader}>
            <Text style={styles.insightsTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')}>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>
          {MOCK_TRANSACTIONS.map((tx, index) => (
            <React.Fragment key={tx.id}>
              {index > 0 && <Divider style={styles.transactionDivider} />}
              <View style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <View style={styles.transactionIconContainer}>
                    <Icon 
                      name={tx.type === 'LUKU' ? 'lightning-bolt' : 'cellphone'} 
                      size={20} 
                      color="#757575" 
                    />
                  </View>
                  <Text style={styles.transactionType}>{tx.type}</Text>
                </View>
                <Text style={[styles.transactionAmount, { color: tx.amount < 0 ? '#E53935' : '#4CAF50' }]}>
                  {tx.amount < 0 ? '-' : '+'}TSh {Math.abs(tx.amount).toLocaleString()}
                </Text>
              </View>
            </React.Fragment>
          ))}
        </Surface>

        <Surface style={styles.servicesCard} elevation={0}>
          <Text style={styles.servicesTitle}>Services</Text>
          <View style={styles.servicesGrid}>
            {gridServices.map(service => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceItem}
                onPress={() => navigateToService(service)}
                activeOpacity={0.7}
              >
                <View style={[styles.serviceIcon, { backgroundColor: `${service.color}15` }]}>
                  <Icon name={service.icon} size={26} color={service.color} />
                </View>
                <Text style={styles.serviceLabel} numberOfLines={1}>
                  {service.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Surface>

        <Surface style={styles.promoBanner} elevation={0}>
          <View style={styles.promoContent}>
            <View style={styles.promoIconContainer}>
              <Icon name="gift" size={28} color={colors.primary} />
            </View>
            <View style={styles.promoText}>
              <Text style={styles.promoTitle}>Refer & Earn</Text>
              <Text style={styles.promoSubtitle}>
                Invite friends and earn rewards
              </Text>
            </View>
          </View>
          <Icon name="chevron-right" size={24} color="#9E9E9E" />
        </Surface>
      </ScrollView>

      <Modal
        visible={showQuickActionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQuickActionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Customize Quick Actions</Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setShowQuickActionsModal(false)}
              />
            </View>
            <Text style={styles.modalSubtitle}>
              Select up to 4 services for quick access ({tempSelectedIds.length}/4)
            </Text>

            <View style={styles.searchContainer}>
              <Icon name="magnify" size={20} color="#9E9E9E" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search services..."
                placeholderTextColor="#9E9E9E"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.categoryScroll}
            >
              {SERVICE_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat.id && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Icon 
                    name={cat.icon} 
                    size={16} 
                    color={selectedCategory === cat.id ? '#FFFFFF' : '#757575'} 
                  />
                  <Text style={[
                    styles.categoryChipText,
                    selectedCategory === cat.id && styles.categoryChipTextActive,
                  ]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView style={styles.servicesList} showsVerticalScrollIndicator={false}>
              {filteredServices.map(service => {
                const isSelected = tempSelectedIds.includes(service.id);
                const isDisabled = !isSelected && tempSelectedIds.length >= 4;
                return (
                  <TouchableOpacity
                    key={service.id}
                    style={[
                      styles.serviceOption,
                      isSelected && styles.serviceOptionSelected,
                      isDisabled && styles.serviceOptionDisabled,
                    ]}
                    onPress={() => toggleServiceSelection(service.id)}
                    disabled={isDisabled}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.serviceOptionIcon, { backgroundColor: `${service.color}20` }]}>
                      <Icon name={service.icon} size={24} color={service.color} />
                    </View>
                    <View style={styles.serviceOptionInfo}>
                      <Text style={[
                        styles.serviceOptionLabel,
                        isDisabled && styles.serviceOptionLabelDisabled,
                      ]}>
                        {service.label}
                      </Text>
                      <Text style={styles.serviceOptionCategory}>
                        {service.category.charAt(0).toUpperCase() + service.category.slice(1)}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkmark}>
                        <Icon name="check-circle" size={24} color={colors.success} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowQuickActionsModal(false)}
                style={styles.modalButton}
                textColor={colors.textSecondary}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={saveQuickActions}
                style={styles.modalButton}
                buttonColor={colors.primary}
                disabled={tempSelectedIds.length === 0}
              >
                Save ({tempSelectedIds.length})
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  avatarLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  greeting: {
    marginLeft: spacing.md,
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
  },
  notificationButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    margin: 0,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  accountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    elevation: 2,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  accountTitle: {
    color: '#757575',
    fontSize: 14,
    fontWeight: '500',
  },
  accountNumber: {
    color: '#212121',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  balanceContainer: {
    marginTop: spacing.md,
  },
  balanceLabel: {
    color: '#757575',
    fontSize: 13,
  },
  balanceAmount: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: '700',
    marginTop: 4,
  },
  viewStatement: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  viewStatementText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: '#212121',
    fontSize: 18,
    fontWeight: '700',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  quickAction: {
    alignItems: 'center',
    width: (CARD_WIDTH - spacing.md * 3) / 4,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
    elevation: 4,
  },
  quickActionLabel: {
    color: '#212121',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  insightsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    elevation: 2,
  },
  insightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  insightsTitle: {
    color: '#212121',
    fontSize: 16,
    fontWeight: '700',
  },
  viewAllText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  transactionDivider: {
    marginVertical: spacing.sm,
    backgroundColor: '#F0F0F0',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  transactionType: {
    color: '#212121',
    fontSize: 15,
    fontWeight: '600',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  servicesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    elevation: 2,
  },
  servicesTitle: {
    color: '#212121',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  serviceItem: {
    width: '33.33%',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  serviceIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  serviceLabel: {
    color: '#212121',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  promoBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
  },
  promoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoText: {
    marginLeft: spacing.md,
  },
  promoTitle: {
    color: '#212121',
    fontSize: 16,
    fontWeight: '700',
  },
  promoSubtitle: {
    color: '#757575',
    fontSize: 13,
    marginTop: 2,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.backgroundWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textDark,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    height: 44,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textDark,
  },
  categoryScroll: {
    marginBottom: spacing.md,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: spacing.xs,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#757575',
    marginLeft: 4,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  servicesList: {
    maxHeight: 350,
  },
  serviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    marginBottom: spacing.xs,
    backgroundColor: colors.backgroundLight,
  },
  serviceOptionSelected: {
    backgroundColor: '#FFF8E1',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  serviceOptionDisabled: {
    opacity: 0.5,
  },
  serviceOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  serviceOptionInfo: {
    flex: 1,
  },
  serviceOptionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textDark,
  },
  serviceOptionCategory: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 2,
  },
  serviceOptionLabelDisabled: {
    color: colors.textSecondary,
  },
  checkmark: {
    marginLeft: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
});

export default HomeScreen;
