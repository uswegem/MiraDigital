import React from 'react';
import { StyleSheet } from 'react-native';
import { Button as PaperButton, useTheme } from 'react-native-paper';
import { spacing, borderRadius } from '../theme';

interface ButtonProps extends React.ComponentProps<typeof PaperButton> {
  variant?: 'primary' | 'secondary' | 'danger' | 'transfer';
}

export function Button({ variant = 'primary', style, ...props }: ButtonProps) {
  const theme = useTheme();

  const getButtonColors = () => {
    switch (variant) {
      case 'secondary':
        return { 
          buttonColor: theme.colors.secondary,
          textColor: theme.colors.onSecondary,
        };
      case 'danger':
        return { 
          buttonColor: theme.colors.error,
          textColor: '#FFFFFF',
        };
      case 'transfer':
        return {
          buttonColor: theme.colors.tertiary, // A specific color for transfers could be added
          textColor: '#000000',
        };
      case 'primary':
      default:
        return { 
          buttonColor: theme.colors.primary,
          textColor: theme.colors.onPrimary,
        };
    }
  };

  return (
    <PaperButton
      style={[styles.button, style]}
      labelStyle={styles.label}
      {...getButtonColors()}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Button;
