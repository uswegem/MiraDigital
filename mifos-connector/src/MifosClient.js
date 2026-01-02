const axios = require('axios');
const https = require('https');

/**
 * MIFOS/Fineract API Client
 * Handles all communication with the core banking system
 */
class MifosClient {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.tenantId = config.tenantId;
    this.username = config.username;
    this.password = config.password;
    
    // Create axios instance with defaults
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Fineract-Platform-TenantId': this.tenantId,
      },
      // Allow self-signed certificates in development
      httpsAgent: new https.Agent({
        rejectUnauthorized: config.sslVerify !== false,
      }),
    });

    // Add auth header
    const authToken = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    this.client.defaults.headers.common['Authorization'] = `Basic ${authToken}`;

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[MIFOS] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('[MIFOS] Error:', error.response?.status, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Authenticate and get session token
   */
  async authenticate(username, password) {
    const response = await this.client.post('/authentication', null, {
      params: { username, password },
    });
    return response.data;
  }

  // =====================
  // CLIENT OPERATIONS
  // =====================

  /**
   * Search for clients
   */
  async searchClients(query, options = {}) {
    const response = await this.client.get('/search', {
      params: {
        query,
        resource: 'clients',
        ...options,
      },
    });
    return response.data;
  }

  /**
   * Get client by ID
   */
  async getClient(clientId) {
    const response = await this.client.get(`/clients/${clientId}`);
    return response.data;
  }

  /**
   * Get client by mobile number
   */
  async getClientByMobile(mobileNumber) {
    const response = await this.client.get('/clients', {
      params: {
        displayName: mobileNumber,
        sqlSearch: `mobile_no = '${mobileNumber}'`,
      },
    });
    return response.data;
  }

  /**
   * Get all accounts for a client
   */
  async getClientAccounts(clientId) {
    const response = await this.client.get(`/clients/${clientId}/accounts`);
    return response.data;
  }

  /**
   * Create new client
   */
  async createClient(clientData) {
    const response = await this.client.post('/clients', clientData);
    return response.data;
  }

  /**
   * Update client
   */
  async updateClient(clientId, clientData) {
    const response = await this.client.put(`/clients/${clientId}`, clientData);
    return response.data;
  }

  // =====================
  // SAVINGS OPERATIONS
  // =====================

  /**
   * Create savings account for client
   */
  async createSavingsAccount(clientId, productId = 1) {
    const response = await this.client.post('/savingsaccounts', {
      clientId,
      productId,
      submittedOnDate: this._formatDate(new Date()),
      locale: 'en',
      dateFormat: 'dd MMMM yyyy',
    });
    return response.data;
  }

  /**
   * Approve savings account
   */
  async approveSavingsAccount(accountId) {
    const response = await this.client.post(
      `/savingsaccounts/${accountId}`,
      {
        approvedOnDate: this._formatDate(new Date()),
        locale: 'en',
        dateFormat: 'dd MMMM yyyy',
      },
      {
        params: { command: 'approve' },
      }
    );
    return response.data;
  }

  /**
   * Activate savings account
   */
  async activateSavingsAccount(accountId) {
    const response = await this.client.post(
      `/savingsaccounts/${accountId}`,
      {
        activatedOnDate: this._formatDate(new Date()),
        locale: 'en',
        dateFormat: 'dd MMMM yyyy',
      },
      {
        params: { command: 'activate' },
      }
    );
    return response.data;
  }

  /**
   * Get savings account details
   */
  async getSavingsAccount(accountId) {
    const response = await this.client.get(`/savingsaccounts/${accountId}`, {
      params: {
        associations: 'transactions',
      },
    });
    return response.data;
  }

  /**
   * Get savings account balance
   */
  async getSavingsBalance(accountId) {
    const account = await this.getSavingsAccount(accountId);
    return {
      accountNo: account.accountNo,
      balance: account.summary?.availableBalance || 0,
      currency: account.currency?.code || 'TZS',
      status: account.status?.value,
    };
  }

  /**
   * Get savings transactions (mini statement)
   */
  async getSavingsTransactions(accountId, limit = 10) {
    const response = await this.client.get(`/savingsaccounts/${accountId}/transactions`, {
      params: {
        limit,
        offset: 0,
      },
    });
    return response.data;
  }

  /**
   * Deposit to savings account
   */
  async depositToSavings(accountId, amount, paymentTypeId, note = '') {
    const response = await this.client.post(
      `/savingsaccounts/${accountId}/transactions`,
      {
        transactionDate: this._formatDate(new Date()),
        transactionAmount: amount,
        paymentTypeId,
        note,
        locale: 'en',
        dateFormat: 'dd MMMM yyyy',
      },
      {
        params: { command: 'deposit' },
      }
    );
    return response.data;
  }

  /**
   * Withdraw from savings account
   */
  async withdrawFromSavings(accountId, amount, paymentTypeId, note = '') {
    const response = await this.client.post(
      `/savingsaccounts/${accountId}/transactions`,
      {
        transactionDate: this._formatDate(new Date()),
        transactionAmount: amount,
        paymentTypeId,
        note,
        locale: 'en',
        dateFormat: 'dd MMMM yyyy',
      },
      {
        params: { command: 'withdrawal' },
      }
    );
    return response.data;
  }

  // =====================
  // TRANSFER OPERATIONS
  // =====================

  /**
   * Internal transfer between accounts
   */
  async transferFunds(fromAccountId, toAccountId, amount, fromAccountType = 2, toAccountType = 2) {
    const response = await this.client.post('/accounttransfers', {
      fromOfficeId: 1, // Will be fetched from account
      fromClientId: 1, // Will be fetched from account
      fromAccountType,
      fromAccountId,
      toOfficeId: 1,
      toClientId: 1,
      toAccountType,
      toAccountId,
      transferAmount: amount,
      transferDate: this._formatDate(new Date()),
      transferDescription: 'Mobile Transfer',
      locale: 'en',
      dateFormat: 'dd MMMM yyyy',
    });
    return response.data;
  }

  // =====================
  // LOAN OPERATIONS
  // =====================

  /**
   * Get all loans for a client
   */
  async getClientLoans(clientId) {
    const accounts = await this.getClientAccounts(clientId);
    return accounts.loanAccounts || [];
  }

  /**
   * Get loan account details
   */
  async getLoanAccount(loanId) {
    const response = await this.client.get(`/loans/${loanId}`, {
      params: {
        associations: 'all',
      },
    });
    return response.data;
  }

  /**
   * Get loan repayment schedule
   */
  async getLoanSchedule(loanId) {
    const loan = await this.getLoanAccount(loanId);
    return loan.repaymentSchedule;
  }

  /**
   * Get loan balance and next payment
   */
  async getLoanBalance(loanId) {
    const loan = await this.getLoanAccount(loanId);
    return {
      loanId: loan.id,
      accountNo: loan.accountNo,
      principalDisbursed: loan.principal,
      principalOutstanding: loan.summary?.principalOutstanding || 0,
      interestOutstanding: loan.summary?.interestOutstanding || 0,
      totalOutstanding: loan.summary?.totalOutstanding || 0,
      currency: loan.currency?.code || 'TZS',
      status: loan.status?.value,
      nextPaymentDate: loan.repaymentSchedule?.periods?.find(p => !p.complete)?.dueDate,
      nextPaymentAmount: loan.repaymentSchedule?.periods?.find(p => !p.complete)?.totalDueForPeriod,
    };
  }

  /**
   * Make loan repayment
   */
  async repayLoan(loanId, amount, paymentTypeId, note = '') {
    const response = await this.client.post(
      `/loans/${loanId}/transactions`,
      {
        transactionDate: this._formatDate(new Date()),
        transactionAmount: amount,
        paymentTypeId,
        note,
        locale: 'en',
        dateFormat: 'dd MMMM yyyy',
      },
      {
        params: { command: 'repayment' },
      }
    );
    return response.data;
  }

  /**
   * Apply for a new loan
   */
  async applyForLoan(loanData) {
    const response = await this.client.post('/loans', {
      ...loanData,
      locale: 'en',
      dateFormat: 'dd MMMM yyyy',
    });
    return response.data;
  }

  // =====================
  // PRODUCT OPERATIONS
  // =====================

  /**
   * Get all savings products
   */
  async getSavingsProducts() {
    const response = await this.client.get('/savingsproducts');
    return response.data;
  }

  /**
   * Get all loan products
   */
  async getLoanProducts() {
    const response = await this.client.get('/loanproducts');
    return response.data;
  }

  /**
   * Get loan product template (for loan application)
   */
  async getLoanProductTemplate(clientId, productId) {
    const response = await this.client.get('/loans/template', {
      params: {
        clientId,
        productId,
        templateType: 'individual',
      },
    });
    return response.data;
  }

  // =====================
  // UTILITY OPERATIONS
  // =====================

  /**
   * Get payment types
   */
  async getPaymentTypes() {
    const response = await this.client.get('/paymenttypes');
    return response.data;
  }

  /**
   * Get offices
   */
  async getOffices() {
    const response = await this.client.get('/offices');
    return response.data;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/offices', { timeout: 5000 });
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString() 
      };
    }
  }

  // =====================
  // HELPER METHODS
  // =====================

  /**
   * Format date for MIFOS API
   */
  _formatDate(date) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const d = new Date(date);
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
}

module.exports = MifosClient;
