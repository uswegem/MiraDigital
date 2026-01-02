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
  TextInput,
  Button,
  Surface,
  useTheme,
  HelperText,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../../store';
import { useBiometrics } from '../../hooks';
import { spacing, borderRadius } from '../../theme';

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
      // Check if user has saved credentials for biometric login
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
        // Auto-fill credentials and attempt login
        // In production, you'd retrieve encrypted password from secure storage
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

      // Save credentials for future biometric login
      if (isBiometricsEnabled) {
        await AsyncStorage.setItem('saved_username', username);
        await AsyncStorage.setItem('saved_tenant_id', tenantId);
      }

      if (result.requiresOtp) {
        navigation.navigate('OtpVerification', { sessionId: result.sessionId });
      }
      // If no OTP required, auth store will update and navigation will happen automatically
    } catch (error: any) {
      setErrors({
        general: error.response?.data?.message || 'Login failed. Please try again.',
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#FFC107' }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
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
            <Text variant="bodyMedium" style={{ color: 'rgba(0,0,0,0.6)', fontWeight: '500' }}>
              Mobile Banking
            </Text>
          </Animated.View>

          {/* Login Form */}
          <Animated.View entering={FadeInDown.delay(300).springify()}>
          <Surface style={styles.formContainer} elevation={8}>
            <Text variant="titleLarge" style={styles.formTitle}>
              Sign In
            </Text>

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
              mode="outlined"
              autoCapitalize="none"
              autoCorrect={false}
              left={<TextInput.Icon icon="bank" />}
              error={!!errors.tenantId}
              style={styles.input}
            />
            {errors.tenantId && (
              <HelperText type="error" visible>
                {errors.tenantId}
              </HelperText>
            )}

            <TextInput
              label="Username"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                setErrors((prev) => ({ ...prev, username: '' }));
              }}
              mode="outlined"
              autoCapitalize="none"
              autoCorrect={false}
              left={<TextInput.Icon icon="account" />}
              error={!!errors.username}
              style={styles.input}
            />
            {errors.username && (
              <HelperText type="error" visible>
                {errors.username}
              </HelperText>
            )}

            <TextInput
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrors((prev) => ({ ...prev, password: '' }));
              }}
              mode="outlined"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              error={!!errors.password}
              style={styles.input}
            />
            {errors.password && (
              <HelperText type="error" visible>
                {errors.password}
              </HelperText>
            )}

            {/* Biometric Login Button */}
            {isBiometricsAvailable && isBiometricsEnabled && savedUsername && (
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
                activeOpacity={0.7}
              >
                <Surface style={styles.biometricSurface} elevation={2}>
                  <Icon
                    name={biometryType === 'FaceID' ? 'face-recognition' : 'fingerprint'}
                    size={32}
                    color="#FFC107"
                  />
                  <Text variant="labelMedium" style={styles.biometricText}>
                    Use {biometryType === 'FaceID' ? 'Face ID' : biometryType === 'TouchID' ? 'Touch ID' : 'Biometric'}
                  </Text>
                </Surface>
              </TouchableOpacity>
            )}

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              style={styles.loginButton}
              buttonColor="#FFC107"
              contentStyle={styles.loginButtonContent}
            >
              Sign In
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotButton}
            >
              Forgot Password?
            </Button>
          </Surface>
          </Animated.View>

          {/* Footer */}
          <Animated.View style={styles.footer} entering={FadeIn.delay(500)}>
            <Text variant="bodySmall" style={{ color: 'rgba(0,0,0,0.6)' }}>
              Don't have an account?
            </Text>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  formTitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontWeight: '700',
  },
  input: {
    marginBottom: spacing.sm,
  },
  loginButton: {
    marginTop: spacing.md,    borderRadius: 12,
    elevation: 4,  },
  loginButtonContent: {
    paddingVertical: spacing.xs,
  },
  forgotButton: {
    marginTop: spacing.sm,
  },
  biometricButton: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  biometricSurface: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  biometricText: {
    marginLeft: spacing.sm,
    color: '#F57C00',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
});

export default LoginScreen;
