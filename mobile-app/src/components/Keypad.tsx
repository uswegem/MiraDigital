import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Icon from './Icon'; // Using the new custom Icon component
import { spacing, borderRadius } from '../theme';

interface KeypadProps {
  onDigitPress: (digit: string) => void;
  onBackspace: () => void;
  onBiometricPress?: () => void;
  biometricIcon?: string;
}

const KEYPAD_BUTTONS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

export function Keypad({ 
  onDigitPress, 
  onBackspace, 
  onBiometricPress, 
  biometricIcon 
}: KeypadProps) {
  const theme = useTheme();

  const renderButton = (digit: string) => (
    <TouchableOpacity 
      key={digit}
      style={styles.button}
      onPress={() => onDigitPress(digit)}
    >
      <Text style={styles.buttonText}>{digit}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {KEYPAD_BUTTONS.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map(renderButton)}
        </View>
      ))}
      <View style={styles.row}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={onBiometricPress}
          disabled={!onBiometricPress}
        >
          {biometricIcon && <Icon name={biometricIcon} size={28} />}
        </TouchableOpacity>
        {renderButton('0')}
        <TouchableOpacity style={styles.button} onPress={onBackspace}>
          <Icon name="backspace-outline" size={24} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  button: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.round,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  buttonText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
});

export default Keypad;
