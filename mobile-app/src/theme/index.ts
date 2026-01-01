import { MD3DarkTheme, MD3LightTheme, configureFonts } from 'react-native-paper';
import { DefaultTheme, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';

// Font configuration
const fontConfig = {
  displayLarge: { fontFamily: 'System', fontWeight: '400' as const },
  displayMedium: { fontFamily: 'System', fontWeight: '400' as const },
  displaySmall: { fontFamily: 'System', fontWeight: '400' as const },
  headlineLarge: { fontFamily: 'System', fontWeight: '400' as const },
  headlineMedium: { fontFamily: 'System', fontWeight: '400' as const },
  headlineSmall: { fontFamily: 'System', fontWeight: '400' as const },
  titleLarge: { fontFamily: 'System', fontWeight: '600' as const },
  titleMedium: { fontFamily: 'System', fontWeight: '500' as const },
  titleSmall: { fontFamily: 'System', fontWeight: '500' as const },
  labelLarge: { fontFamily: 'System', fontWeight: '500' as const },
  labelMedium: { fontFamily: 'System', fontWeight: '500' as const },
  labelSmall: { fontFamily: 'System', fontWeight: '500' as const },
  bodyLarge: { fontFamily: 'System', fontWeight: '400' as const },
  bodyMedium: { fontFamily: 'System', fontWeight: '400' as const },
  bodySmall: { fontFamily: 'System', fontWeight: '400' as const },
};

// Default colors (can be overridden by tenant config)
const defaultColors = {
  primary: '#1976D2',
  secondary: '#FF9800',
  tertiary: '#4CAF50',
  error: '#D32F2F',
  success: '#2E7D32',
  warning: '#ED6C02',
  info: '#0288D1',
};

// Light theme
export const lightTheme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    primary: defaultColors.primary,
    secondary: defaultColors.secondary,
    tertiary: defaultColors.tertiary,
    error: defaultColors.error,
    background: '#F5F5F5',
    surface: '#FFFFFF',
    surfaceVariant: '#F0F0F0',
    onBackground: '#1C1C1C',
    onSurface: '#1C1C1C',
    outline: '#79747E',
  },
  custom: {
    success: defaultColors.success,
    warning: defaultColors.warning,
    info: defaultColors.info,
    cardBackground: '#FFFFFF',
    headerBackground: defaultColors.primary,
    statusBar: 'light-content' as const,
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
    background: '#F5F5F5',
    card: '#FFFFFF',
    text: '#1C1C1C',
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

// Spacing constants
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius constants
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 9999,
};

export type AppTheme = typeof lightTheme;
