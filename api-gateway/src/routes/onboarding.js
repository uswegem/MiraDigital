const express = require('express');
const OnboardingService = require('../../../onboarding-service/src/OnboardingService');
const OnboardingApplication = require('../../../database/models/OnboardingApplication');
const logger = require('../utils/logger');

/**
 * Onboarding Routes
 * Self-service customer registration and account opening
 */
module.exports = function onboardingRoutes(mifosClient, config) {
  const router = express.Router();
  const onboardingService = new OnboardingService(config, mifosClient);

  // ==================
  // INITIATION & OTP
  // ==================

  /**
   * Initiate onboarding - Send OTP
   * POST /api/v1/onboarding/initiate
   */
  router.post('/initiate', async (req, res, next) => {
    try {
      const { phoneNumber, countryCode = '+255' } = req.body;
      const tenantId = req.tenantConfig?.id || req.headers['x-tenant-id'];

      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required',
        });
      }

      // Normalize phone number
      const normalizedPhone = phoneNumber.replace(/\D/g, '').slice(-9);
      const fullPhone = `${countryCode}${normalizedPhone}`;

      // Check for existing application
      let application = await OnboardingApplication.findByPhone(tenantId, fullPhone);

      if (application && application.status === 'APPROVED') {
        return res.status(400).json({
          success: false,
          message: 'An account already exists with this phone number',
        });
      }

      // Create or update application
      if (!application) {
        application = new OnboardingApplication({
          tenantId,
          phone: {
            number: fullPhone,
            countryCode,
          },
          deviceInfo: {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
          },
        });
      }

      // Rate limit OTP sending
      const lastOtpSent = application.phone.lastOtpSentAt;
      if (lastOtpSent && Date.now() - lastOtpSent.getTime() < 60000) {
        return res.status(429).json({
          success: false,
          message: 'Please wait before requesting another OTP',
          retryAfter: Math.ceil((60000 - (Date.now() - lastOtpSent.getTime())) / 1000),
        });
      }

      // Send OTP
      const otpResult = await onboardingService.sendOTP(fullPhone, tenantId);

      // Update application
      application.phone.otpAttempts = (application.phone.otpAttempts || 0) + 1;
      application.phone.lastOtpSentAt = new Date();
      application.sessionToken = onboardingService.generateSessionToken();
      application.sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await application.save();

      res.json({
        success: true,
        data: {
          applicationId: application._id,
          sessionToken: application.sessionToken,
          currentStep: application.currentStep,
          status: application.status,
          ...otpResult,
        },
      });
    } catch (error) {
      logger.error('Onboarding initiation failed', { error: error.message });
      next(error);
    }
  });

  /**
   * Verify OTP
   * POST /api/v1/onboarding/verify-otp
   */
  router.post('/verify-otp', async (req, res, next) => {
    try {
      const { applicationId, otp, sessionToken } = req.body;
      const tenantId = req.tenantConfig?.id || req.headers['x-tenant-id'];

      const application = await OnboardingApplication.findOne({
        _id: applicationId,
        tenantId,
        sessionToken,
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found or session expired',
        });
      }

      const result = onboardingService.verifyOTP(application.phone.number, otp, tenantId);

      if (!result.valid) {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }

      // Update application
      application.phone.verified = true;
      application.phone.verifiedAt = new Date();
      application.status = 'PHONE_VERIFIED';
      application.currentStep = 2;
      await application.save();

      res.json({
        success: true,
        data: {
          verified: true,
          currentStep: 2,
          message: result.message,
        },
      });
    } catch (error) {
      logger.error('OTP verification failed', { error: error.message });
      next(error);
    }
  });

  // ==================
  // PERSONAL INFO
  // ==================

  /**
   * Save personal information
   * POST /api/v1/onboarding/personal-info
   */
  router.post('/personal-info', validateSession, async (req, res, next) => {
    try {
      const application = req.application;
      const {
        firstName,
        middleName,
        lastName,
        dateOfBirth,
        gender,
        maritalStatus,
        email,
        mothersMaidenName,
      } = req.body;

      // Validation
      if (!firstName || !lastName || !dateOfBirth || !gender) {
        return res.status(400).json({
          success: false,
          message: 'First name, last name, date of birth, and gender are required',
        });
      }

      // Age validation (must be 18+)
      const dob = new Date(dateOfBirth);
      const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) {
        return res.status(400).json({
          success: false,
          message: 'You must be at least 18 years old to open an account',
        });
      }

      application.personalInfo = {
        firstName: firstName.trim(),
        middleName: middleName?.trim(),
        lastName: lastName.trim(),
        dateOfBirth: dob,
        gender,
        maritalStatus,
        email: email?.trim().toLowerCase(),
        mothersMaidenName: mothersMaidenName?.trim(),
      };

      application.status = 'PERSONAL_INFO_COMPLETE';
      application.currentStep = 3;
      await application.save();

      res.json({
        success: true,
        data: {
          currentStep: 3,
          personalInfo: application.personalInfo,
        },
      });
    } catch (error) {
      logger.error('Personal info save failed', { error: error.message });
      next(error);
    }
  });

  // ==================
  // DOCUMENT UPLOAD
  // ==================

  /**
   * Get upload URL for document
   * POST /api/v1/onboarding/documents/upload-url
   */
  router.post('/documents/upload-url', validateSession, async (req, res, next) => {
    try {
      const { documentType, contentType } = req.body;
      const application = req.application;

      if (!['ID_FRONT', 'ID_BACK', 'SELFIE'].includes(documentType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid document type',
        });
      }

      const uploadInfo = await onboardingService.getUploadUrl(
        application._id.toString(),
        documentType,
        contentType || 'image/jpeg'
      );

      res.json({
        success: true,
        data: uploadInfo,
      });
    } catch (error) {
      logger.error('Get upload URL failed', { error: error.message });
      next(error);
    }
  });

  /**
   * Confirm document uploaded and save details
   * POST /api/v1/onboarding/documents/confirm
   */
  router.post('/documents/confirm', validateSession, async (req, res, next) => {
    try {
      const {
        documentType,
        key,
        idType,
        idNumber,
        issueDate,
        expiryDate,
      } = req.body;

      const application = req.application;

      if (documentType === 'ID_FRONT') {
        application.identification = {
          ...application.identification,
          type: idType,
          number: idNumber,
          issueDate: issueDate ? new Date(issueDate) : undefined,
          expiryDate: expiryDate ? new Date(expiryDate) : undefined,
          documentFrontKey: key,
        };

        // Trigger OCR extraction
        const ocrResult = await onboardingService.extractDocumentData(key);
        if (ocrResult.success) {
          application.identification.ocrData = ocrResult.data;
        }
      } else if (documentType === 'ID_BACK') {
        application.identification.documentBackKey = key;
      }

      // Check if both sides uploaded
      if (application.identification?.documentFrontKey) {
        application.status = 'DOCUMENTS_UPLOADED';
        application.currentStep = 4;
      }

      await application.save();

      res.json({
        success: true,
        data: {
          currentStep: application.currentStep,
          ocrData: application.identification?.ocrData,
        },
      });
    } catch (error) {
      logger.error('Document confirm failed', { error: error.message });
      next(error);
    }
  });

  /**
   * Verify ID against NIDA
   * POST /api/v1/onboarding/verify-nida
   */
  router.post('/verify-nida', validateSession, async (req, res, next) => {
    try {
      const application = req.application;

      if (application.identification?.type !== 'NIDA') {
        return res.status(400).json({
          success: false,
          message: 'NIDA verification only available for National ID',
        });
      }

      const result = await onboardingService.verifyNIDA(
        application.identification.number,
        application.personalInfo.firstName,
        application.personalInfo.lastName,
        application.personalInfo.dateOfBirth
      );

      application.identification.nidaVerification = {
        verified: result.verified,
        verifiedAt: new Date(),
        matchScore: result.matchScore,
        nidaPhoto: result.photo,
        response: result.details,
      };

      await application.save();

      res.json({
        success: true,
        data: {
          verified: result.verified,
          message: result.verified
            ? 'Identity verified successfully'
            : 'Identity verification failed. Please check your details.',
        },
      });
    } catch (error) {
      logger.error('NIDA verification failed', { error: error.message });
      next(error);
    }
  });

  // ==================
  // SELFIE & LIVENESS
  // ==================

  /**
   * Confirm selfie uploaded and verify
   * POST /api/v1/onboarding/selfie/confirm
   */
  router.post('/selfie/confirm', validateSession, async (req, res, next) => {
    try {
      const { key } = req.body;
      const application = req.application;

      application.selfie = {
        imageKey: key,
      };

      // Perform liveness check
      const livenessResult = await onboardingService.checkLiveness(key);
      application.selfie.liveness = {
        passed: livenessResult.passed,
        score: livenessResult.score,
        provider: 'AWS_REKOGNITION',
        checkedAt: new Date(),
      };

      if (!livenessResult.passed) {
        await application.save();
        return res.status(400).json({
          success: false,
          message: livenessResult.message,
          data: {
            livenessScore: livenessResult.score,
          },
        });
      }

      // Perform face matching
      let faceMatchResult;
      if (application.identification?.nidaVerification?.nidaPhoto) {
        // Match against NIDA photo
        faceMatchResult = await onboardingService.compareFaces(
          key,
          application.identification.nidaVerification.nidaPhoto,
          true // isBase64Reference
        );
      } else if (application.identification?.documentFrontKey) {
        // Match against ID document
        faceMatchResult = await onboardingService.compareFaces(
          key,
          application.identification.documentFrontKey,
          false
        );
      }

      if (faceMatchResult) {
        application.selfie.faceMatch = {
          matched: faceMatchResult.matched,
          score: faceMatchResult.score,
          threshold: 80,
          checkedAt: new Date(),
        };
      }

      application.status = 'SELFIE_VERIFIED';
      application.currentStep = 5;
      await application.save();

      res.json({
        success: true,
        data: {
          currentStep: 5,
          liveness: {
            passed: livenessResult.passed,
            score: livenessResult.score,
          },
          faceMatch: faceMatchResult ? {
            matched: faceMatchResult.matched,
            score: faceMatchResult.score,
          } : null,
        },
      });
    } catch (error) {
      logger.error('Selfie verification failed', { error: error.message });
      next(error);
    }
  });

  // ==================
  // ADDRESS
  // ==================

  /**
   * Save address information
   * POST /api/v1/onboarding/address
   */
  router.post('/address', validateSession, async (req, res, next) => {
    try {
      const application = req.application;
      const {
        region,
        district,
        ward,
        street,
        houseNumber,
        landmark,
        poBox,
        postalCode,
        residenceDuration,
        residenceType,
        coordinates,
      } = req.body;

      if (!region || !district) {
        return res.status(400).json({
          success: false,
          message: 'Region and district are required',
        });
      }

      application.address = {
        physical: {
          region,
          district,
          ward,
          street,
          houseNumber,
          landmark,
        },
        postal: {
          poBox,
          postalCode,
          city: district,
        },
        coordinates,
        residenceDuration,
        residenceType,
      };

      application.status = 'ADDRESS_COMPLETE';
      application.currentStep = 6;
      await application.save();

      res.json({
        success: true,
        data: {
          currentStep: 6,
        },
      });
    } catch (error) {
      logger.error('Address save failed', { error: error.message });
      next(error);
    }
  });

  // ==================
  // EMPLOYMENT
  // ==================

  /**
   * Save employment information
   * POST /api/v1/onboarding/employment
   */
  router.post('/employment', validateSession, async (req, res, next) => {
    try {
      const application = req.application;
      const {
        status,
        employerName,
        employerAddress,
        employerPhone,
        jobTitle,
        employmentDate,
        employeeId,
        businessName,
        businessType,
        businessRegistration,
        businessAddress,
        monthlyIncome,
        incomeSource,
      } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: 'Employment status is required',
        });
      }

      application.employment = {
        status,
        employerName,
        employerAddress,
        employerPhone,
        jobTitle,
        employmentDate: employmentDate ? new Date(employmentDate) : undefined,
        employeeId,
        businessName,
        businessType,
        businessRegistration,
        businessAddress,
        monthlyIncome: {
          currency: 'TZS',
          amount: monthlyIncome?.amount,
          range: monthlyIncome?.range,
        },
        incomeSource,
      };

      application.status = 'EMPLOYMENT_COMPLETE';
      application.currentStep = 7;
      await application.save();

      res.json({
        success: true,
        data: {
          currentStep: 7,
        },
      });
    } catch (error) {
      logger.error('Employment save failed', { error: error.message });
      next(error);
    }
  });

  /**
   * Save next of kin
   * POST /api/v1/onboarding/next-of-kin
   */
  router.post('/next-of-kin', validateSession, async (req, res, next) => {
    try {
      const application = req.application;
      const { fullName, relationship, phone, address } = req.body;

      application.nextOfKin = {
        fullName,
        relationship,
        phone,
        address,
      };

      await application.save();

      res.json({
        success: true,
        message: 'Next of kin saved',
      });
    } catch (error) {
      next(error);
    }
  });

  // ==================
  // PRODUCT SELECTION
  // ==================

  /**
   * Get available products
   * GET /api/v1/onboarding/products
   */
  router.get('/products', async (req, res, next) => {
    try {
      const tenantId = req.tenantConfig?.id || req.headers['x-tenant-id'];

      // Get savings products from Mifos
      const response = await mifosClient.get('/savingsproducts');
      const products = response.data;

      // Filter for self-service products
      const selfServiceProducts = products.filter(p => 
        p.isActive && !p.isLocked
      ).map(p => ({
        id: p.id,
        name: p.name,
        shortName: p.shortName,
        description: p.description,
        currencyCode: p.currency?.code,
        nominalAnnualInterestRate: p.nominalAnnualInterestRate,
        minRequiredOpeningBalance: p.minRequiredOpeningBalance,
        features: {
          allowOverdraft: p.allowOverdraft,
          enforceMinRequiredBalance: p.enforceMinRequiredBalance,
          minRequiredBalance: p.minRequiredBalance,
        },
      }));

      res.json({
        success: true,
        data: selfServiceProducts,
      });
    } catch (error) {
      logger.error('Get products failed', { error: error.message });
      next(error);
    }
  });

  /**
   * Select product
   * POST /api/v1/onboarding/select-product
   */
  router.post('/select-product', validateSession, async (req, res, next) => {
    try {
      const application = req.application;
      const { productId, productName, productType, currency } = req.body;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: 'Product selection is required',
        });
      }

      application.selectedProduct = {
        productId,
        productName,
        productType: productType || 'SAVINGS',
        currency: currency || 'TZS',
      };

      application.status = 'PRODUCT_SELECTED';
      application.currentStep = 8;
      await application.save();

      res.json({
        success: true,
        data: {
          currentStep: 8,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // ==================
  // TERMS & SUBMIT
  // ==================

  /**
   * Accept terms and conditions
   * POST /api/v1/onboarding/accept-terms
   */
  router.post('/accept-terms', validateSession, async (req, res, next) => {
    try {
      const application = req.application;
      const { accepted, version } = req.body;

      if (!accepted) {
        return res.status(400).json({
          success: false,
          message: 'You must accept the terms and conditions',
        });
      }

      application.termsAcceptance = {
        accepted: true,
        acceptedAt: new Date(),
        version: version || '1.0',
        ipAddress: req.ip,
        deviceInfo: req.get('user-agent'),
      };

      application.status = 'TERMS_ACCEPTED';
      application.currentStep = 9;
      await application.save();

      res.json({
        success: true,
        data: {
          currentStep: 9,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * Submit application for review
   * POST /api/v1/onboarding/submit
   */
  router.post('/submit', validateSession, async (req, res, next) => {
    try {
      const application = req.application;

      // Verify all steps completed
      if (!application.isComplete()) {
        return res.status(400).json({
          success: false,
          message: 'Please complete all required steps before submitting',
          missingSteps: getMissingSteps(application),
        });
      }

      // Perform risk assessment
      const riskAssessment = await onboardingService.assessRisk(application);
      application.riskAssessment = riskAssessment;

      // Check for auto-approval
      if (application.canAutoApprove()) {
        // Auto-approve and create account
        application.status = 'APPROVED';
        application.review = {
          decision: 'APPROVED',
          reviewedAt: new Date(),
          comments: 'Auto-approved based on verification results',
        };

        // Create Mifos client and account
        const mifosResult = await onboardingService.createMifosClientAndAccount(application);
        
        if (mifosResult.success) {
          application.mifos = {
            clientId: mifosResult.clientId,
            accountId: mifosResult.accountId,
            accountNumber: mifosResult.accountNumber,
            createdAt: new Date(),
            syncStatus: 'SYNCED',
          };
        } else {
          application.mifos = {
            syncStatus: 'FAILED',
            syncError: mifosResult.error,
          };
        }

        application.submittedAt = new Date();
        await application.save();

        return res.json({
          success: true,
          data: {
            status: 'APPROVED',
            accountNumber: mifosResult.accountNumber,
            message: 'Congratulations! Your account has been opened.',
          },
        });
      }

      // Submit for manual review
      application.status = 'PENDING_APPROVAL';
      application.submittedAt = new Date();
      await application.save();

      logger.info('Application submitted for review', {
        applicationId: application._id,
        riskLevel: riskAssessment.level,
      });

      res.json({
        success: true,
        data: {
          status: 'PENDING_APPROVAL',
          message: 'Your application has been submitted for review. You will be notified once approved.',
        },
      });
    } catch (error) {
      logger.error('Application submission failed', { error: error.message });
      next(error);
    }
  });

  // ==================
  // STATUS & RESUME
  // ==================

  /**
   * Get application status
   * GET /api/v1/onboarding/status/:applicationId
   */
  router.get('/status/:applicationId', async (req, res, next) => {
    try {
      const { applicationId } = req.params;
      const { sessionToken } = req.query;
      const tenantId = req.tenantConfig?.id || req.headers['x-tenant-id'];

      const application = await OnboardingApplication.findOne({
        _id: applicationId,
        tenantId,
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found',
        });
      }

      // Check session if provided
      if (sessionToken && application.sessionToken !== sessionToken) {
        return res.status(403).json({
          success: false,
          message: 'Invalid session',
        });
      }

      const statusData = {
        status: application.status,
        currentStep: application.currentStep,
        createdAt: application.createdAt,
        submittedAt: application.submittedAt,
      };

      if (application.status === 'APPROVED') {
        statusData.accountNumber = application.mifos?.accountNumber;
      }

      if (application.status === 'REJECTED') {
        statusData.rejectionReason = application.review?.rejectionReason;
      }

      res.json({
        success: true,
        data: statusData,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * Resume application
   * POST /api/v1/onboarding/resume
   */
  router.post('/resume', async (req, res, next) => {
    try {
      const { phoneNumber, countryCode = '+255' } = req.body;
      const tenantId = req.tenantConfig?.id || req.headers['x-tenant-id'];

      const normalizedPhone = phoneNumber.replace(/\D/g, '').slice(-9);
      const fullPhone = `${countryCode}${normalizedPhone}`;

      const application = await OnboardingApplication.findByPhone(tenantId, fullPhone);

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'No pending application found for this phone number',
        });
      }

      // Send new OTP for verification
      await onboardingService.sendOTP(fullPhone, tenantId);

      // Generate new session token
      application.sessionToken = onboardingService.generateSessionToken();
      application.sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await application.save();

      res.json({
        success: true,
        data: {
          applicationId: application._id,
          currentStep: application.currentStep,
          status: application.status,
          message: 'OTP sent to your phone. Please verify to continue.',
        },
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * Get application summary for review screen
   * GET /api/v1/onboarding/summary
   */
  router.get('/summary', validateSession, async (req, res, next) => {
    try {
      const application = req.application;

      // Get view URLs for documents
      let idFrontUrl, idBackUrl, selfieUrl;
      
      if (application.identification?.documentFrontKey) {
        idFrontUrl = await onboardingService.getViewUrl(application.identification.documentFrontKey);
      }
      if (application.identification?.documentBackKey) {
        idBackUrl = await onboardingService.getViewUrl(application.identification.documentBackKey);
      }
      if (application.selfie?.imageKey) {
        selfieUrl = await onboardingService.getViewUrl(application.selfie.imageKey);
      }

      res.json({
        success: true,
        data: {
          personalInfo: application.personalInfo,
          identification: {
            type: application.identification?.type,
            number: application.identification?.number,
            nidaVerified: application.identification?.nidaVerification?.verified,
            documentFrontUrl: idFrontUrl,
            documentBackUrl: idBackUrl,
          },
          selfie: {
            imageUrl: selfieUrl,
            livenessVerified: application.selfie?.liveness?.passed,
            faceMatched: application.selfie?.faceMatch?.matched,
          },
          address: application.address,
          employment: application.employment,
          selectedProduct: application.selectedProduct,
          termsAccepted: application.termsAcceptance?.accepted,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // ==================
  // MIDDLEWARE
  // ==================

  /**
   * Validate session middleware
   */
  async function validateSession(req, res, next) {
    try {
      const { applicationId } = req.body;
      const sessionToken = req.body.sessionToken || req.headers['x-session-token'];
      const tenantId = req.tenantConfig?.id || req.headers['x-tenant-id'];

      if (!applicationId || !sessionToken) {
        return res.status(401).json({
          success: false,
          message: 'Application ID and session token are required',
        });
      }

      const application = await OnboardingApplication.findOne({
        _id: applicationId,
        tenantId,
        sessionToken,
        sessionExpiresAt: { $gt: new Date() },
      });

      if (!application) {
        return res.status(401).json({
          success: false,
          message: 'Session expired or invalid. Please start again.',
        });
      }

      if (['APPROVED', 'REJECTED', 'EXPIRED'].includes(application.status)) {
        return res.status(400).json({
          success: false,
          message: `This application is ${application.status.toLowerCase()}`,
        });
      }

      req.application = application;
      next();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get missing steps helper
   */
  function getMissingSteps(application) {
    const missing = [];
    
    if (!application.phone.verified) missing.push('Phone verification');
    if (!application.personalInfo?.firstName) missing.push('Personal information');
    if (!application.identification?.documentFrontKey) missing.push('ID document');
    if (!application.selfie?.imageKey) missing.push('Selfie');
    if (!application.selfie?.liveness?.passed) missing.push('Liveness verification');
    if (!application.selfie?.faceMatch?.matched) missing.push('Face matching');
    if (!application.address?.physical?.region) missing.push('Address');
    if (!application.employment?.status) missing.push('Employment information');
    if (!application.selectedProduct?.productId) missing.push('Product selection');
    if (!application.termsAcceptance?.accepted) missing.push('Terms acceptance');

    return missing;
  }

  return router;
};
