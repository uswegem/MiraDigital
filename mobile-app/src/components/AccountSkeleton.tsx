import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface } from 'react-native-paper';
import Skeleton from './Skeleton';
import { spacing, borderRadius } from '../theme';

export function AccountSkeleton() {
  return (
    <Surface style={styles.card}>
      <View style={styles.leftColumn}>
        <Skeleton width={48} height={48} borderRadius={24} />
      </View>
      <View style={styles.rightColumn}>
        <Skeleton width="80%" height={20} style={{ marginBottom: spacing.sm }} />
        <Skeleton width="50%" height={16} />
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
  },
  leftColumn: {
    marginRight: spacing.md,
  },
  rightColumn: {
    flex: 1,
    justifyContent: 'center',
  },
});

export default AccountSkeleton;
