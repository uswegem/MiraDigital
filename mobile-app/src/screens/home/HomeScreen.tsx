import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  Avatar,
  IconButton,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthStore, useAccountsStore } from '../../store';
import { spacing, borderRadius } from '../../theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - spacing.lg * 2;

interface HomeScreenProps {
  navigation: any;
}

export function HomeScreen({ navigation }: HomeScreenProps) {
  const theme = useTheme();
  const { user, tenantConfig } = useAuthStore();
  const { accounts, selectedAccount, loadAccounts, selectAccount, isLoading } = useAccountsStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAccounts();
    setRefreshing(false);
  }, []);

  const formatCurrency = (amount: number, currency: string = 'TZS') => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const quickActions = [
    { icon: 'bank-transfer', label: 'Transfer', screen: 'Transfer', color: '#1976D2' },
    { icon: 'cellphone', label: 'Airtime', screen: 'Airtime', color: '#4CAF50' },
    { icon: 'receipt', label: 'Pay Bills', screen: 'BillPayment', color: '#FF9800' },
    { icon: 'credit-card', label: 'Cards', screen: 'Cards', color: '#9C27B0' },
  ];

  const services = [
    { icon: 'bank', label: 'Accounts', screen: 'Accounts' },
    { icon: 'history', label: 'History', screen: 'Transactions' },
    { icon: 'cash-multiple', label: 'Loans', screen: 'Loans' },
    { icon: 'contactless-payment', label: 'Tap & Pay', screen: 'TapToPay' },
    { icon: 'qrcode-scan', label: 'QR Pay', screen: 'QRPay' },
    { icon: 'account-group', label: 'Beneficiaries', screen: 'Beneficiaries' },
    { icon: 'cog', label: 'Settings', screen: 'Settings' },
    { icon: 'help-circle', label: 'Help', screen: 'Help' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.primary }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <Avatar.Text
              size={45}
              label={`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`}
              style={{ backgroundColor: theme.colors.primaryContainer }}
            />
          </TouchableOpacity>
          <View style={styles.greeting}>
            <Text variant="bodyMedium" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Welcome back,
            </Text>
            <Text variant="titleMedium" style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
              {user?.firstName} {user?.lastName}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <IconButton
            icon="bell-outline"
            iconColor="#FFFFFF"
            size={24}
            onPress={() => navigation.navigate('Notifications')}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />
        }
      >
        {/* Account Card */}
        <Surface style={styles.accountCard} elevation={4}>
          <View style={styles.accountHeader}>
            <View>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {selectedAccount?.productName || 'Savings Account'}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
                {selectedAccount?.accountNo || '---'}
              </Text>
            </View>
            <IconButton
              icon={showBalance ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              onPress={() => setShowBalance(!showBalance)}
            />
          </View>

          <View style={styles.balanceContainer}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Available Balance
            </Text>
            <Text variant="headlineLarge" style={[styles.balanceAmount, { color: theme.colors.primary }]}>
              {showBalance
                ? formatCurrency(selectedAccount?.availableBalance || 0, selectedAccount?.currency)
                : '****'}
            </Text>
          </View>

          {accounts.length > 1 && (
            <>
              <Divider style={styles.divider} />
              <TouchableOpacity
                style={styles.switchAccount}
                onPress={() => navigation.navigate('Accounts')}
              >
                <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
                  Switch Account ({accounts.length} accounts)
                </Text>
                <Icon name="chevron-right" size={18} color={theme.colors.primary} />
              </TouchableOpacity>
            </>
          )}
        </Surface>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickAction}
              onPress={() => navigation.navigate(action.screen)}
            >
              <Surface style={[styles.quickActionIcon, { backgroundColor: action.color }]} elevation={2}>
                <Icon name={action.icon} size={24} color="#FFFFFF" />
              </Surface>
              <Text variant="labelSmall" style={styles.quickActionLabel}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Services Grid */}
        <Surface style={styles.servicesCard} elevation={2}>
          <Text variant="titleMedium" style={styles.servicesTitle}>
            Services
          </Text>
          <View style={styles.servicesGrid}>
            {services.map((service) => (
              <TouchableOpacity
                key={service.label}
                style={styles.serviceItem}
                onPress={() => navigation.navigate(service.screen)}
              >
                <View style={[styles.serviceIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                  <Icon name={service.icon} size={24} color={theme.colors.primary} />
                </View>
                <Text variant="labelSmall" numberOfLines={1} style={styles.serviceLabel}>
                  {service.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Surface>

        {/* Promotions Banner */}
        <Surface style={styles.promoBanner} elevation={2}>
          <View style={styles.promoContent}>
            <Icon name="gift" size={32} color={theme.colors.primary} />
            <View style={styles.promoText}>
              <Text variant="titleSmall">Refer & Earn</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Invite friends and earn rewards
              </Text>
            </View>
          </View>
          <Icon name="chevron-right" size={24} color={theme.colors.outline} />
        </Surface>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    marginLeft: spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: spacing.sm,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  accountCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceContainer: {
    marginTop: spacing.md,
  },
  balanceAmount: {
    fontWeight: 'bold',
    marginTop: spacing.xs,
  },
  divider: {
    marginVertical: spacing.md,
  },
  switchAccount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  quickActionLabel: {
    textAlign: 'center',
  },
  servicesCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  servicesTitle: {
    marginBottom: spacing.md,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  serviceLabel: {
    textAlign: 'center',
  },
  promoBanner: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoText: {
    marginLeft: spacing.md,
  },
});

export default HomeScreen;
