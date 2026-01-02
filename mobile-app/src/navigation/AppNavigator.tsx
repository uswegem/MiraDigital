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
import { PinLoginScreen } from '../screens/auth/PinLoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { DocumentUploadScreen } from '../screens/auth/DocumentUploadScreen';
import { ForgotPinScreen } from '../screens/auth/ForgotPinScreen';
import { OtpVerificationScreen } from '../screens/auth/OtpVerificationScreen';

// Onboarding Screens
import {
  WelcomeScreen as OnboardingWelcome,
  PhoneVerificationScreen as OnboardingPhone,
  PersonalInfoScreen as OnboardingPersonalInfo,
  DocumentCaptureScreen as OnboardingDocumentCapture,
  NidaVerificationScreen as OnboardingNidaVerification,
  SelfieScreen as OnboardingSelfie,
  AddressScreen as OnboardingAddress,
  EmploymentScreen as OnboardingEmployment,
  ProductSelectionScreen as OnboardingProductSelection,
  TermsScreen as OnboardingTerms,
  ReviewScreen as OnboardingReview,
  StatusScreen as OnboardingStatus,
} from '../screens/onboarding';

// Main Screens
import { HomeScreen } from '../screens/home/HomeScreen';
import { TransferScreen } from '../screens/transfer/TransferScreen';
import { TransferSuccessScreen } from '../screens/transfer/TransferSuccessScreen';
import { InternalTransferScreen } from '../screens/transfer/InternalTransferScreen';
import { MobileMoneyTransferScreen } from '../screens/transfer/MobileMoneyTransferScreen';
import { BankTransferScreen } from '../screens/transfer/BankTransferScreen';
import { CardsScreen } from '../screens/cards/CardsScreen';
import { BillPaymentScreen } from '../screens/bills/BillPaymentScreen';
import { BillPaymentSuccessScreen } from '../screens/bills/BillPaymentSuccessScreen';
import { QRPayScreen } from '../screens/qrpay/QRPayScreen';
import { LipaScreen } from '../screens/lipa/LipaScreen';
import { LipaSuccessScreen } from '../screens/lipa/LipaSuccessScreen';
import { AccountsScreen } from '../screens/accounts/AccountsScreen';
import { TransactionsScreen } from '../screens/transactions/TransactionsScreen';
import { AirtimeScreen } from '../screens/airtime/AirtimeScreen';
import { LoansScreen } from '../screens/loans/LoansScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { PaymentSuccessScreen } from '../screens/payment/PaymentSuccessScreen';
import { AddCardScreen } from '../screens/cards/AddCardScreen';
import { TapToPayScreen } from '../screens/cards/TapToPayScreen';
import { VisaPayScreen } from '../screens/cards/VisaPayScreen';

// Bill Payment Screens
import { LUKUScreen } from '../screens/bills/LUKUScreen';
import { GePGScreen } from '../screens/bills/GePGScreen';
import { DSTVScreen } from '../screens/bills/DSTVScreen';
import { WaterScreen } from '../screens/bills/WaterScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Onboarding Stack (Customer Self-Service Registration)
function OnboardingStack() {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="OnboardingWelcome" component={OnboardingWelcome} />
      <Stack.Screen name="OnboardingPhone" component={OnboardingPhone} />
      <Stack.Screen name="PersonalInfo" component={OnboardingPersonalInfo} />
      <Stack.Screen name="DocumentCapture" component={OnboardingDocumentCapture} />
      <Stack.Screen name="NidaVerification" component={OnboardingNidaVerification} />
      <Stack.Screen name="Selfie" component={OnboardingSelfie} />
      <Stack.Screen name="Address" component={OnboardingAddress} />
      <Stack.Screen name="Employment" component={OnboardingEmployment} />
      <Stack.Screen name="ProductSelection" component={OnboardingProductSelection} />
      <Stack.Screen name="Terms" component={OnboardingTerms} />
      <Stack.Screen name="Review" component={OnboardingReview} />
      <Stack.Screen name="Status" component={OnboardingStatus} />
    </Stack.Navigator>
  );
}

// Auth Stack (Login, OTP, Register)
function AuthStack() {
  const theme = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
      initialRouteName="PinLogin"
    >
      <Stack.Screen name="PinLogin" component={PinLoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPin" component={ForgotPinScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      <Stack.Screen 
        name="Onboarding" 
        component={OnboardingStack}
        options={{ headerShown: false }}
      />
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
        tabBarActiveTintColor: '#FFC107',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarStyle: {
          backgroundColor: '#FFF6E5',
          borderTopWidth: 1,
          borderTopColor: '#FFE0B2',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
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
          tabBarLabel: 'Nyumbani',
        }}
      />
      <Tab.Screen 
        name="Accounts" 
        component={AccountsScreen}
        options={{
          tabBarLabel: 'Akaunti',
        }}
      />
      <Tab.Screen
        name="Transfer"
        component={TransferScreen}
        options={{
          title: 'Transfer Money',
          tabBarLabel: 'Tuma Pesa',
        }}
      />
      <Tab.Screen
        name="Cards"
        component={CardsScreen}
        options={{
          title: 'My Cards',
          tabBarLabel: 'Kadi',
        }}
      />
      <Tab.Screen
        name="More"
        component={SettingsScreen}
        options={{
          title: 'More',
          tabBarLabel: 'Zaidi',
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
        name="BillPaymentSuccess"
        component={BillPaymentSuccessScreen}
        options={{
          title: 'Payment Complete',
          headerBackVisible: false,
        }}
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
        name="VisaPay"
        component={VisaPayScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LUKU"
        component={LUKUScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GePG"
        component={GePGScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DSTV"
        component={DSTVScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Water"
        component={WaterScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="QRPay"
        component={QRPayScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Lipa"
        component={LipaScreen}
        options={{ title: 'Lipa' }}
      />
      <Stack.Screen
        name="LipaSuccess"
        component={LipaSuccessScreen}
        options={{
          title: 'Lipa',
          headerBackVisible: false,
        }}
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
        name="InternalTransfer"
        component={InternalTransferScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="MobileMoneyTransfer"
        component={MobileMoneyTransferScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="BankTransfer"
        component={BankTransferScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TransferSuccess"
        component={TransferSuccessScreen}
        options={{
          title: 'Transfer Complete',
          headerShown: false,
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
