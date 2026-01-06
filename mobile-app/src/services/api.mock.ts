import { API } from './api';

// Mock data for offline testing
const MOCK_ACCOUNTS = [
  {
    id: '1', 
    productName: 'Savings Account', 
    accountNo: '123456789', 
    availableBalance: 1500000, 
    balance: 1550000, 
    currency: 'TZS', 
    status: 'Active'
  },
  {
    id: '2', 
    productName: 'Current Account', 
    accountNo: '987654321', 
    availableBalance: 500000, 
    balance: 500000, 
    currency: 'TZS', 
    status: 'Active'
  },
];

const MOCK_BILLERS = [
  // ... (add mock biller data if needed)
];

// Mock API service
const mockApiService: Partial<API> = {
  login: async (pin: string) => {
    if (pin === '1234') {
      return Promise.resolve({
        token: 'mock-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: '1', 
          firstName: 'John', 
          lastName: 'Doe',
        }
      });
    } else {
      return Promise.reject({ message: 'Invalid PIN' });
    }
  },
  getAccounts: async () => {
    return Promise.resolve(MOCK_ACCOUNTS);
  },
  validateBiller: async (billerCode: string, accountNumber: string) => {
    if (accountNumber.length > 5) {
      return Promise.resolve({
        valid: true,
        customerName: 'Jane Doe',
        balance: 50000
      });
    } else {
      return Promise.resolve({ valid: false, message: 'Invalid account number' });
    }
  },
  payBill: async (data: any) => {
    return Promise.resolve({
      transactionId: `TXN${Date.now()}`,
      receiptNumber: `RCPT${Date.now()}`,
    });
  },
  // ... (add other mock API methods as needed)
};

export default mockApiService;
