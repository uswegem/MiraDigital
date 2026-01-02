import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/api';
import { DEV_CONFIG } from '../config/dev';

// Types
interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  clientId: string;
  avatarUrl?: string;
}

interface Account {
  id: string;
  accountNo: string;
  accountType: string;
  productName: string;
  currency: string;
  balance: number;
  availableBalance: number;
}

interface TenantConfig {
  id: string;
  name: string;
  branding: {
    logo: string;
    primaryColor: string;
    secondaryColor: string;
  };
  features: {
    transfers: boolean;
    billPayments: boolean;
    airtime: boolean;
    loans: boolean;
    cards: boolean;
    tapToPay: boolean;
    qrPay: boolean;
  };
}

// Auth Store
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  tenantId: string | null;
  tenantConfig: TenantConfig | null;
  
  // Actions
  login: (username: string, password: string, tenantId: string) => Promise<{ requiresOtp: boolean; sessionId?: string }>;
  loginWithPin: (pin: string, useBiometric: boolean) => Promise<{ token: string; refreshToken: string } | undefined>;
  loginWithStoredToken: (token: string, refreshToken: string) => Promise<void>;
  loginWithBiometric: (token: string, refreshToken: string, biometricType: 'fingerprint' | 'face') => Promise<void>;
  registerRetail: (data: { fullName: string; mobileNumber: string; email?: string; dateOfBirth?: string; pin: string }) => Promise<{ user: any; accountNo: string; accountAlias: string; message: string; token: string; refreshToken: string }>;
  verifyOtp: (otp: string, sessionId: string) => Promise<void>;
  logout: () => Promise<void>;
  loadProfile: () => Promise<void>;
  setTenantConfig: (config: TenantConfig) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      tenantId: null,
      tenantConfig: null,

      login: async (username, password, tenantId) => {
        set({ isLoading: true });
        try {
          const response = await apiService.login(username, password, tenantId);
          
          if (response.requiresOtp) {
            set({ tenantId, isLoading: false });
            return { requiresOtp: true, sessionId: response.sessionId };
          }

          set({
            isAuthenticated: true,
            user: response.user,
            tenantId,
            isLoading: false,
          });

          // Load tenant config
          const config = await apiService.getTenantConfig();
          set({ tenantConfig: config });

          return { requiresOtp: false };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      loginWithPin: async (pin, useBiometric) => {
        set({ isLoading: true });
        try {
          // OFFLINE MODE: Skip backend API call for testing
          if (DEV_CONFIG.OFFLINE_MODE) {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            set({
              isAuthenticated: true,
              user: DEV_CONFIG.MOCK_USER,
              isLoading: false,
            });
            
            return {
              token: DEV_CONFIG.MOCK_TOKEN,
              refreshToken: DEV_CONFIG.MOCK_REFRESH_TOKEN,
            };
          }
          
          const response = await apiService.loginWithPin(pin, useBiometric);
          set({
            isAuthenticated: true,
            user: response.user,
            isLoading: false,
          });

          // Load tenant config if not already loaded
          if (!get().tenantConfig) {
            const config = await apiService.getTenantConfig();
            set({ tenantConfig: config });
          }
          
          // Return tokens for secure storage
          return {
            token: response.token,
            refreshToken: response.refreshToken,
          };
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      loginWithStoredToken: async (token, refreshToken) => {
        set({ isLoading: true });
        try {
          // OFFLINE MODE: Skip backend API call for testing
          if (DEV_CONFIG.OFFLINE_MODE) {
            await new Promise(resolve => setTimeout(resolve, 300));
            
            set({
              isAuthenticated: true,
              user: DEV_CONFIG.MOCK_USER,
              isLoading: false,
            });
            return;
          }
          
          // Set tokens in API service
          await apiService.setTokens(token, refreshToken);
          
          // Load user profile
          const user = await apiService.getProfile();
          set({
            isAuthenticated: true,
            user,
            isLoading: false,
          });

          // Load tenant config if not already loaded
          if (!get().tenantConfig) {
            const config = await apiService.getTenantConfig();
            set({ tenantConfig: config });
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      loginWithBiometric: async (token, refreshToken, biometricType) => {
        set({ isLoading: true });
        try {
          // OFFLINE MODE: Skip backend API call for testing
          if (DEV_CONFIG.OFFLINE_MODE) {
            await new Promise(resolve => setTimeout(resolve, 400));
            
            set({
              isAuthenticated: true,
              user: DEV_CONFIG.MOCK_USER,
              isLoading: false,
            });
            return;
          }
          
          // Verify biometric authentication with backend
          const response = await apiService.loginWithBiometric(token, refreshToken, biometricType);
          
          set({
            isAuthenticated: true,
            user: response.user,
            isLoading: false,
          });

          // Load tenant config if not already loaded
          if (!get().tenantConfig) {
            const config = await apiService.getTenantConfig();
            set({ tenantConfig: config });
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      registerRetail: async (data) => {
        set({ isLoading: true });
        try {
          // OFFLINE MODE: Skip backend API call for testing
          if (DEV_CONFIG.OFFLINE_MODE) {
            await new Promise(resolve => setTimeout(resolve, 800));
            
            const mockResponse = {
              user: {
                ...DEV_CONFIG.MOCK_USER,
                fullName: data.fullName,
                mobileNumber: data.mobileNumber,
              },
              accountNo: '000000001',
              accountAlias: data.mobileNumber,
              message: 'Registration successful (OFFLINE MODE)',
              token: DEV_CONFIG.MOCK_TOKEN,
              refreshToken: DEV_CONFIG.MOCK_REFRESH_TOKEN,
            };
            
            set({
              isAuthenticated: true,
              user: mockResponse.user,
              isLoading: false,
            });
            
            return mockResponse;
          }
          
          const response = await apiService.registerRetail(data);
          
          set({
            isAuthenticated: true,
            user: response.user,
            isLoading: false,
          });

          // Load tenant config if not already loaded
          if (!get().tenantConfig) {
            const config = await apiService.getTenantConfig();
            set({ tenantConfig: config });
          }

          return response;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      verifyOtp: async (otp, sessionId) => {
        set({ isLoading: true });
        try {
          const response = await apiService.verifyOtp(otp, sessionId);
          set({
            isAuthenticated: true,
            user: response.user,
            isLoading: false,
          });

          // Load tenant config
          const config = await apiService.getTenantConfig();
          set({ tenantConfig: config });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        await apiService.logout();
        
        // Clear biometric credentials from keychain
        try {
          const Keychain = require('react-native-keychain');
          await Keychain.resetGenericPassword({ service: 'miradigital.auth' });
        } catch (error) {
          console.log('Error clearing biometric credentials:', error);
        }
        
        set({
          isAuthenticated: false,
          user: null,
          tenantConfig: null,
        });
      },

      loadProfile: async () => {
        try {
          const user = await apiService.getProfile();
          set({ user });
        } catch (error) {
          console.error('Failed to load profile:', error);
        }
      },

      setTenantConfig: (config) => set({ tenantConfig: config }),

      reset: () => set({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        tenantId: null,
        tenantConfig: null,
      }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        tenantId: state.tenantId,
        tenantConfig: state.tenantConfig,
      }),
    }
  )
);

// Accounts Store
interface AccountsState {
  accounts: Account[];
  selectedAccount: Account | null;
  isLoading: boolean;
  lastUpdated: number | null;

  loadAccounts: () => Promise<void>;
  selectAccount: (account: Account) => void;
  refreshBalance: (accountId: string) => Promise<void>;
}

export const useAccountsStore = create<AccountsState>((set, get) => ({
  accounts: [],
  selectedAccount: null,
  isLoading: false,
  lastUpdated: null,

  loadAccounts: async () => {
    set({ isLoading: true });
    try {
      const accounts = await apiService.getAccounts();
      set({
        accounts,
        selectedAccount: accounts[0] || null,
        isLoading: false,
        lastUpdated: Date.now(),
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  selectAccount: (account) => set({ selectedAccount: account }),

  refreshBalance: async (accountId) => {
    try {
      const balance = await apiService.getAccountBalance(accountId);
      set((state) => ({
        accounts: state.accounts.map((acc) =>
          acc.id === accountId
            ? { ...acc, balance: balance.balance, availableBalance: balance.availableBalance }
            : acc
        ),
        selectedAccount:
          state.selectedAccount?.id === accountId
            ? { ...state.selectedAccount, balance: balance.balance, availableBalance: balance.availableBalance }
            : state.selectedAccount,
      }));
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
  },
}));

// Transactions Store
interface Transaction {
  id: string;
  type: string;
  amount: number;
  currency: string;
  description: string;
  date: string;
  balance: number;
  status: string;
}

interface TransactionsState {
  transactions: Transaction[];
  isLoading: boolean;
  hasMore: boolean;
  page: number;

  loadTransactions: (accountId: string, refresh?: boolean) => Promise<void>;
  loadMore: (accountId: string) => Promise<void>;
  reset: () => void;
}

export const useTransactionsStore = create<TransactionsState>((set, get) => ({
  transactions: [],
  isLoading: false,
  hasMore: true,
  page: 1,

  loadTransactions: async (accountId, refresh = false) => {
    if (refresh) {
      set({ transactions: [], page: 1, hasMore: true });
    }
    
    set({ isLoading: true });
    try {
      const response = await apiService.getTransactions(accountId, { page: 1, limit: 20 });
      set({
        transactions: response.transactions,
        hasMore: response.hasMore,
        page: 1,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  loadMore: async (accountId) => {
    const { hasMore, isLoading, page, transactions } = get();
    if (!hasMore || isLoading) return;

    set({ isLoading: true });
    try {
      const response = await apiService.getTransactions(accountId, { page: page + 1, limit: 20 });
      set({
        transactions: [...transactions, ...response.transactions],
        hasMore: response.hasMore,
        page: page + 1,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  reset: () => set({ transactions: [], page: 1, hasMore: true }),
}));

// Cards Store
interface Card {
  id: string;
  panLastFour: string;
  cardBrand: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName: string;
  isDefault: boolean;
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
}

interface CardsState {
  cards: Card[];
  isLoading: boolean;

  loadCards: () => Promise<void>;
  addCard: (cardData: any) => Promise<Card>;
  removeCard: (cardId: string) => Promise<void>;
  suspendCard: (cardId: string, reason: string) => Promise<void>;
  resumeCard: (cardId: string) => Promise<void>;
}

export const useCardsStore = create<CardsState>((set, get) => ({
  cards: [],
  isLoading: false,

  loadCards: async () => {
    set({ isLoading: true });
    try {
      const cards = await apiService.getCards();
      set({ cards, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  addCard: async (cardData) => {
    set({ isLoading: true });
    try {
      const newCard = await apiService.addCard(cardData);
      set((state) => ({
        cards: [...state.cards, newCard],
        isLoading: false,
      }));
      return newCard;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  removeCard: async (cardId) => {
    await apiService.removeCard(cardId);
    set((state) => ({
      cards: state.cards.filter((c) => c.id !== cardId),
    }));
  },

  suspendCard: async (cardId, reason) => {
    await apiService.suspendCard(cardId, reason);
    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === cardId ? { ...c, status: 'SUSPENDED' as const } : c
      ),
    }));
  },

  resumeCard: async (cardId) => {
    await apiService.resumeCard(cardId);
    set((state) => ({
      cards: state.cards.map((c) =>
        c.id === cardId ? { ...c, status: 'ACTIVE' as const } : c
      ),
    }));
  },
}));

// Export biller store
export { useBillerStore } from './billerStore';
