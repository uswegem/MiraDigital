const express = require('express');
const router = express.Router();
const { authenticate, transactionLimiter, asyncHandler } = require('../middleware');

/**
 * Loan Routes
 * @param {LoanService} loanService
 */
module.exports = (loanService) => {
  
  // All routes require authentication
  router.use(authenticate);

  /**
   * @route GET /loans
   * @desc Get all loans for the logged-in customer
   * @access Private
   */
  router.get('/', asyncHandler(async (req, res) => {
    const loans = await loanService.getLoans(req.user.clientId);
    
    res.json({
      success: true,
      data: { loans },
    });
  }));

  /**
   * @route GET /loans/products
   * @desc Get available loan products
   * @access Private
   */
  router.get('/products', asyncHandler(async (req, res) => {
    const products = await loanService.getLoanProducts();
    
    res.json({
      success: true,
      data: { products },
    });
  }));

  /**
   * @route GET /loans/products/:productId/template
   * @desc Get loan application template for a product
   * @access Private
   */
  router.get('/products/:productId/template', asyncHandler(async (req, res) => {
    const { productId } = req.params;
    
    const template = await loanService.getLoanApplicationTemplate(req.user.clientId, productId);
    
    res.json({
      success: true,
      data: template,
    });
  }));

  /**
   * @route GET /loans/:loanId
   * @desc Get loan details
   * @access Private
   */
  router.get('/:loanId', asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    
    const loan = await loanService.getLoanDetails(loanId);
    
    res.json({
      success: true,
      data: loan,
    });
  }));

  /**
   * @route GET /loans/:loanId/balance
   * @desc Get loan balance
   * @access Private
   */
  router.get('/:loanId/balance', asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    
    const balance = await loanService.getLoanBalance(loanId);
    
    res.json({
      success: true,
      data: balance,
    });
  }));

  /**
   * @route GET /loans/:loanId/schedule
   * @desc Get loan repayment schedule
   * @access Private
   */
  router.get('/:loanId/schedule', asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    
    const schedule = await loanService.getRepaymentSchedule(loanId);
    
    res.json({
      success: true,
      data: { schedule },
    });
  }));

  /**
   * @route GET /loans/:loanId/next-payment
   * @desc Get next payment info
   * @access Private
   */
  router.get('/:loanId/next-payment', asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    
    const payment = await loanService.getNextPayment(loanId);
    
    res.json({
      success: true,
      data: payment,
    });
  }));

  /**
   * @route POST /loans/:loanId/repay
   * @desc Make loan repayment
   * @access Private
   */
  router.post('/:loanId/repay', transactionLimiter, asyncHandler(async (req, res) => {
    const { loanId } = req.params;
    const { amount, paymentTypeId, note } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Amount is required' },
      });
    }

    const result = await loanService.repayLoan(
      req.user.id,
      loanId,
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
   * @route POST /loans/apply
   * @desc Apply for a new loan
   * @access Private
   */
  router.post('/apply', asyncHandler(async (req, res) => {
    const loanApplication = req.body;

    const result = await loanService.applyForLoan(
      req.user.id,
      req.user.clientId,
      loanApplication
    );
    
    res.status(201).json({
      success: true,
      data: result,
    });
  }));

  return router;
};
