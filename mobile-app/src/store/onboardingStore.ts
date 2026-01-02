import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export interface PersonalInfo {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE';
  maritalStatus: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
  email?: string;
}

export interface DocumentInfo {
  type: 'NIDA_CARD' | 'PASSPORT' | 'DRIVERS_LICENSE';
  frontImageKey?: string;
  backImageKey?: string;
  nidaNumber?: string;
  nidaVerified?: boolean;
  extractedData?: Record<string, any>;
}

export interface SelfieInfo {
  imageKey?: string;
  livenessConfidence?: number;
  faceMatchConfidence?: number;
  livenessSessionId?: string;
}

export interface AddressInfo {
  region: string;
  district: string;
  ward?: string;
  street: string;
  houseNumber?: string;
  postalCode?: string;
}

export interface EmploymentInfo {
  status: 'EMPLOYED' | 'SELF_EMPLOYED' | 'UNEMPLOYED' | 'STUDENT' | 'RETIRED';
  employerName?: string;
  occupation?: string;
  monthlyIncome?: number;
  incomeSource?: string;
}

export interface NextOfKinInfo {
  name: string;
  relationship: 'SPOUSE' | 'PARENT' | 'CHILD' | 'SIBLING' | 'OTHER';
  phone: string;
}

export interface SelectedProduct {
  productId: number;
  productName: string;
  productType: string;
}

export type OnboardingStep = 
  | 'welcome'
  | 'phone'
  | 'personal'
  | 'document'
  | 'selfie'
  | 'address'
  | 'employment'
  | 'product'
  | 'terms'
  | 'review'
  | 'pending'
  | 'complete';

export interface OnboardingState {
  // Application tracking
  applicationId: string | null;
  currentStep: OnboardingStep;
  isLoading: boolean;
  error: string | null;
  
  // Phone verification
  phone: string;
  phoneVerified: boolean;
  
  // Application data
  personalInfo: PersonalInfo | null;
  documentInfo: DocumentInfo | null;
  selfieInfo: SelfieInfo | null;
  addressInfo: AddressInfo | null;
  employmentInfo: EmploymentInfo | null;
  nextOfKinInfo: NextOfKinInfo | null;
  selectedProduct: SelectedProduct | null;
  termsAccepted: boolean;
  
  // Risk assessment
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  riskScore: number | null;
  
  // Available products
  availableProducts: SelectedProduct[];
  
  // Mifos
  mifosClientId: number | null;
  mifosAccountId: number | null;
  
  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Step 1: Phone verification
  initiateOnboarding: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (otp: string) => Promise<{ success: boolean; error?: string }>;
  resendOtp: () => Promise<{ success: boolean; error?: string }>;
  
  // Step 2: Personal info
  savePersonalInfo: (info: PersonalInfo) => Promise<{ success: boolean; error?: string }>;
  
  // Step 3: Document capture
  getDocumentUploadUrl: (side: 'front' | 'back') => Promise<{ success: boolean; uploadUrl?: string; key?: string; error?: string }>;
  confirmDocumentUpload: (frontKey: string, backKey?: string, docType?: string) => Promise<{ success: boolean; error?: string }>;
  verifyNida: (nidaNumber: string) => Promise<{ success: boolean; verified?: boolean; error?: string }>;
  
  // Step 4: Selfie
  startLivenessSession: () => Promise<{ success: boolean; sessionId?: string; error?: string }>;
  confirmSelfie: (sessionId: string, imageKey: string) => Promise<{ success: boolean; error?: string }>;
  
  // Step 5: Address
  saveAddressInfo: (info: AddressInfo) => Promise<{ success: boolean; error?: string }>;
  
  // Step 6: Employment
  saveEmploymentInfo: (info: EmploymentInfo) => Promise<{ success: boolean; error?: string }>;
  
  // Step 7: Next of kin
  saveNextOfKin: (info: NextOfKinInfo) => Promise<{ success: boolean; error?: string }>;
  
  // Step 8: Product selection
  fetchProducts: () => Promise<{ success: boolean; error?: string }>;
  selectProduct: (product: SelectedProduct) => Promise<{ success: boolean; error?: string }>;
  
  // Step 9: Terms
  acceptTerms: () => Promise<{ success: boolean; error?: string }>;
  
  // Step 10: Submit
  submitApplication: () => Promise<{ success: boolean; error?: string }>;
  
  // Resume & Status
  resumeApplication: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  checkStatus: () => Promise<{ success: boolean; status?: string; error?: string }>;
  
  // Navigation
  goToStep: (step: OnboardingStep) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  
  // Reset
  resetOnboarding: () => void;
}

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'phone',
  'personal',
  'document',
  'selfie',
  'address',
  'employment',
  'product',
  'terms',
  'review',
  'pending',
  'complete',
];

const initialState = {
  applicationId: null,
  currentStep: 'welcome' as OnboardingStep,
  isLoading: false,
  error: null,
  phone: '',
  phoneVerified: false,
  personalInfo: null,
  documentInfo: null,
  selfieInfo: null,
  addressInfo: null,
  employmentInfo: null,
  nextOfKinInfo: null,
  selectedProduct: null,
  termsAccepted: false,
  riskLevel: null,
  riskScore: null,
  availableProducts: [],
  mifosClientId: null,
  mifosAccountId: null,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      // Step 1: Phone verification
      initiateOnboarding: async (phone) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/onboarding/initiate', { phone });
          if (response.data.success) {
            set({
              applicationId: response.data.applicationId,
              phone,
              currentStep: 'phone',
              isLoading: false,
            });
            return { success: true };
          }
          throw new Error(response.data.error || 'Failed to initiate onboarding');
        } catch (error: any) {
          const message = error.response?.data?.error || error.message || 'Failed to initiate';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      verifyOtp: async (otp) => {
        set({ isLoading: true, error: null });
        try {
          const { applicationId } = get();
          const response = await api.post('/onboarding/verify-otp', { applicationId, otp });
          if (response.data.success) {
            set({
              phoneVerified: true,
              currentStep: 'personal',
              isLoading: false,
            });
            return { success: true };
          }
          throw new Error(response.data.error || 'Invalid OTP');
        } catch (error: any) {
          const message = error.response?.data?.error || error.message || 'Verification failed';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      resendOtp: async () => {
        set({ isLoading: true, error: null });
        try {
          const { phone } = get();
          const response = await api.post('/onboarding/initiate', { phone });
          if (response.data.success) {
            set({
              applicationId: response.data.applicationId,
              isLoading: false,
            });
            return { success: true };
          }
          throw new Error(response.data.error || 'Failed to resend OTP');
        } catch (error: any) {
          const message = error.response?.data?.error || error.message || 'Failed to resend';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // Step 2: Personal info
      savePersonalInfo: async (info) => {
        set({ isLoading: true, error: null });
        try {
          const { applicationId } = get();
          const response = await api.post('/onboarding/personal-info', {
            applicationId,
            ...info,
          });
          if (response.data.success) {
            set({
              personalInfo: info,
              currentStep: 'document',
              isLoading: false,
            });
            return { success: true };
          }
          throw new Error(response.data.error || 'Failed to save personal info');
        } catch (error: any) {
          const message = error.response?.data?.error || error.message || 'Failed to save';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // Step 3: Document capture
      getDocumentUploadUrl: async (side) => {
        set({ isLoading: true, error: null });
        try {
          const { applicationId, documentInfo } = get();
          const docType = documentInfo?.type || 'NIDA_CARD';
          const response = await api.post('/onboarding/documents/upload-url', {
            applicationId,
            documentType: docType,
            side,
          });
          if (response.data.success) {
            set({ isLoading: false });
            return {
              success: true,
              uploadUrl: response.data.uploadUrl,
              key: response.data.key,
            };
          }
          throw new Error(response.data.error || 'Failed to get upload URL');
        } catch (error: any) {
          const message = error.response?.data?.error || error.message || 'Failed to get URL';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      confirmDocumentUpload: async (frontKey, backKey, docType = 'NIDA_CARD') => {
        set({ isLoading: true, error: null });
        try {
          const { applicationId } = get();
          const response = await api.post('/onboarding/documents/confirm', {
            applicationId,
            documentType: docType,
            frontImageKey: frontKey,
            backImageKey: backKey,
          });
          if (response.data.success) {
            set({
              documentInfo: {
                type: docType as any,
                frontImageKey: frontKey,
                backImageKey: backKey,
                extractedData: response.data.extractedData,
              },
              isLoading: false,
            });
            return { success: true };
          }
          throw new Error(response.data.error || 'Failed to confirm upload');
        } catch (error: any) {
          const message = error.response?.data?.error || error.message || 'Failed to confirm';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      verifyNida: async (nidaNumber) => {
        set({ isLoading: true, error: null });
        try {
          const { applicationId, personalInfo, documentInfo } = get();
          const response = await api.post('/onboarding/verify-nida', {
            applicationId,
            nidaNumber,
            firstName: personalInfo?.firstName,
            lastName: personalInfo?.lastName,
            dateOfBirth: personalInfo?.dateOfBirth,
          });
          if (response.data.success) {
            set({
              documentInfo: {
                ...documentInfo,
                type: 'NIDA_CARD',
                nidaNumber,
                nidaVerified: response.data.verified,
              },
              currentStep: 'selfie',
              isLoading: false,
            });
            return { success: true, verified: response.data.verified };
          }
          throw new Error(response.data.error || 'NIDA verification failed');
        } catch (error: any) {
          const message = error.response?.data?.error || error.message || 'Verification failed';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // Step 4: Selfie
      startLivenessSession: async () => {
        set({ isLoading: true, error: null });
        try {
          const { applicationId } = get();
          const response = await api.post('/onboarding/selfie/liveness-session', {
            applicationId,
          });
          if (response.data.success) {
            set({ isLoading: false });
            return { success: true, sessionId: response.data.sessionId };
          }
          throw new Error(response.data.error || 'Failed to start liveness session');
        } catch (error: any) {
          const message = error.response?.data?.error || error.message || 'Failed';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      confirmSelfie: async (sessionId, imageKey) => {
        set({ isLoading: true, error: null });
        try {
          const { applicationId } = get();
          const response = await api.post('/onboarding/selfie/confirm', {
            applicationId,
            livenessSessionId: sessionId,
            selfieImageKey: imageKey,
          });
          if (response.data.success) {
            set({
              selfieInfo: {
                imageKey,
                livenessSessionId: sessionId,
                livenessConfidence: response.data.livenessConfidence,
                faceMatchConfidence: response.data.faceMatchConfidence,
              },
              currentStep: 'address',
              isLoading: false,
            });
            return { success: true };
          }
          throw new Error(response.data.error || 'Selfie verification failed');
        } catch (error: any) {
          const message = error.response?.data?.error || error.message || 'Verification failed';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // Step 5: Address
      saveAddressInfo: async (info) => {
        set({ isLoading: true, error: null });
        try {
          const { applicationId } = get();
          const response = await api.post('/onboarding/address', {
            applicationId,
            ...info,
          });
          if (response.data.success) {
            set({
              addressInfo: info,
              currentStep: 'employment',
              isLoading: false,
            });
            return { success: true };
          }
          throw new Error(response.data.error || 'Failed to save address');
        } catch (error: any) {
          const message = error.response?.data?.error || error.message || 'Failed to save';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // Step 6: Employment
      saveEmploymentInfo: async (info) => {
        set({ isLoading: true, error: null });
        try {
          const { applicationId } = get();
          const response = await api.post('/onboarding/employment', {
            applicationId,
            ...info,
          });
          if (response.data.success) {
            set({
              employmentInfo: info,
              currentStep: 'product',
              isLoading: false,
            });
            return { success: true };
          }
          throw new Error(response.data.error || 'Failed to save employment info');
        } catch (error: any) {
          const message = error.response?.data?.error || error.message || 'Failed to save';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // Step 7: Next of kin
      saveNextOfKin: async (info) => {
        set({ isLoading: true, error: null });
        try {
          const { applicationId } = get();
          const response = await api.post('/onboarding/next-of-kin', {
            applicationId,
            ...info,
          });
          if (response.data.success) {
            set({
              nextOfKinInfo: info,
              isLoading: false,
            });
            return { success: true };
          }
          throw new Error(response.data.error || 'Failed to save next of kin');
        } catch (error: any) {
          const message = error.response?.data?.error || error.message || 'Failed to save';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // Step 8: Product selection
      fetchProducts: async () => {
        set({ isLoading: true, error: null });
        try {
          const { applicationId } = get();
          const response = await api.get(`/onboarding/products?applicationId=${applicationId}`);
          if (response.data.success) {
            set({
              availableProducts: response.data.products,
              isLoading: false,
            });
            return { success: true };
          }
          throw new Error(response.data.error || 'Failed to fetch products');
        } catch (error: any) {
          const message = error.response?.data?.error || error.message || 'Failed to fetch';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      selectProduct: async (product) => {
        set({ isLoading: true, error: null });
        try {
          const { applicationId } = get();
          const response = await api.post('/onboarding/select-product', {
            applicationId,
            productId: product.productId,
          });
          if (response.data.success) {
            set({
              selectedProduct: product,
              currentStep: 'terms',
              isLoading: false,
            });
            return { success: true };
          }
          throw new Error(response.data.error || 'Failed to select product');
        } catch (error: any) {
          const message = error.response?.data?.error || error.message || 'Failed to select';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // Step 9: Terms
      acceptTerms: async () => {
        set({ isLoading: true, error: null });
        try {
          const { applicationId } = get();
          const response = await api.post('/onboarding/accept-terms', {
            applicationId,
          });
          if (response.data.success) {
            set({
              termsAccepted: true,
              currentStep: 'review',
              isLoading: false,
            });
            return { success: true };
          }
          throw new Error(response.data.error || 'Failed to accept terms');
        } catch (error: any) {
          const message = error.response?.data?.error || error.message || 'Failed';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // Step 10: Submit
      submitApplication: async () => {
        set({ isLoading: true, error: null });
        try {
          const { applicationId } = get();
          const response = await api.post('/onboarding/submit', { applicationId });
          if (response.data.success) {
            set({
              riskLevel: response.data.riskLevel,
              mifosClientId: response.data.mifosClientId,
              mifosAccountId: response.data.mifosAccountId,
              currentStep: response.data.status === 'APPROVED' ? 'complete' : 'pending',
              isLoading: false,
            });
            return { success: true };
          }
          throw new Error(response.data.error || 'Failed to submit');
        } catch (error: any) {
          const message = error.response?.data?.error || error.message || 'Submission failed';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // Resume & Status
      resumeApplication: async (phone, otp) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/onboarding/resume', { phone, otp });
          if (response.data.success) {
            const app = response.data.application;
            set({
              applicationId: app._id,
              phone: app.phone,
              phoneVerified: true,
              personalInfo: app.personalInfo,
              documentInfo: app.identification,
              selfieInfo: app.selfie,
              addressInfo: app.address,
              employmentInfo: app.employment,
              nextOfKinInfo: app.nextOfKin,
              selectedProduct: app.selectedProduct,
              termsAccepted: !!app.termsAcceptance?.accepted,
              currentStep: response.data.nextStep,
              isLoading: false,
            });
            return { success: true };
          }
          throw new Error(response.data.error || 'Failed to resume');
        } catch (error: any) {
          const message = error.response?.data?.error || error.message || 'Resume failed';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      checkStatus: async () => {
        set({ isLoading: true, error: null });
        try {
          const { applicationId } = get();
          const response = await api.get(`/onboarding/status/${applicationId}`);
          if (response.data.success) {
            set({ isLoading: false });
            if (response.data.status === 'APPROVED') {
              set({
                mifosClientId: response.data.mifosClientId,
                mifosAccountId: response.data.mifosAccountId,
                currentStep: 'complete',
              });
            } else if (response.data.status === 'REJECTED') {
              set({ error: response.data.rejectionReason || 'Application rejected' });
            }
            return { success: true, status: response.data.status };
          }
          throw new Error(response.data.error || 'Failed to check status');
        } catch (error: any) {
          const message = error.response?.data?.error || error.message || 'Status check failed';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // Navigation
      goToStep: (step) => set({ currentStep: step }),

      goToNextStep: () => {
        const { currentStep } = get();
        const currentIndex = STEP_ORDER.indexOf(currentStep);
        if (currentIndex < STEP_ORDER.length - 1) {
          set({ currentStep: STEP_ORDER[currentIndex + 1] });
        }
      },

      goToPreviousStep: () => {
        const { currentStep } = get();
        const currentIndex = STEP_ORDER.indexOf(currentStep);
        if (currentIndex > 0) {
          set({ currentStep: STEP_ORDER[currentIndex - 1] });
        }
      },

      // Reset
      resetOnboarding: () => set(initialState),
    }),
    {
      name: 'onboarding-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        applicationId: state.applicationId,
        currentStep: state.currentStep,
        phone: state.phone,
        phoneVerified: state.phoneVerified,
        personalInfo: state.personalInfo,
        documentInfo: state.documentInfo,
        selfieInfo: state.selfieInfo,
        addressInfo: state.addressInfo,
        employmentInfo: state.employmentInfo,
        nextOfKinInfo: state.nextOfKinInfo,
        selectedProduct: state.selectedProduct,
        termsAccepted: state.termsAccepted,
      }),
    }
  )
);

export default useOnboardingStore;
