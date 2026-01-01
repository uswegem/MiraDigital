const logger = require('../utils/logger');

/**
 * Account Service
 * Handles savings account operations
 */
class AccountService {
  constructor(mifosClient, auditModel) {
    this.mifos = mifosClient;
    this.Audit = auditModel;
  }

  /**
   * Get all accounts for a customer
   */
  async getAccounts(clientId) {
    const accounts = await this.mifos.getClientAccounts(clientId);
    
    // Format accounts for response
    const savings = (accounts.savingsAccounts || []).map(acc => ({
      id: acc.id,
      accountNo: acc.accountNo,
      productName: acc.productName,
      balance: acc.accountBalance,
      currency: acc.currency?.code || 'TZS',
      status: acc.status?.value,
      type: 'savings',
    }));

    const loans = (accounts.loanAccounts || []).map(acc => ({
      id: acc.id,
      accountNo: acc.accountNo,
      productName: acc.productName,
      principalDisbursed: acc.principalDisbursed,
      principalOutstanding: acc.principalOutstanding,
      currency: acc.currency?.code || 'TZS',
      status: acc.status?.value,
      type: 'loan',
    }));

    return { savings, loans };
  }

  /**
   * Get account balance
   */
  async getBalance(accountId, accountType = 'savings') {
    if (accountType === 'savings') {
      return this.mifos.getSavingsBalance(accountId);
    } else if (accountType === 'loan') {
      return this.mifos.getLoanBalance(accountId);
    }
    throw { statusCode: 400, code: 'INVALID_ACCOUNT_TYPE', message: 'Invalid account type' };
  }

  /**
   * Get mini statement (last N transactions)
   */
  async getMiniStatement(accountId, limit = 5) {
    const transactions = await this.mifos.getSavingsTransactions(accountId, limit);
    
    return (transactions.pageItems || transactions || []).map(txn => ({
      id: txn.id,
      date: txn.date ? this._formatTransactionDate(txn.date) : null,
      type: txn.transactionType?.value,
      amount: txn.amount,
      runningBalance: txn.runningBalance,
      description: txn.paymentDetailData?.paymentType?.name || txn.transactionType?.value,
    }));
  }

  /**
   * Get full statement
   */
  async getFullStatement(accountId, startDate, endDate) {
    const account = await this.mifos.getSavingsAccount(accountId);
    
    let transactions = account.transactions || [];
    
    // Filter by date range if provided
    if (startDate || endDate) {
      transactions = transactions.filter(txn => {
        const txnDate = new Date(txn.date[0], txn.date[1] - 1, txn.date[2]);
        if (startDate && txnDate < new Date(startDate)) return false;
        if (endDate && txnDate > new Date(endDate)) return false;
        return true;
      });
    }

    return {
      account: {
        accountNo: account.accountNo,
        productName: account.savingsProductName,
        balance: account.summary?.availableBalance || 0,
        currency: account.currency?.code || 'TZS',
      },
      transactions: transactions.map(txn => ({
        id: txn.id,
        date: txn.date ? this._formatTransactionDate(txn.date) : null,
        type: txn.transactionType?.value,
        amount: txn.amount,
        runningBalance: txn.runningBalance,
        description: txn.paymentDetailData?.paymentType?.name || txn.transactionType?.value,
      })),
    };
  }

  /**
   * Transfer funds between accounts
   */
  async transfer(userId, clientId, { fromAccountId, toAccountId, amount, pin, otp }) {
    // Validate amount
    if (!amount || amount <= 0) {
      throw { statusCode: 400, code: 'INVALID_AMOUNT', message: 'Invalid transfer amount' };
    }

    // Check balance
    const balance = await this.mifos.getSavingsBalance(fromAccountId);
    if (balance.balance < amount) {
      throw { statusCode: 400, code: 'INSUFFICIENT_BALANCE', message: 'Insufficient balance' };
    }

    // Perform transfer
    const result = await this.mifos.transferFunds(fromAccountId, toAccountId, amount);

    // Log audit
    await this._logAudit(userId, 'TRANSFER', {
      fromAccountId,
      toAccountId,
      amount,
      result,
    });

    logger.info('Transfer completed', { userId, fromAccountId, toAccountId, amount });

    return {
      success: true,
      transactionId: result.resourceId,
      message: `TZS ${amount.toLocaleString()} transferred successfully`,
    };
  }

  /**
   * Deposit to account (for USSD/Agent banking)
   */
  async deposit(userId, accountId, amount, paymentTypeId = 1, note = '') {
    if (!amount || amount <= 0) {
      throw { statusCode: 400, code: 'INVALID_AMOUNT', message: 'Invalid deposit amount' };
    }

    const result = await this.mifos.depositToSavings(accountId, amount, paymentTypeId, note);

    await this._logAudit(userId, 'DEPOSIT', {
      accountId,
      amount,
      result,
    });

    logger.info('Deposit completed', { userId, accountId, amount });

    return {
      success: true,
      transactionId: result.resourceId,
      message: `TZS ${amount.toLocaleString()} deposited successfully`,
    };
  }

  /**
   * Withdraw from account (for USSD/Agent banking)
   */
  async withdraw(userId, accountId, amount, paymentTypeId = 1, note = '') {
    if (!amount || amount <= 0) {
      throw { statusCode: 400, code: 'INVALID_AMOUNT', message: 'Invalid withdrawal amount' };
    }

    // Check balance
    const balance = await this.mifos.getSavingsBalance(accountId);
    if (balance.balance < amount) {
      throw { statusCode: 400, code: 'INSUFFICIENT_BALANCE', message: 'Insufficient balance' };
    }

    const result = await this.mifos.withdrawFromSavings(accountId, amount, paymentTypeId, note);

    await this._logAudit(userId, 'WITHDRAWAL', {
      accountId,
      amount,
      result,
    });

    logger.info('Withdrawal completed', { userId, accountId, amount });

    return {
      success: true,
      transactionId: result.resourceId,
      message: `TZS ${amount.toLocaleString()} withdrawn successfully`,
    };
  }

  // =====================
  // HELPER METHODS
  // =====================

  _formatTransactionDate(dateArray) {
    if (Array.isArray(dateArray)) {
      return `${dateArray[0]}-${String(dateArray[1]).padStart(2, '0')}-${String(dateArray[2]).padStart(2, '0')}`;
    }
    return dateArray;
  }

  async _logAudit(userId, action, data) {
    if (this.Audit) {
      try {
        await this.Audit.create({
          userId,
          action,
          data,
          timestamp: new Date(),
        });
      } catch (error) {
        logger.error('Failed to log audit', { error: error.message });
      }
    }
  }
}

module.exports = AccountService;
