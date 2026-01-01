import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar, useColorScheme, AppState, AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import NetInfo from '@react-native-community/netinfo';

import { AppNavigator } from './navigation/AppNavigator';
import { lightTheme, darkTheme, createTenantTheme } from './theme';
import { useAuthStore } from './store';
import { APP_CONFIG } from './config';

function App(): React.JSX.Element {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const { tenantConfig, logout, isAuthenticated } = useAuthStore();

  const [lastActive, setLastActive] = useState<number>(Date.now());

  // Create theme based on tenant branding
  const theme = tenantConfig?.branding
    ? createTenantTheme(tenantConfig.branding, isDarkMode)
    : isDarkMode
    ? darkTheme
    : lightTheme;

  // Handle app state changes for session timeout
  const handleAppStateChange = useCallback(
    (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const inactiveTime = Date.now() - lastActive;
        
        if (isAuthenticated && inactiveTime > APP_CONFIG.sessionTimeout) {
          // Session expired
          logout();
          Toast.show({
            type: 'info',
            text1: 'Session Expired',
            text2: 'Please login again for security',
          });
        }
      } else if (nextAppState === 'background') {
        setLastActive(Date.now());
      }
    },
    [lastActive, isAuthenticated, logout]
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [handleAppStateChange]);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!state.isConnected) {
        Toast.show({
          type: 'error',
          text1: 'No Internet Connection',
          text2: 'Please check your network settings',
          autoHide: false,
        });
      } else {
        Toast.hide();
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <StatusBar
            barStyle={isDarkMode ? 'light-content' : 'dark-content'}
            backgroundColor={theme.colors.background}
          />
          <AppNavigator />
          <Toast />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
