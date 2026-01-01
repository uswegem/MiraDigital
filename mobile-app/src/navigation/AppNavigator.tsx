import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAuthStore } from '../store';
import { navigationLightTheme, navigationDarkTheme } from '../theme';

// Auth Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { OtpVerificationScreen } from '../screens/auth/OtpVerificationScreen';

// Main Screens
import { HomeScreen } from '../screens/home/HomeScreen';
import { TransferScreen } from '../screens/transfer/TransferScreen';
import { CardsScreen } from '../screens/cards/CardsScreen';
import { BillPaymentScreen } from '../screens/bills/BillPaymentScreen';

// Placeholder screens (to be implemented)
const AccountsScreen = () => null;
const TransactionsScreen = () => null;
const LoansScreen = () => null;
const ProfileScreen = () => null;
const SettingsScreen = () => null;
const NotificationsScreen = () => null;
const AddCardScreen = () => null;
const TapToPayScreen = () => null;
const AirtimeScreen = () => null;
const TransferSuccessScreen = () => null;
const PaymentSuccessScreen = () => null;

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack (Login, OTP, Register)
function AuthStack() {
  const theme = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
    </Stack.Navigator>
  );
}

// Bottom Tab Navigator
function MainTabs() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Accounts':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'Transfer':
              iconName = 'swap-horizontal';
              break;
            case 'Cards':
              iconName = focused ? 'credit-card' : 'credit-card-outline';
              break;
            case 'More':
              iconName = focused ? 'dots-horizontal-circle' : 'dots-horizontal-circle-outline';
              break;
            default:
              iconName = 'circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.outline,
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTitleStyle: {
          color: theme.colors.onSurface,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
        }}
      />
      <Tab.Screen name="Accounts" component={AccountsScreen} />
      <Tab.Screen
        name="Transfer"
        component={TransferScreen}
        options={{
          title: 'Transfer Money',
        }}
      />
      <Tab.Screen
        name="Cards"
        component={CardsScreen}
        options={{
          title: 'My Cards',
        }}
      />
      <Tab.Screen
        name="More"
        component={SettingsScreen}
        options={{
          title: 'More',
        }}
      />
    </Tab.Navigator>
  );
}

// Main App Stack (after login)
function MainStack() {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTitleStyle: {
          color: theme.colors.onSurface,
        },
        headerTintColor: theme.colors.primary,
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BillPayment"
        component={BillPaymentScreen}
        options={{ title: 'Pay Bills' }}
      />
      <Stack.Screen
        name="Airtime"
        component={AirtimeScreen}
        options={{ title: 'Buy Airtime' }}
      />
      <Stack.Screen
        name="AddCard"
        component={AddCardScreen}
        options={{ title: 'Add Card' }}
      />
      <Stack.Screen
        name="TapToPay"
        component={TapToPayScreen}
        options={{ title: 'Tap & Pay' }}
      />
      <Stack.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ title: 'Transaction History' }}
      />
      <Stack.Screen
        name="Loans"
        component={LoansScreen}
        options={{ title: 'My Loans' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen
        name="TransferSuccess"
        component={TransferSuccessScreen}
        options={{
          title: 'Transfer Complete',
          headerBackVisible: false,
        }}
      />
      <Stack.Screen
        name="PaymentSuccess"
        component={PaymentSuccessScreen}
        options={{
          title: 'Payment Complete',
          headerBackVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}

// Root Navigator
export function AppNavigator() {
  const { isAuthenticated } = useAuthStore();
  const isDark = false; // TODO: Get from theme context

  return (
    <NavigationContainer theme={isDark ? navigationDarkTheme : navigationLightTheme}>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default AppNavigator;
