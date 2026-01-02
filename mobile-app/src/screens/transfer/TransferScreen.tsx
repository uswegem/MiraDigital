import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  IconButton,
} from 'react-native-paper';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAccountsStore } from '../../store';
import { spacing, borderRadius } from '../../theme';
import { colors } from '../../theme/colors';
import { AccountInfoCardSimple } from '../../components/AccountInfoCard';

interface TransferScreenProps {
  navigation: any;
}

type TransferOption = {
  id: string;
  title: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  screen?: string;
};

export function TransferScreen({ navigation }: TransferScreenProps) {
  const theme = useTheme();
  const { selectedAccount } = useAccountsStore();

  const transferOptions: TransferOption[] = [
    {
      id: 'internal',
      title: 'Letshego to Letshego',
      icon: 'refresh',
      iconColor: colors.accentCyan,
      iconBg: '#E0F7FA',
      screen: 'InternalTransfer',
    },
    {
      id: 'mobile',
      title: 'Letshego to Mobile Money',
      icon: 'credit-card-outline',
      iconColor: colors.accentCyan,
      iconBg: '#E0F7FA',
      screen: 'MobileMoneyTransfer',
    },
    {
      id: 'bank',
      title: 'Letshego to Other Banks',
      icon: 'storefront-outline',
      iconColor: colors.accentCyan,
      iconBg: '#E0F7FA',
      screen: 'BankTransfer',
    },
    {
      id: 'bulk',
      title: 'Send to Many',
      icon: 'account-multiple',
      iconColor: colors.accentCyan,
      iconBg: '#E0F7FA',
      screen: 'BulkTransfer',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundLight }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.backgroundLight} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
          />
          <Text variant="headlineSmall" style={styles.headerTitle}>
            Send Money
          </Text>
          <View style={{ width: 48 }} />
        </View>

        {/* Account Balance Card - Corporate Amber */}
        <AccountInfoCardSimple
          label="MiraDigital available balance"
          balance={selectedAccount?.balance || 0}
          currency="TZS"
          initialVisible={false}
          animationDelay={100}
        />

        {/* Transfer Options */}
        <View style={styles.optionsContainer}>
          {transferOptions.map((option, index) => (
            <Animated.View 
              key={option.id}
              entering={FadeInDown.delay(150 + index * 50).springify()}
            >
              <TouchableOpacity
                onPress={() => {
                  if (option.screen) {
                    navigation.navigate(option.screen);
                  }
                }}
                activeOpacity={0.7}
              >
                <Surface style={styles.optionCard} elevation={1}>
                  <View style={styles.optionContent}>
                    <View style={[styles.iconContainer, { backgroundColor: option.iconBg }]}>
                      <Icon name={option.icon} size={24} color={option.iconColor} />
                    </View>
                    <Text variant="bodyLarge" style={styles.optionTitle}>
                      {option.title}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={24} color="#9E9E9E" />
                </Surface>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
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
    color: colors.textDark,
  },
  balanceCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.accentCyan,
  },
  balanceLabel: {
    color: colors.textWhite,
    marginBottom: spacing.xs,
    fontSize: 13,
    opacity: 0.9,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceAmount: {
    color: colors.textWhite,
    fontWeight: '700',
    fontSize: 24,
    letterSpacing: 0.5,
  },
  optionsContainer: {
    paddingHorizontal: spacing.lg,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.backgroundWhite,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  optionTitle: {
    flex: 1,
    fontWeight: '500',
    fontSize: 15,
    color: colors.textDark,
  },
});

export default TransferScreen;
