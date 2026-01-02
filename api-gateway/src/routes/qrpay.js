const express = require('express');
const { getOrchestrator } = require('../../../payment-service/src/PaymentOrchestrator');
const logger = require('../utils/logger');

/**
 * QR Pay Routes
 * Handles TanQR / EMVCo QR code payments via TIPS
 */
module.exports = function qrPayRoutes(accountService, auditModel) {
  const router = express.Router();

  /**
   * Validate QR merchant
   * POST /api/v1/qr-pay/validate
   */
  router.post('/validate', async (req, res, next) => {
    try {
      const { merchantId, merchantName, qrData } = req.body;
      const tenantConfig = req.tenantConfig;

      if (!merchantId && !qrData) {
        return res.status(400).json({
          success: false,
          message: 'Merchant ID or QR data is required',
        });
      }

      const orchestrator = getOrchestrator(tenantConfig);
      const result = await orchestrator.validateQRMerchant({
        merchantId,
        merchantName,
        qrData,
      });

      // Audit log
      await auditModel.create({
        tenantId: tenantConfig.id,
        userId: req.user.id,
        action: 'QR_MERCHANT_VALIDATE',
        resourceType: 'MERCHANT',
        resourceId: merchantId,
        details: {
          merchantName: result.merchantName,
          valid: result.valid,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('QR merchant validation failed', {
        error: error.message,
        merchantId: req.body.merchantId,
      });
      next(error);
    }
  });

  /**
   * Lookup merchant by ID
   * GET /api/v1/qr-pay/lookup/:merchantId
   */
  router.get('/lookup/:merchantId', async (req, res, next) => {
    try {
      const { merchantId } = req.params;
      const tenantConfig = req.tenantConfig;

      const orchestrator = getOrchestrator(tenantConfig);
      const result = await orchestrator.lookupQRMerchant(merchantId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('QR merchant lookup failed', {
        error: error.message,
        merchantId: req.params.merchantId,
      });
      next(error);
    }
  });

  /**
   * Process QR payment
   * POST /api/v1/qr-pay/pay
   */
  router.post('/pay', async (req, res, next) => {
    try {
      const {
        fromAccountId,
        merchantId,
        merchantName,
        merchantAccount,
        merchantBank,
        amount,
        reference,
        qrData,
        currency = 'TZS',
      } = req.body;

      const tenantConfig = req.tenantConfig;
      const user = req.user;

      // Validate required fields
      if (!fromAccountId || !merchantId || !merchantAccount || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: fromAccountId, merchantId, merchantAccount, amount',
        });
      }

      // Validate amount
      if (amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be greater than 0',
        });
      }

      // Get source account details
      const sourceAccount = await accountService.getAccountById(fromAccountId, user.clientId);
      if (!sourceAccount) {
        return res.status(404).json({
          success: false,
          message: 'Source account not found',
        });
      }

      // Check balance
      if (sourceAccount.availableBalance < amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance',
        });
      }

      // Get bank code from bank name or lookup
      const orchestrator = getOrchestrator(tenantConfig);
      
      // If merchantBank is a name, we need to resolve to bank code
      let bankCode = merchantBank;
      if (merchantBank && !merchantBank.match(/^[A-Z0-9]{3,11}$/)) {
        // Try to find bank code from banks list
        const banks = await orchestrator.adapters.tips?.getBanks();
        const bank = banks?.find(b => 
          b.name.toLowerCase().includes(merchantBank.toLowerCase())
        );
        if (bank) {
          bankCode = bank.code;
        }
      }

      // Process payment
      const result = await orchestrator.payQRMerchant({
        sourceAccount: sourceAccount.accountNo,
        merchantId,
        merchantName,
        merchantAccount,
        merchantBankCode: bankCode,
        amount,
        reference,
        qrData,
        currency,
        senderName: `${user.firstName} ${user.lastName}`,
        senderPhone: user.phone,
      });

      // Audit log
      await auditModel.create({
        tenantId: tenantConfig.id,
        userId: user.id,
        action: 'QR_PAYMENT',
        resourceType: 'TRANSACTION',
        resourceId: result.reference,
        details: {
          merchantId,
          merchantName,
          amount,
          currency,
          status: result.status,
          sourceAccount: sourceAccount.accountNo,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      logger.info('QR payment processed', {
        tenantId: tenantConfig.id,
        userId: user.id,
        reference: result.reference,
        merchantId,
        amount,
        status: result.status,
      });

      res.json({
        success: true,
        data: {
          reference: result.reference,
          tipsReference: result.tipsReference,
          status: result.status,
          amount,
          currency,
          merchantName,
          merchantId,
          timestamp: result.timestamp,
          message: result.message || 'Payment processed successfully',
        },
      });
    } catch (error) {
      logger.error('QR payment failed', {
        error: error.message,
        stack: error.stack,
        merchantId: req.body.merchantId,
        amount: req.body.amount,
      });
      next(error);
    }
  });

  /**
   * Get QR payment history
   * GET /api/v1/qr-pay/history
   */
  router.get('/history', async (req, res, next) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const user = req.user;
      const tenantConfig = req.tenantConfig;

      // Get QR payment transactions from audit log
      const transactions = await auditModel.find({
        tenantId: tenantConfig.id,
        userId: user.id,
        action: 'QR_PAYMENT',
      })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();

      const total = await auditModel.countDocuments({
        tenantId: tenantConfig.id,
        userId: user.id,
        action: 'QR_PAYMENT',
      });

      res.json({
        success: true,
        data: {
          transactions: transactions.map(t => ({
            reference: t.resourceId,
            merchantId: t.details.merchantId,
            merchantName: t.details.merchantName,
            amount: t.details.amount,
            currency: t.details.currency,
            status: t.details.status,
            timestamp: t.createdAt,
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error('Failed to get QR payment history', { error: error.message });
      next(error);
    }
  });

  /**
   * Get favorite merchants
   * GET /api/v1/qr-pay/favorites
   */
  router.get('/favorites', async (req, res, next) => {
    try {
      const user = req.user;
      const tenantConfig = req.tenantConfig;

      // Get frequently used merchants from transaction history
      const frequentMerchants = await auditModel.aggregate([
        {
          $match: {
            tenantId: tenantConfig.id,
            userId: user.id,
            action: 'QR_PAYMENT',
          },
        },
        {
          $group: {
            _id: '$details.merchantId',
            merchantName: { $first: '$details.merchantName' },
            count: { $sum: 1 },
            lastUsed: { $max: '$createdAt' },
          },
        },
        {
          $sort: { count: -1, lastUsed: -1 },
        },
        {
          $limit: 10,
        },
      ]);

      res.json({
        success: true,
        data: frequentMerchants.map(m => ({
          merchantId: m._id,
          merchantName: m.merchantName,
          transactionCount: m.count,
          lastUsed: m.lastUsed,
        })),
      });
    } catch (error) {
      logger.error('Failed to get favorite merchants', { error: error.message });
      next(error);
    }
  });

  /**
   * Add merchant to favorites
   * POST /api/v1/qr-pay/favorites
   */
  router.post('/favorites', async (req, res, next) => {
    try {
      const { merchantId, merchantName, merchantAccount, merchantBank } = req.body;
      const user = req.user;
      const tenantConfig = req.tenantConfig;

      // Store favorite merchant (could use a dedicated collection)
      await auditModel.create({
        tenantId: tenantConfig.id,
        userId: user.id,
        action: 'QR_MERCHANT_FAVORITE',
        resourceType: 'MERCHANT',
        resourceId: merchantId,
        details: {
          merchantName,
          merchantAccount,
          merchantBank,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        message: 'Merchant added to favorites',
      });
    } catch (error) {
      logger.error('Failed to add favorite merchant', { error: error.message });
      next(error);
    }
  });

  return router;
};
