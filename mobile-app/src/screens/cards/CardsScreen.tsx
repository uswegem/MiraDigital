import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  IconButton,
  FAB,
  Chip,
  Menu,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import Animated, {
  FadeInDown,
  ZoomIn,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useCardsStore } from '../../store';
import { spacing, borderRadius } from '../../theme';

interface CardsScreenProps {
  navigation: any;
}

interface Card {
  id: string;
  panLastFour: string;
  cardBrand: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName: string;
  isDefault: boolean;
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
}

export function CardsScreen({ navigation }: CardsScreenProps) {
  const theme = useTheme();
  const { cards, isLoading, loadCards, suspendCard, resumeCard, removeCard } = useCardsStore();
  
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  useEffect(() => {
    loadCards();
  }, []);

  const getCardGradient = (brand: string) => {
    const gradients: { [key: string]: string[] } = {
      VISA: ['#1A1F71', '#4A5FC8'],
      MASTERCARD: ['#EB001B', '#FFA726'],
      AMEX: ['#006FCF', '#29B6F6'],
    };
    return gradients[brand] || ['#424242', '#757575'];
  };

  const getStatusColor = (status: Card['status']) => {
    switch (status) {
      case 'ACTIVE': return theme.colors.primary;
      case 'SUSPENDED': return theme.colors.error;
      case 'EXPIRED': return theme.colors.outline;
      default: return theme.colors.outline;
    }
  };

  const handleSuspend = async (cardId: string) => {
    Alert.alert(
      'Suspend Card',
      'Are you sure you want to suspend this card? You can reactivate it later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: async () => {
            try {
              await suspendCard(cardId, 'USER_REQUEST');
            } catch (error) {
              Alert.alert('Error', 'Failed to suspend card');
            }
          },
        },
      ]
    );
  };

  const handleResume = async (cardId: string) => {
    try {
      await resumeCard(cardId);
    } catch (error) {
      Alert.alert('Error', 'Failed to reactivate card');
    }
  };

  const handleRemove = async (cardId: string) => {
    Alert.alert(
      'Remove Card',
      'Are you sure you want to remove this card? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeCard(cardId);
            } catch (error) {
              Alert.alert('Error', 'Failed to remove card');
            }
          },
        },
      ]
    );
  };

  const renderCard = ({ item, index }: { item: Card; index: number }) => {
    const colors = getCardGradient(item.cardBrand);

    return (
      <Animated.View entering={ZoomIn.delay(100 * index).springify()}>
      <Surface style={styles.cardContainer} elevation={5}>
        {/* Card Design */}
        <View style={[styles.card, { backgroundColor: colors[0] }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardBrand}>{item.cardBrand}</Text>
            <Menu
              visible={menuVisible === item.id}
              onDismiss={() => setMenuVisible(null)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  iconColor="#FFFFFF"
                  size={20}
                  onPress={() => setMenuVisible(item.id)}
                />
              }
            >
              {item.status === 'ACTIVE' && (
                <Menu.Item
                  leadingIcon="pause-circle"
                  onPress={() => {
                    setMenuVisible(null);
                    handleSuspend(item.id);
                  }}
                  title="Suspend Card"
                />
              )}
              {item.status === 'SUSPENDED' && (
                <Menu.Item
                  leadingIcon="play-circle"
                  onPress={() => {
                    setMenuVisible(null);
                    handleResume(item.id);
                  }}
                  title="Reactivate Card"
                />
              )}
              <Menu.Item
                leadingIcon="contactless-payment"
                onPress={() => {
                  setMenuVisible(null);
                  navigation.navigate('TapToPay', { cardId: item.id });
                }}
                title="Tap & Pay Setup"
                disabled={item.status !== 'ACTIVE'}
              />
              <Divider />
              <Menu.Item
                leadingIcon="delete"
                onPress={() => {
                  setMenuVisible(null);
                  handleRemove(item.id);
                }}
                title="Remove Card"
                titleStyle={{ color: theme.colors.error }}
              />
            </Menu>
          </View>

          <View style={styles.cardChip}>
            <Icon name="integrated-circuit-chip" size={36} color="#D4AF37" />
            <Icon name="contactless-payment" size={24} color="#FFFFFF" style={styles.nfcIcon} />
          </View>

          <Text style={styles.cardNumber}>
            •••• •••• •••• {item.panLastFour}
          </Text>

          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.cardLabel}>CARD HOLDER</Text>
              <Text style={styles.cardValue}>{item.cardholderName}</Text>
            </View>
            <View>
              <Text style={styles.cardLabel}>EXPIRES</Text>
              <Text style={styles.cardValue}>{item.expiryMonth}/{item.expiryYear}</Text>
            </View>
          </View>
        </View>

        {/* Card Info */}
        <View style={styles.cardInfo}>
          <View style={styles.cardInfoRow}>
            <Chip
              style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + '20' }]}
              textStyle={{ color: getStatusColor(item.status) }}
            >
              {item.status}
            </Chip>
            {item.isDefault && (
              <Chip icon="star" style={styles.defaultChip}>Default</Chip>
            )}
          </View>
        </View>
      </Surface>
      </Animated.View>
    );
  };

  if (isLoading && cards.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F5F5F5' }]}>
      <FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="credit-card-off" size={64} color={theme.colors.outline} />
            <Text variant="titleMedium" style={styles.emptyTitle}>No Cards Added</Text>
            <Text variant="bodyMedium" style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              Add a card to enable payments, tap-to-pay, and online purchases.
            </Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: '#FFC107' }]}
        onPress={() => navigation.navigate('AddCard')}
        color="#212121"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  cardContainer: {
    borderRadius: 20,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  card: {
    padding: spacing.lg,
    aspectRatio: 1.586, // Standard card ratio
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBrand: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  cardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  nfcIcon: {
    marginLeft: spacing.sm,
    opacity: 0.8,
  },
  cardNumber: {
    color: '#FFFFFF',
    fontSize: 22,
    letterSpacing: 2,
    marginTop: spacing.xl,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    marginBottom: 2,
  },
  cardValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  cardInfo: {
    padding: spacing.md,
    backgroundColor: '#FFFFFF',
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusChip: {
    marginRight: spacing.sm,
  },
  defaultChip: {
    backgroundColor: '#FFF3E0',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  fab: {
    position: 'absolute',
    margin: spacing.lg,
    right: 0,
    bottom: 0,
  },
});

export default CardsScreen;
