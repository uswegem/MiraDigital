import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Surface,
  useTheme,
  HelperText,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store';
import { spacing, borderRadius } from '../../theme';

interface LoginScreenProps {
  navigation: any;
}

export function LoginScreen({ navigation }: LoginScreenProps) {
  const theme = useTheme();
  const { login, isLoading, tenantConfig } = useAuthStore();

  const [tenantId, setTenantId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
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
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Mobile Banking
            </Text>
          </View>

          {/* Login Form */}
          <Surface style={styles.formContainer} elevation={2}>
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

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              style={styles.loginButton}
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

          {/* Footer */}
          <View style={styles.footer}>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Don't have an account?
            </Text>
            <Button mode="text" onPress={() => navigation.navigate('Register')}>
              Register
            </Button>
          </View>
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
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  formTitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.sm,
  },
  loginButton: {
    marginTop: spacing.md,
  },
  loginButtonContent: {
    paddingVertical: spacing.xs,
  },
  forgotButton: {
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
});

export default LoginScreen;
