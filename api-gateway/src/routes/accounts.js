const express = require('express');
const router = express.Router();
const { authenticate, transactionLimiter, asyncHandler } = require('../middleware');

/**
 * Account Routes
 * @param {AccountService} accountService
 */
module.exports = (accountService) => {
  
  // All routes require authentication
  router.use(authenticate);

  /**
   * @route GET /accounts
   * @desc Get all accounts for the logged-in customer
   * @access Private
   */
  router.get('/', asyncHandler(async (req, res) => {
    const accounts = await accountService.getAccounts(req.user.clientId);
    
    res.json({
      success: true,
      data: accounts,
    });
  }));

  /**
   * @route GET /accounts/:accountId/balance
   * @desc Get account balance
   * @access Private
   */
  router.get('/:accountId/balance', asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const { type = 'savings' } = req.query;

    const balance = await accountService.getBalance(accountId, type);
    
    res.json({
      success: true,
      data: balance,
    });
  }));

  /**
   * @route GET /accounts/:accountId/mini-statement
   * @desc Get mini statement (last 5 transactions)
   * @access Private
   */
  router.get('/:accountId/mini-statement', asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const { limit = 5 } = req.query;

    const transactions = await accountService.getMiniStatement(accountId, parseInt(limit));
    
    res.json({
      success: true,
      data: { transactions },
    });
  }));

  /**
   * @route GET /accounts/:accountId/statement
   * @desc Get full statement with date range
   * @access Private
   */
  router.get('/:accountId/statement', asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const { startDate, endDate } = req.query;

    const statement = await accountService.getFullStatement(accountId, startDate, endDate);
    
    res.json({
      success: true,
      data: statement,
    });
  }));

  /**
   * @route POST /accounts/transfer
   * @desc Transfer funds between accounts
   * @access Private
   */
  router.post('/transfer', transactionLimiter, asyncHandler(async (req, res) => {
    const { fromAccountId, toAccountId, amount, pin, otp } = req.body;

    // Validate required fields
    if (!fromAccountId || !toAccountId || !amount) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'From account, to account, and amount are required' },
      });
    }

    const result = await accountService.transfer(
      req.user.id,
      req.user.clientId,
      { fromAccountId, toAccountId, amount: parseFloat(amount), pin, otp }
    );
    
    res.json({
      success: true,
      data: result,
    });
  }));

  /**
   * @route POST /accounts/:accountId/deposit
   * @desc Deposit to account (for agent/internal use)
   * @access Private
   */
  router.post('/:accountId/deposit', transactionLimiter, asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const { amount, paymentTypeId, note } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Amount is required' },
      });
    }

    const result = await accountService.deposit(
      req.user.id,
      accountId,
      parseFloat(amount),
      paymentTypeId,
      note
    );
    
    res.json({
      success: true,
      data: result,
    });
  }));

  /**
   * @route POST /accounts/:accountId/withdraw
   * @desc Withdraw from account (for agent/internal use)
   * @access Private
   */
  router.post('/:accountId/withdraw', transactionLimiter, asyncHandler(async (req, res) => {
    const { accountId } = req.params;
    const { amount, paymentTypeId, note } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Amount is required' },
      });
    }

    const result = await accountService.withdraw(
      req.user.id,
      accountId,
      parseFloat(amount),
      paymentTypeId,
      note
    );
    
    res.json({
      success: true,
      data: result,
    });
  }));

  return router;
};
