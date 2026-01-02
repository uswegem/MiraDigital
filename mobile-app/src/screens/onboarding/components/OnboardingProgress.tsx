import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme, ProgressBar } from 'react-native-paper';
import { spacing } from '../../../theme';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

const STEP_LABELS = [
  'Phone',
  'Personal',
  'ID',
  'Selfie',
  'Address',
  'Employment',
  'Product',
  'Terms',
  'Review',
];

export function OnboardingProgress({ currentStep, totalSteps }: OnboardingProgressProps) {
  const theme = useTheme();
  const progress = currentStep / totalSteps;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="labelMedium" style={{ color: theme.colors.outline }}>
          Step {currentStep} of {totalSteps}
        </Text>
        <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
          {STEP_LABELS[currentStep - 1] || ''}
        </Text>
      </View>
      <ProgressBar
        progress={progress}
        color={theme.colors.primary}
        style={styles.progressBar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
});

export default OnboardingProgress;
