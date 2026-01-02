import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiConfig } from '../config';

// Storage keys
const TOKEN_KEY = '@miradigital:token';
const REFRESH_TOKEN_KEY = '@miradigital:refreshToken';
const TENANT_KEY = '@miradigital:tenant';

class ApiService {
  private client: AxiosInstance;
  private isRefreshing: boolean = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    const config = getApiConfig();
    
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - add auth token and tenant
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        const tenant = await AsyncStorage.getItem(TENANT_KEY);

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        if (tenant) {
          config.headers['X-Tenant-ID'] = tenant;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Wait for refresh to complete
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                originalRequest.headers = originalRequest.headers || {};
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.client(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
            const response = await this.client.post('/auth/refresh', { refreshToken });
            const { token } = response.data;

            await AsyncStorage.setItem(TOKEN_KEY, token);
            
            this.refreshSubscribers.forEach((callback) => callback(token));
            this.refreshSubscribers = [];

            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed - logout user
            await this.logout();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  async login(username: string, password: string, tenantId: string) {
    await AsyncStorage.setItem(TENANT_KEY, tenantId);
    
    const response = await this.client.post('/auth/login', { username, password });
    const { token, refreshToken, user } = response.data;

    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

    return { user, token };
  }

  async verifyOtp(otp: string, sessionId: string) {
    const response = await this.client.post('/auth/verify-otp', { otp, sessionId });
    return response.data;
  }

  async logout() {
    try {
      await this.client.post('/auth/logout');
    } catch (e) {
      // Ignore logout API errors
    }
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY]);
  }

  async getProfile() {
    const response = await this.client.get('/auth/profile');
    return response.data;
  }

  // Account methods
  async getAccounts() {
    const response = await this.client.get('/accounts');
    return response.data;
  }

  async getAccountBalance(accountId: string) {
    const response = await this.client.get(`/accounts/${accountId}/balance`);
    return response.data;
  }

  async getTransactions(accountId: string, params?: { page?: number; limit?: number }) {
    const response = await this.client.get(`/accounts/${accountId}/transactions`, { params });
    return response.data;
  }

  async getMiniStatement(accountId: string) {
    const response = await this.client.get(`/accounts/${accountId}/mini-statement`);
    return response.data;
  }

  // Transfer methods
  async transferInternal(data: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    narration?: string;
  }) {
    const response = await this.client.post('/transfers/internal', data);
    return response.data;
  }

  async transferExternal(data: {
    fromAccountId: string;
    destinationAccount: string;
    destinationBank: string;
    amount: number;
    recipientName: string;
    narration?: string;
  }) {
    const response = await this.client.post('/transfers/external', data);
    return response.data;
  }

  async transferMobile(data: {
    fromAccountId: string;
    phoneNumber: string;
    network: string;
    amount: number;
    recipientName?: string;
  }) {
    const response = await this.client.post('/transfers/mobile', data);
    return response.data;
  }

  // Bill payment methods
  async getBillers(category?: string) {
    const response = await this.client.get('/bills/billers', { params: { category } });
    return response.data;
  }

  async validateBiller(billerCode: string, accountNumber: string) {
    const response = await this.client.post('/bills/validate', { billerCode, accountNumber });
    return response.data;
  }

  async payBill(data: {
    billerCode: string;
    accountNumber: string;
    amount: number;
    fromAccountId: string;
  }) {
    const response = await this.client.post('/bills/pay', data);
    return response.data;
  }

  async buyAirtime(data: {
    phoneNumber: string;
    network: string;
    amount: number;
    fromAccountId: string;
  }) {
    const response = await this.client.post('/bills/airtime', data);
    return response.data;
  }

  // Loan methods
  async getLoans() {
    const response = await this.client.get('/loans');
    return response.data;
  }

  async getLoanDetails(loanId: string) {
    const response = await this.client.get(`/loans/${loanId}`);
    return response.data;
  }

  async repayLoan(data: {
    loanId: string;
    amount: number;
    fromAccountId: string;
  }) {
    const response = await this.client.post('/loans/repay', data);
    return response.data;
  }

  // Card methods
  async getCards() {
    const response = await this.client.get('/cards');
    return response.data;
  }

  async addCard(cardData: {
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
    cardholderName: string;
    isDefault?: boolean;
  }) {
    const response = await this.client.post('/cards', cardData);
    return response.data;
  }

  async removeCard(cardId: string) {
    const response = await this.client.delete(`/cards/${cardId}`);
    return response.data;
  }

  async suspendCard(cardId: string, reason: string) {
    const response = await this.client.post(`/cards/${cardId}/suspend`, { reason });
    return response.data;
  }

  async resumeCard(cardId: string) {
    const response = await this.client.post(`/cards/${cardId}/resume`);
    return response.data;
  }

  async prepareTapToPay(cardId: string, merchantData: {
    merchantId: string;
    merchantName: string;
    amount: number;
  }) {
    const response = await this.client.post(`/cards/${cardId}/tap-to-pay/prepare`, merchantData);
    return response.data;
  }

  // Banks list
  async getBanks() {
    const response = await this.client.get('/transfers/banks');
    return response.data;
  }

  // Beneficiaries
  async getBeneficiaries() {
    const response = await this.client.get('/beneficiaries');
    return response.data;
  }

  async addBeneficiary(data: {
    name: string;
    accountNumber: string;
    bankCode?: string;
    phoneNumber?: string;
    type: 'BANK' | 'MOBILE' | 'INTERNAL';
  }) {
    const response = await this.client.post('/beneficiaries', data);
    return response.data;
  }

  async deleteBeneficiary(id: string) {
    const response = await this.client.delete(`/beneficiaries/${id}`);
    return response.data;
  }

  // Tenant config
  async getTenantConfig() {
    const response = await this.client.get('/config/tenant');
    return response.data;
  }

  // ==================
  // QR PAY / TanQR METHODS
  // ==================

  /**
   * Validate QR merchant through TIPS
   */
  async validateQRMerchant(data: {
    merchantId: string;
    merchantName: string;
    qrData: string;
  }) {
    const response = await this.client.post('/qr-pay/validate', data);
    return response.data;
  }

  /**
   * Lookup merchant by ID or pay bill number
   */
  async lookupQRMerchant(merchantId: string) {
    const response = await this.client.get(`/qr-pay/lookup/${merchantId}`);
    return response.data;
  }

  /**
   * Process QR payment through TIPS
   */
  async payQRMerchant(data: {
    fromAccountId: string;
    merchantId: string;
    merchantName: string;
    merchantAccount: string;
    merchantBank: string;
    amount: number;
    reference?: string;
    qrData?: string;
    currency?: string;
  }) {
    const response = await this.client.post('/qr-pay/pay', data);
    return response.data;
  }

  /**
   * Get QR payment history
   */
  async getQRPaymentHistory(params?: { page?: number; limit?: number }) {
    const response = await this.client.get('/qr-pay/history', { params });
    return response.data;
  }

  /**
   * Get list of favorite/recent merchants
   */
  async getFavoriteMerchants() {
    const response = await this.client.get('/qr-pay/favorites');
    return response.data;
  }

  /**
   * Add merchant to favorites
   */
  async addFavoriteMerchant(data: {
    merchantId: string;
    merchantName: string;
    merchantAccount: string;
    merchantBank: string;
  }) {
    const response = await this.client.post('/qr-pay/favorites', data);
    return response.data;
  }

  // ====================
  // ONBOARDING METHODS
  // ====================

  /**
   * Initiate onboarding - sends OTP to phone
   */
  async initiateOnboarding(phone: string) {
    const response = await this.client.post('/onboarding/initiate', { phone });
    return response.data;
  }

  /**
   * Verify OTP during onboarding
   */
  async verifyOnboardingOtp(applicationId: string, otp: string) {
    const response = await this.client.post('/onboarding/verify-otp', { applicationId, otp });
    return response.data;
  }

  /**
   * Save personal information
   */
  async savePersonalInfo(applicationId: string, data: {
    firstName: string;
    middleName?: string;
    lastName: string;
    dateOfBirth: string;
    gender: 'MALE' | 'FEMALE';
    maritalStatus: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
    email?: string;
  }) {
    const response = await this.client.post('/onboarding/personal-info', { applicationId, ...data });
    return response.data;
  }

  /**
   * Get document upload URL
   */
  async getDocumentUploadUrl(applicationId: string, documentType: string, side: 'front' | 'back') {
    const response = await this.client.post('/onboarding/documents/upload-url', {
      applicationId,
      documentType,
      side,
    });
    return response.data;
  }

  /**
   * Confirm document upload
   */
  async confirmDocumentUpload(applicationId: string, data: {
    documentType: string;
    frontImageKey: string;
    backImageKey?: string;
  }) {
    const response = await this.client.post('/onboarding/documents/confirm', { applicationId, ...data });
    return response.data;
  }

  /**
   * Verify NIDA number
   */
  async verifyNida(applicationId: string, data: {
    nidaNumber: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
  }) {
    const response = await this.client.post('/onboarding/verify-nida', { applicationId, ...data });
    return response.data;
  }

  /**
   * Start liveness session for selfie
   */
  async startLivenessSession(applicationId: string) {
    const response = await this.client.post('/onboarding/selfie/liveness-session', { applicationId });
    return response.data;
  }

  /**
   * Confirm selfie upload
   */
  async confirmSelfie(applicationId: string, data: {
    livenessSessionId: string;
    selfieImageKey: string;
  }) {
    const response = await this.client.post('/onboarding/selfie/confirm', { applicationId, ...data });
    return response.data;
  }

  /**
   * Save address information
   */
  async saveAddress(applicationId: string, data: {
    region: string;
    district: string;
    ward?: string;
    street: string;
    houseNumber?: string;
    postalCode?: string;
  }) {
    const response = await this.client.post('/onboarding/address', { applicationId, ...data });
    return response.data;
  }

  /**
   * Save employment information
   */
  async saveEmployment(applicationId: string, data: {
    status: 'EMPLOYED' | 'SELF_EMPLOYED' | 'UNEMPLOYED' | 'STUDENT' | 'RETIRED';
    employerName?: string;
    occupation?: string;
    monthlyIncome?: number;
    incomeSource?: string;
  }) {
    const response = await this.client.post('/onboarding/employment', { applicationId, ...data });
    return response.data;
  }

  /**
   * Save next of kin information
   */
  async saveNextOfKin(applicationId: string, data: {
    name: string;
    relationship: 'SPOUSE' | 'PARENT' | 'CHILD' | 'SIBLING' | 'OTHER';
    phone: string;
  }) {
    const response = await this.client.post('/onboarding/next-of-kin', { applicationId, ...data });
    return response.data;
  }

  /**
   * Get available products
   */
  async getOnboardingProducts(applicationId: string) {
    const response = await this.client.get(`/onboarding/products?applicationId=${applicationId}`);
    return response.data;
  }

  /**
   * Select product
   */
  async selectProduct(applicationId: string, productId: number) {
    const response = await this.client.post('/onboarding/select-product', { applicationId, productId });
    return response.data;
  }

  /**
   * Accept terms and conditions
   */
  async acceptTerms(applicationId: string) {
    const response = await this.client.post('/onboarding/accept-terms', { applicationId });
    return response.data;
  }

  /**
   * Submit onboarding application
   */
  async submitOnboarding(applicationId: string) {
    const response = await this.client.post('/onboarding/submit', { applicationId });
    return response.data;
  }

  /**
   * Get onboarding status
   */
  async getOnboardingStatus(applicationId: string) {
    const response = await this.client.get(`/onboarding/status/${applicationId}`);
    return response.data;
  }

  /**
   * Resume existing application
   */
  async resumeOnboarding(phone: string, otp: string) {
    const response = await this.client.post('/onboarding/resume', { phone, otp });
    return response.data;
  }

  /**
   * Get application summary
   */
  async getApplicationSummary(applicationId: string) {
    const response = await this.client.get(`/onboarding/summary/${applicationId}`);
    return response.data;
  }

  // Generic methods for direct access
  get(url: string, config?: AxiosRequestConfig) {
    return this.client.get(url, config);
  }

  post(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.post(url, data, config);
  }

  put(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.client.put(url, data, config);
  }

  delete(url: string, config?: AxiosRequestConfig) {
    return this.client.delete(url, config);
  }
}

export const apiService = new ApiService();
export default apiService;
