import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Button as PaperButton, useTheme } from 'react-native-paper';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { spacing, borderRadius } from '../theme';

interface ButtonProps extends React.ComponentProps<typeof PaperButton> {
  variant?: 'primary' | 'secondary' | 'danger' | 'transfer';
}

export function Button({ variant = 'primary', style, ...props }: ButtonProps) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

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
          buttonColor: theme.colors.tertiary,
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
    <Pressable
      onPressIn={() => (scale.value = withSpring(0.98))}
      onPressOut={() => (scale.value = withSpring(1))}
    >
      <Animated.View style={animatedStyle}>
        <PaperButton
          style={[styles.button, style]}
          labelStyle={styles.label}
          {...getButtonColors()}
          {...props}
        />
      </Animated.View>
    </Pressable>
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
