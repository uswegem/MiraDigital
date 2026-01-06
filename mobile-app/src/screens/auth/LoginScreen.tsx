import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Surface,
  useTheme,
  HelperText,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store';
import { useBiometrics } from '../../hooks';
import { spacing, borderRadius, colors } from '../../theme';
import Button from '../../components/Button';
import Icon from '../../components/Icon';
import TextInput from '../../components/TextInput';

interface LoginScreenProps {
  navigation: any;
}

export function LoginScreen({ navigation }: LoginScreenProps) {
  const theme = useTheme();
  const { login, isLoading, tenantConfig } = useAuthStore();
  const { isAvailable: isBiometricsAvailable, isEnabled: isBiometricsEnabled, authenticate, biometryType } = useBiometrics();

  const [tenantId, setTenantId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [savedUsername, setSavedUsername] = useState('');

  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const storedUsername = await AsyncStorage.getItem('saved_username');
      const storedTenantId = await AsyncStorage.getItem('saved_tenant_id');
      if (storedUsername && storedTenantId) {
        setSavedUsername(storedUsername);
        setTenantId(storedTenantId);
      }
    } catch (error) {
      console.log('Failed to load saved credentials');
    }
  };

  const handleBiometricLogin = async () => {
    if (!isBiometricsAvailable || !isBiometricsEnabled) {
      return;
    }

    try {
      const biometricName = biometryType === 'FaceID' ? 'Face ID' : biometryType === 'TouchID' ? 'Touch ID' : 'Biometric';
      const authenticated = await authenticate(`Use ${biometricName} to sign in`);
      
      if (authenticated && savedUsername) {
        setErrors({ general: 'Please enter your password to complete sign in' });
        setUsername(savedUsername);
      }
    } catch (error: any) {
      setErrors({ general: 'Biometric authentication failed' });
    }
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!tenantId.trim()) {
      newErrors.tenantId = 'Institution code is required';
    }
    if (!username.trim()) {
      newErrors.username = 'Username is required';
    }
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    try {
      const result = await login(username, password, tenantId);

      if (isBiometricsEnabled) {
        await AsyncStorage.setItem('saved_username', username);
        await AsyncStorage.setItem('saved_tenant_id', tenantId);
      }

      if (result.requiresOtp) {
        navigation.navigate('OtpVerification', { sessionId: result.sessionId });
      }
    } catch (error: any) {
      setErrors({
        general: error.response?.data?.message || 'Login failed. Please try again.',
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={styles.logoContainer} entering={FadeInDown.delay(100).springify()}>
            <Image
              source={
                tenantConfig?.branding?.logo
                  ? { uri: tenantConfig.branding.logo }
                  : require('../../assets/logo.png')
              }
              style={styles.logo}
              resizeMode="contain"
            />
            <Text variant="headlineMedium" style={styles.appName}>
              MiraDigital
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <Surface style={styles.formContainer} elevation={8}>
              <Text variant="titleLarge" style={styles.formTitle}>Sign In</Text>
              {errors.general && (
                <HelperText type="error" visible>
                  {errors.general}
                </HelperText>
              )}
              <TextInput
                label="Institution Code"
                value={tenantId}
                onChangeText={(text) => {
                  setTenantId(text.toLowerCase());
                  setErrors((prev) => ({ ...prev, tenantId: '' }));
                }}
                autoCapitalize="none"
                left={<Icon name="bank" />}
                error={!!errors.tenantId}
              />
              <TextInput
                label="Username"
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  setErrors((prev) => ({ ...prev, username: '' }));
                }}
                autoCapitalize="none"
                left={<Icon name="account" />}
                error={!!errors.username}
              />
              <TextInput
                label="Password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrors((prev) => ({ ...prev, password: '' }));
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                left={<Icon name="lock" />}
                right={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Icon name={showPassword ? 'eye-off' : 'eye'} />
                  </TouchableOpacity>
                }
                error={!!errors.password}
              />

              {isBiometricsAvailable && isBiometricsEnabled && savedUsername && (
                <Button
                  onPress={handleBiometricLogin}
                  variant="secondary"
                  style={{ marginTop: spacing.md }}
                >
                  Sign in with {biometryType === 'FaceID' ? 'Face ID' : 'Touch ID'}
                </Button>
              )}

              <Button
                onPress={handleLogin}
                loading={isLoading}
                disabled={isLoading}
                style={{ marginTop: spacing.md }}
              >
                Sign In
              </Button>

              <Button
                onPress={() => navigation.navigate('ForgotPassword')}
                variant="secondary"
                style={{ marginTop: spacing.sm }}
              >
                Forgot Password?
              </Button>
            </Surface>
          </Animated.View>

          <Animated.View style={styles.footer} entering={FadeIn.delay(500)}>
            <Text variant="bodySmall">Don't have an account?</Text>
            <Button mode="text" onPress={() => navigation.navigate('Register')}>
              Register
            </Button>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: spacing.md,
  },
  appName: {
    fontWeight: 'bold',
  },
  formContainer: {
    padding: spacing.xl,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  formTitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
});

export default LoginScreen;
