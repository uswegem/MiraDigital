import { MD3DarkTheme, MD3LightTheme, configureFonts } from 'react-native-paper';
import { DefaultTheme, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';

// Font configuration - Using SF Pro-style system fonts
// iOS: SF Pro, Android: Roboto (both are clean, modern sans-serif fonts)
const fontConfig = {
  displayLarge: { 
    fontFamily: 'System', 
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  displayMedium: { 
    fontFamily: 'System', 
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  displaySmall: { 
    fontFamily: 'System', 
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  headlineLarge: { 
    fontFamily: 'System', 
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  headlineMedium: { 
    fontFamily: 'System', 
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  headlineSmall: { 
    fontFamily: 'System', 
    fontWeight: '600' as const,
    letterSpacing: -0.1,
  },
  titleLarge: { 
    fontFamily: 'System', 
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  titleMedium: { 
    fontFamily: 'System', 
    fontWeight: '600' as const,
    letterSpacing: 0.15,
  },
  titleSmall: { 
    fontFamily: 'System', 
    fontWeight: '500' as const,
    letterSpacing: 0.1,
  },
  labelLarge: { 
    fontFamily: 'System', 
    fontWeight: '500' as const,
    letterSpacing: 0.1,
  },
  labelMedium: { 
    fontFamily: 'System', 
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  },
  labelSmall: { 
    fontFamily: 'System', 
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  },
  bodyLarge: { 
    fontFamily: 'System', 
    fontWeight: '400' as const,
    letterSpacing: 0.5,
  },
  bodyMedium: { 
    fontFamily: 'System', 
    fontWeight: '400' as const,
    letterSpacing: 0.25,
  },
  bodySmall: { 
    fontFamily: 'System', 
    fontWeight: '400' as const,
    letterSpacing: 0.4,
  },
};

// Default colors - MiraDigital Brand (Enhanced)
const defaultColors = {
  primary: '#FFC107',        // Vibrant Amber (Primary)
  primaryDark: '#FFA000',    // Rich amber
  primaryLight: '#FFECB3',   // Light amber
  secondary: '#212121',      // Rich Black
  tertiary: '#FFFFFF',       // White
  error: '#F44336',
  success: '#4CAF50',
  warning: '#FF9800',
  info: '#2196F3',
  // Gradient colors
  gradientStart: '#FFD54F',  // Light gold
  gradientEnd: '#FFA726',    // Deep orange
};

// Light theme
export const lightTheme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: defaultColors.primary,
    primaryContainer: defaultColors.primaryLight,
    onPrimary: '#000000',           // Black text on yellow
    onPrimaryContainer: '#000000',
    secondary: defaultColors.secondary,
    onSecondary: '#FFFFFF',         // White text on black
    tertiary: defaultColors.tertiary,
    onTertiary: '#000000',          // Black text on white
    error: defaultColors.error,
    background: '#FFFFFF',          // White background
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    onBackground: '#000000',        // Black text
    onSurface: '#000000',
    outline: '#E0E0E0',
  },
  custom: {
    success: defaultColors.success,
    warning: defaultColors.warning,
    info: defaultColors.info,
    cardBackground: '#FFFFFF',
    headerBackground: defaultColors.primary,
    statusBar: 'dark-content' as const,  // Dark icons on yellow header
  },
};

// Dark theme
export const darkTheme = {
  ...MD3DarkTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#90CAF9',
    secondary: '#FFB74D',
    tertiary: '#81C784',
    error: '#EF5350',
    background: '#121212',
    surface: '#1E1E1E',
    surfaceVariant: '#2C2C2C',
    onBackground: '#FFFFFF',
    onSurface: '#FFFFFF',
    outline: '#938F99',
  },
  custom: {
    success: '#66BB6A',
    warning: '#FFA726',
    info: '#29B6F6',
    cardBackground: '#1E1E1E',
    headerBackground: '#1E1E1E',
    statusBar: 'light-content' as const,
  },
};

// Navigation themes
export const navigationLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: defaultColors.primary,
    background: '#FFFFFF',
    card: '#FFFFFF',
    text: '#000000',
    border: '#E0E0E0',
  },
};

export const navigationDarkTheme = {
  ...NavigationDarkTheme,
  colors: {
    ...NavigationDarkTheme.colors,
    primary: '#90CAF9',
    background: '#121212',
    card: '#1E1E1E',
    text: '#FFFFFF',
    border: '#333333',
  },
};

// Create theme from tenant config
export function createTenantTheme(tenantBranding?: {
  primaryColor?: string;
  secondaryColor?: string;
  logo?: string;
}, isDark: boolean = false) {
  const baseTheme = isDark ? darkTheme : lightTheme;
  
  if (!tenantBranding) {
    return baseTheme;
  }

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: tenantBranding.primaryColor || baseTheme.colors.primary,
      secondary: tenantBranding.secondaryColor || baseTheme.colors.secondary,
    },
    custom: {
      ...baseTheme.custom,
      headerBackground: tenantBranding.primaryColor || baseTheme.custom.headerBackground,
    },
    branding: {
      logo: tenantBranding.logo,
    },
  };
}

// Spacing constants - More generous, modern spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Border radius constants - Smoother, more rounded
export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 9999,
};

// Animation durations
export const animationDuration = {
  fast: 150,
  normal: 300,
  slow: 500,
};

// Shadow presets
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Gradient presets
export const gradients = {
  primary: ['#FFD54F', '#FFA726'],      // Gold to deep orange
  secondary: ['#424242', '#212121'],    // Dark gradient
  success: ['#66BB6A', '#43A047'],      // Green gradient
  info: ['#42A5F5', '#1E88E5'],         // Blue gradient
  warm: ['#FF6F00', '#FF8F00'],         // Warm gradient
  cool: ['#00ACC1', '#0097A7'],         // Cool gradient
};

export type AppTheme = typeof lightTheme;
