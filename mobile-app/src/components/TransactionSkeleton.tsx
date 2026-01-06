import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface } from 'react-native-paper';
import Skeleton from './Skeleton';
import { spacing, borderRadius } from '../theme';

export function TransactionSkeleton() {
  return (
    <Surface style={styles.card}>
      <View style={styles.leftColumn}>
        <Skeleton width={40} height={40} borderRadius={20} />
      </View>
      <View style={styles.middleColumn}>
        <Skeleton width="70%" height={18} style={{ marginBottom: spacing.sm }} />
        <Skeleton width="40%" height={14} />
      </View>
      <View style={styles.rightColumn}>
        <Skeleton width={80} height={20} />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  leftColumn: {
    marginRight: spacing.md,
  },
  middleColumn: {
    flex: 1,
  },
  rightColumn: {
    alignItems: 'flex-end',
  },
});

export default TransactionSkeleton;
