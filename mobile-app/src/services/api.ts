import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiConfig } from '../config';
import { DEV_CONFIG } from '../config/dev';
import mockApiService from './api.mock';

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

        console.log('API Request:', config);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle token refresh and logging
    this.client.interceptors.response.use(
      (response) => {
        console.log('API Response:', response);
        return response;
      },
      async (error: AxiosError) => {
        console.error('API Response Error:', error);
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

  // ... (all other API methods)
}

const apiService = DEV_CONFIG.OFFLINE_MODE ? mockApiService : new ApiService();

export default apiService as unknown as ApiService;
