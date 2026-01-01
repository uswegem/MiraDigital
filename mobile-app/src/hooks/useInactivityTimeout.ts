import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '../store';
import { APP_CONFIG } from '../config';

interface UseInactivityTimeoutOptions {
  timeout?: number;
  warningTime?: number;
  onWarning?: () => void;
  onTimeout?: () => void;
}

export function useInactivityTimeout(options: UseInactivityTimeoutOptions = {}) {
  const {
    timeout = APP_CONFIG.sessionTimeout,
    warningTime = APP_CONFIG.inactivityWarning,
    onWarning,
    onTimeout,
  } = options;

  const { logout, isAuthenticated } = useAuthStore();
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const warningIdRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimers = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;

    // Clear existing timers
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    if (warningIdRef.current) {
      clearTimeout(warningIdRef.current);
    }

    if (!isAuthenticated) return;

    // Set warning timer
    warningIdRef.current = setTimeout(() => {
      warningShownRef.current = true;
      onWarning?.();
    }, timeout - warningTime);

    // Set logout timer
    timeoutIdRef.current = setTimeout(() => {
      onTimeout?.();
      logout();
    }, timeout);
  }, [isAuthenticated, timeout, warningTime, onWarning, onTimeout, logout]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const inactiveTime = Date.now() - lastActivityRef.current;
        
        if (isAuthenticated && inactiveTime > timeout) {
          logout();
        } else {
          resetTimers();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated, timeout, logout, resetTimers]);

  // Initial timer setup
  useEffect(() => {
    if (isAuthenticated) {
      resetTimers();
    }

    return () => {
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (warningIdRef.current) clearTimeout(warningIdRef.current);
    };
  }, [isAuthenticated, resetTimers]);

  // Function to call on user activity
  const reportActivity = useCallback(() => {
    if (isAuthenticated) {
      resetTimers();
    }
  }, [isAuthenticated, resetTimers]);

  return {
    reportActivity,
    resetTimers,
  };
}

export default useInactivityTimeout;
