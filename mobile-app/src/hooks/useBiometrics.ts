import { useState, useEffect, useCallback } from 'react';
import * as Keychain from 'react-native-keychain';
import ReactNativeBiometrics, { BiometryType } from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics();

interface UseBiometricsResult {
  isAvailable: boolean;
  biometryType: BiometryType | null;
  isEnabled: boolean;
  authenticate: (reason?: string) => Promise<boolean>;
  enableBiometrics: () => Promise<void>;
  disableBiometrics: () => Promise<void>;
}

const BIOMETRICS_KEY = 'biometrics_enabled';

export function useBiometrics(): UseBiometricsResult {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState<BiometryType | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    checkBiometrics();
    loadSettings();
  }, []);

  const checkBiometrics = async () => {
    try {
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      setIsAvailable(available);
      setBiometryType(biometryType || null);
    } catch (error) {
      console.error('Biometrics check failed:', error);
      setIsAvailable(false);
    }
  };

  const loadSettings = async () => {
    try {
      const credentials = await Keychain.getGenericPassword({ service: BIOMETRICS_KEY });
      setIsEnabled(credentials !== false && credentials?.password === 'enabled');
    } catch (error) {
      setIsEnabled(false);
    }
  };

  const authenticate = useCallback(
    async (reason: string = 'Authenticate to continue'): Promise<boolean> => {
      if (!isAvailable) {
        return false;
      }

      try {
        const { success } = await rnBiometrics.simplePrompt({
          promptMessage: reason,
          cancelButtonText: 'Cancel',
        });
        return success;
      } catch (error) {
        console.error('Biometric authentication failed:', error);
        return false;
      }
    },
    [isAvailable]
  );

  const enableBiometrics = useCallback(async () => {
    if (!isAvailable) {
      throw new Error('Biometrics not available on this device');
    }

    // Verify user can authenticate first
    const authenticated = await authenticate('Verify your identity to enable biometrics');
    if (!authenticated) {
      throw new Error('Authentication failed');
    }

    await Keychain.setGenericPassword('biometrics', 'enabled', { service: BIOMETRICS_KEY });
    setIsEnabled(true);
  }, [isAvailable, authenticate]);

  const disableBiometrics = useCallback(async () => {
    await Keychain.resetGenericPassword({ service: BIOMETRICS_KEY });
    setIsEnabled(false);
  }, []);

  return {
    isAvailable,
    biometryType,
    isEnabled,
    authenticate,
    enableBiometrics,
    disableBiometrics,
  };
}

export default useBiometrics;
