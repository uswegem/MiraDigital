const logger = require('../utils/logger');

/**
 * Loan Service
 * Handles loan operations
 */
class LoanService {
  constructor(mifosClient, auditModel) {
    this.mifos = mifosClient;
    this.Audit = auditModel;
  }

  /**
   * Get all loans for a customer
   */
  async getLoans(clientId) {
    const loans = await this.mifos.getClientLoans(clientId);
    
    return loans.map(loan => ({
      id: loan.id,
      accountNo: loan.accountNo,
      productName: loan.productName,
      principalDisbursed: loan.principalDisbursed,
      principalOutstanding: loan.principalOutstanding,
      totalOutstanding: loan.totalOutstanding,
      currency: loan.currency?.code || 'TZS',
      status: loan.status?.value,
      inArrears: loan.inArrears,
    }));
  }

  /**
   * Get loan details
   */
  async getLoanDetails(loanId) {
    const loan = await this.mifos.getLoanAccount(loanId);
    
    return {
      id: loan.id,
      accountNo: loan.accountNo,
      productName: loan.loanProductName,
      status: loan.status?.value,
      principal: loan.principal,
      interestRate: loan.interestRatePerPeriod,
      numberOfRepayments: loan.numberOfRepayments,
      disbursementDate: loan.timeline?.actualDisbursementDate,
      maturityDate: loan.timeline?.expectedMaturityDate,
      summary: {
        principalDisbursed: loan.summary?.principalDisbursed,
        principalPaid: loan.summary?.principalPaid,
        principalOutstanding: loan.summary?.principalOutstanding,
        interestCharged: loan.summary?.interestCharged,
        interestPaid: loan.summary?.interestPaid,
        interestOutstanding: loan.summary?.interestOutstanding,
        feeCharges: loan.summary?.feeChargesCharged,
        penaltyCharges: loan.summary?.penaltyChargesCharged,
        totalOutstanding: loan.summary?.totalOutstanding,
        totalRepayment: loan.summary?.totalExpectedRepayment,
        totalPaid: loan.summary?.totalRepayment,
        inArrears: loan.summary?.isInArrears,
        arrearsAmount: loan.summary?.totalOverdue,
      },
      currency: loan.currency?.code || 'TZS',
    };
  }

  /**
   * Get loan balance
   */
  async getLoanBalance(loanId) {
    return this.mifos.getLoanBalance(loanId);
  }

  /**
   * Get loan repayment schedule
   */
  async getRepaymentSchedule(loanId) {
    const loan = await this.mifos.getLoanAccount(loanId);
    const schedule = loan.repaymentSchedule?.periods || [];
    
    return schedule
      .filter(period => period.period) // Skip totals row
      .map(period => ({
        period: period.period,
        dueDate: period.dueDate ? this._formatDate(period.dueDate) : null,
        principalDue: period.principalDue,
        interestDue: period.interestOriginalDue,
        feesDue: period.feeChargesDue,
        penaltiesDue: period.penaltyChargesDue,
        totalDue: period.totalDueForPeriod,
        totalPaid: period.totalPaidForPeriod,
        totalOutstanding: period.totalOutstandingForPeriod,
        complete: period.complete,
      }));
  }

  /**
   * Get next payment info
   */
  async getNextPayment(loanId) {
    const balance = await this.mifos.getLoanBalance(loanId);
    
    return {
      loanAccountNo: balance.accountNo,
      totalOutstanding: balance.totalOutstanding,
      nextPaymentDate: balance.nextPaymentDate,
      nextPaymentAmount: balance.nextPaymentAmount,
      currency: balance.currency,
    };
  }

  /**
   * Make loan repayment
   */
  async repayLoan(userId, loanId, amount, paymentTypeId = 1, note = '') {
    if (!amount || amount <= 0) {
      throw { statusCode: 400, code: 'INVALID_AMOUNT', message: 'Invalid repayment amount' };
    }

    const result = await this.mifos.repayLoan(loanId, amount, paymentTypeId, note);

    await this._logAudit(userId, 'LOAN_REPAYMENT', {
      loanId,
      amount,
      result,
    });

    logger.info('Loan repayment completed', { userId, loanId, amount });

    return {
      success: true,
      transactionId: result.resourceId,
      message: `TZS ${amount.toLocaleString()} repayment successful`,
    };
  }

  /**
   * Get available loan products
   */
  async getLoanProducts() {
    const products = await this.mifos.getLoanProducts();
    
    return products.map(product => ({
      id: product.id,
      name: product.name,
      shortName: product.shortName,
      description: product.description,
      minPrincipal: product.minPrincipal,
      maxPrincipal: product.maxPrincipal,
      interestRate: product.interestRatePerPeriod,
      interestType: product.interestRateFrequencyType?.value,
      minTerm: product.minNumberOfRepayments,
      maxTerm: product.maxNumberOfRepayments,
      repaymentFrequency: product.repaymentFrequencyType?.value,
      currency: product.currency?.code || 'TZS',
    }));
  }

  /**
   * Get loan application template
   */
  async getLoanApplicationTemplate(clientId, productId) {
    const template = await this.mifos.getLoanProductTemplate(clientId, productId);
    
    return {
      product: {
        id: template.loanProductId,
        name: template.loanProductName,
      },
      principal: {
        min: template.minPrincipal,
        max: template.maxPrincipal,
        default: template.principal,
      },
      interestRate: template.interestRatePerPeriod,
      term: {
        min: template.minNumberOfRepayments,
        max: template.maxNumberOfRepayments,
        default: template.numberOfRepayments,
      },
      repaymentEvery: template.repaymentEvery,
      repaymentFrequency: template.repaymentFrequencyType?.value,
      charges: template.charges || [],
    };
  }

  /**
   * Apply for a loan
   */
  async applyForLoan(userId, clientId, loanApplication) {
    const {
      productId,
      principal,
      loanTermFrequency,
      loanTermFrequencyType = 2, // Months
      numberOfRepayments,
      repaymentEvery = 1,
      repaymentFrequencyType = 2, // Monthly
      interestRatePerPeriod,
      expectedDisbursementDate,
      submittedOnDate,
      loanPurpose,
    } = loanApplication;

    // Validate required fields
    if (!productId || !principal || !numberOfRepayments) {
      throw { 
        statusCode: 400, 
        code: 'MISSING_REQUIRED_FIELDS', 
        message: 'Product, principal amount, and term are required' 
      };
    }

    const loanData = {
      clientId,
      productId,
      principal,
      loanTermFrequency: loanTermFrequency || numberOfRepayments,
      loanTermFrequencyType,
      numberOfRepayments,
      repaymentEvery,
      repaymentFrequencyType,
      interestRatePerPeriod,
      amortizationType: 1, // Equal installments
      interestType: 0, // Declining balance
      interestCalculationPeriodType: 1, // Same as repayment period
      transactionProcessingStrategyCode: 'mifos-standard-strategy',
      expectedDisbursementDate: expectedDisbursementDate || this._formatDateForApi(new Date()),
      submittedOnDate: submittedOnDate || this._formatDateForApi(new Date()),
      loanPurpose,
    };

    const result = await this.mifos.applyForLoan(loanData);

    await this._logAudit(userId, 'LOAN_APPLICATION', {
      clientId,
      productId,
      principal,
      result,
    });

    logger.info('Loan application submitted', { userId, clientId, productId, principal });

    return {
      success: true,
      loanId: result.loanId,
      message: 'Loan application submitted successfully. You will be notified once reviewed.',
    };
  }

  // =====================
  // HELPER METHODS
  // =====================

  _formatDate(dateArray) {
    if (Array.isArray(dateArray)) {
      return `${dateArray[0]}-${String(dateArray[1]).padStart(2, '0')}-${String(dateArray[2]).padStart(2, '0')}`;
    }
    return dateArray;
  }

  _formatDateForApi(date) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const d = new Date(date);
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
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

module.exports = LoanService;
