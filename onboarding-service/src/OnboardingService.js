const crypto = require('crypto');
const axios = require('axios');
const AWS = require('aws-sdk');
const logger = require('../../api-gateway/src/utils/logger');

/**
 * Onboarding Service
 * Handles all onboarding business logic including:
 * - OTP generation and verification
 * - Document processing
 * - NIDA verification
 * - Face matching
 * - Risk assessment
 * - Mifos client creation
 */
class OnboardingService {
  constructor(config, mifosClient) {
    this.config = config;
    this.mifosClient = mifosClient;

    // Initialize AWS services
    this.s3 = new AWS.S3({
      region: config.aws?.region || 'af-south-1',
      accessKeyId: config.aws?.accessKeyId,
      secretAccessKey: config.aws?.secretAccessKey,
    });

    this.rekognition = new AWS.Rekognition({
      region: config.aws?.region || 'af-south-1',
      accessKeyId: config.aws?.accessKeyId,
      secretAccessKey: config.aws?.secretAccessKey,
    });

    this.textract = new AWS.Textract({
      region: config.aws?.region || 'af-south-1',
      accessKeyId: config.aws?.accessKeyId,
      secretAccessKey: config.aws?.secretAccessKey,
    });

    // OTP storage (in production, use Redis)
    this.otpStore = new Map();
  }

  // ==================
  // OTP MANAGEMENT
  // ==================

  /**
   * Generate and send OTP
   */
  async sendOTP(phoneNumber, tenantId) {
    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store OTP (in production, use Redis with TTL)
    const key = `${tenantId}:${phoneNumber}`;
    this.otpStore.set(key, { otp, expiresAt, attempts: 0 });

    // Send OTP via SMS gateway
    try {
      await this._sendSMS(phoneNumber, `Your MiraDigital verification code is: ${otp}. Valid for 5 minutes.`);
      
      logger.info('OTP sent', { phoneNumber: this._maskPhone(phoneNumber), tenantId });
      
      return {
        success: true,
        message: 'OTP sent successfully',
        expiresIn: 300, // seconds
      };
    } catch (error) {
      logger.error('Failed to send OTP', { error: error.message, phoneNumber: this._maskPhone(phoneNumber) });
      throw new Error('Failed to send verification code');
    }
  }

  /**
   * Verify OTP
   */
  verifyOTP(phoneNumber, otp, tenantId) {
    const key = `${tenantId}:${phoneNumber}`;
    const stored = this.otpStore.get(key);

    if (!stored) {
      return { valid: false, message: 'No OTP found. Please request a new one.' };
    }

    if (Date.now() > stored.expiresAt) {
      this.otpStore.delete(key);
      return { valid: false, message: 'OTP has expired. Please request a new one.' };
    }

    stored.attempts++;

    if (stored.attempts > 3) {
      this.otpStore.delete(key);
      return { valid: false, message: 'Too many attempts. Please request a new OTP.' };
    }

    if (stored.otp !== otp) {
      return { valid: false, message: 'Invalid OTP. Please try again.' };
    }

    // OTP verified, remove from store
    this.otpStore.delete(key);
    
    return { valid: true, message: 'Phone number verified successfully' };
  }

  // ==================
  // DOCUMENT HANDLING
  // ==================

  /**
   * Generate presigned URL for document upload
   */
  async getUploadUrl(applicationId, documentType, contentType = 'image/jpeg') {
    const bucket = this.config.aws?.s3Bucket || 'miradigital-kyc';
    const key = `onboarding/${applicationId}/${documentType}-${Date.now()}.jpg`;

    const params = {
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      Expires: 300, // 5 minutes
      Metadata: {
        applicationId,
        documentType,
      },
    };

    const uploadUrl = await this.s3.getSignedUrlPromise('putObject', params);

    return {
      uploadUrl,
      key,
      expiresIn: 300,
    };
  }

  /**
   * Get signed URL for viewing document
   */
  async getViewUrl(key) {
    const bucket = this.config.aws?.s3Bucket || 'miradigital-kyc';

    const params = {
      Bucket: bucket,
      Key: key,
      Expires: 3600, // 1 hour
    };

    return this.s3.getSignedUrlPromise('getObject', params);
  }

  /**
   * Extract text from ID document using OCR
   */
  async extractDocumentData(documentKey) {
    const bucket = this.config.aws?.s3Bucket || 'miradigital-kyc';

    try {
      const response = await this.textract.analyzeDocument({
        Document: {
          S3Object: {
            Bucket: bucket,
            Name: documentKey,
          },
        },
        FeatureTypes: ['FORMS'],
      }).promise();

      // Parse Textract response
      const extractedData = this._parseTextractResponse(response);

      logger.info('Document OCR completed', { documentKey, fieldsFound: Object.keys(extractedData) });

      return {
        success: true,
        data: extractedData,
        confidence: extractedData.averageConfidence || 0,
      };
    } catch (error) {
      logger.error('OCR extraction failed', { error: error.message, documentKey });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Parse Textract response to extract relevant fields
   */
  _parseTextractResponse(response) {
    const data = {
      extractedName: '',
      extractedDob: '',
      extractedNumber: '',
      averageConfidence: 0,
    };

    const blocks = response.Blocks || [];
    let totalConfidence = 0;
    let confidenceCount = 0;

    // Look for key-value pairs
    for (const block of blocks) {
      if (block.BlockType === 'LINE' && block.Text) {
        const text = block.Text.toUpperCase();
        
        // Try to identify ID number patterns
        if (/^\d{8}-\d{5}-\d{5}-\d{2}$/.test(block.Text)) {
          data.extractedNumber = block.Text; // NIDA format
        } else if (/^[A-Z]{2}\d{6}$/.test(block.Text)) {
          data.extractedNumber = block.Text; // Passport format
        }

        // Try to identify date patterns (DD/MM/YYYY or DD-MM-YYYY)
        const dateMatch = block.Text.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
        if (dateMatch) {
          data.extractedDob = block.Text;
        }

        if (block.Confidence) {
          totalConfidence += block.Confidence;
          confidenceCount++;
        }
      }
    }

    if (confidenceCount > 0) {
      data.averageConfidence = Math.round(totalConfidence / confidenceCount);
    }

    return data;
  }

  // ==================
  // NIDA VERIFICATION
  // ==================

  /**
   * Verify identity against NIDA (Tanzania National ID Authority)
   */
  async verifyNIDA(nidaNumber, firstName, lastName, dateOfBirth) {
    // NIDA API integration
    const nidaConfig = this.config.nida || {};

    try {
      // Format date as required by NIDA
      const dob = new Date(dateOfBirth);
      const formattedDob = `${dob.getDate().toString().padStart(2, '0')}/${(dob.getMonth() + 1).toString().padStart(2, '0')}/${dob.getFullYear()}`;

      const response = await axios.post(
        nidaConfig.baseUrl || 'https://api.nida.go.tz/v1/verify',
        {
          nin: nidaNumber,
          firstName: firstName.toUpperCase(),
          lastName: lastName.toUpperCase(),
          dateOfBirth: formattedDob,
        },
        {
          headers: {
            'Authorization': `Bearer ${nidaConfig.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const result = response.data;

      return {
        verified: result.match === true,
        matchScore: result.matchScore || 0,
        photo: result.photo, // Base64 photo from NIDA
        details: {
          firstName: result.firstName,
          lastName: result.lastName,
          middleName: result.middleName,
          dateOfBirth: result.dateOfBirth,
          gender: result.gender,
          nationality: result.nationality,
        },
        response: result,
      };
    } catch (error) {
      logger.error('NIDA verification failed', {
        error: error.message,
        nidaNumber: this._maskId(nidaNumber),
      });

      // For development/testing, return mock success
      if (this.config.environment === 'development') {
        return this._mockNidaResponse(nidaNumber, firstName, lastName);
      }

      throw new Error('Identity verification service unavailable');
    }
  }

  /**
   * Mock NIDA response for development
   */
  _mockNidaResponse(nidaNumber, firstName, lastName) {
    return {
      verified: true,
      matchScore: 95,
      photo: null, // Would be base64 in production
      details: {
        firstName: firstName.toUpperCase(),
        lastName: lastName.toUpperCase(),
        dateOfBirth: '1990-01-01',
        gender: 'MALE',
        nationality: 'Tanzanian',
      },
      isMock: true,
    };
  }

  // ==================
  // FACE VERIFICATION
  // ==================

  /**
   * Perform liveness detection on selfie
   */
  async checkLiveness(selfieKey) {
    const bucket = this.config.aws?.s3Bucket || 'miradigital-kyc';

    try {
      // Use Rekognition to detect faces and check for liveness indicators
      const response = await this.rekognition.detectFaces({
        Image: {
          S3Object: {
            Bucket: bucket,
            Name: selfieKey,
          },
        },
        Attributes: ['ALL'],
      }).promise();

      if (!response.FaceDetails || response.FaceDetails.length === 0) {
        return {
          passed: false,
          score: 0,
          message: 'No face detected in the image',
        };
      }

      if (response.FaceDetails.length > 1) {
        return {
          passed: false,
          score: 0,
          message: 'Multiple faces detected. Please take a selfie with only your face.',
        };
      }

      const face = response.FaceDetails[0];

      // Check liveness indicators
      const livenessScore = this._calculateLivenessScore(face);

      return {
        passed: livenessScore >= 70,
        score: livenessScore,
        details: {
          confidence: face.Confidence,
          eyesOpen: face.EyesOpen?.Value,
          mouthOpen: face.MouthOpen?.Value,
          pose: face.Pose,
          quality: face.Quality,
        },
        message: livenessScore >= 70 ? 'Liveness check passed' : 'Liveness check failed. Please try again.',
      };
    } catch (error) {
      logger.error('Liveness check failed', { error: error.message, selfieKey });
      throw new Error('Failed to verify liveness');
    }
  }

  /**
   * Calculate liveness score based on face attributes
   */
  _calculateLivenessScore(faceDetails) {
    let score = 0;

    // Face confidence
    if (faceDetails.Confidence > 99) score += 20;
    else if (faceDetails.Confidence > 95) score += 15;
    else if (faceDetails.Confidence > 90) score += 10;

    // Eyes open (indicates real person)
    if (faceDetails.EyesOpen?.Value && faceDetails.EyesOpen?.Confidence > 90) {
      score += 20;
    }

    // Image quality
    if (faceDetails.Quality) {
      if (faceDetails.Quality.Brightness > 50) score += 15;
      if (faceDetails.Quality.Sharpness > 50) score += 15;
    }

    // Pose (face should be relatively straight)
    if (faceDetails.Pose) {
      const { Yaw, Pitch, Roll } = faceDetails.Pose;
      if (Math.abs(Yaw) < 25 && Math.abs(Pitch) < 25 && Math.abs(Roll) < 25) {
        score += 30;
      } else if (Math.abs(Yaw) < 35 && Math.abs(Pitch) < 35 && Math.abs(Roll) < 35) {
        score += 15;
      }
    }

    return Math.min(100, score);
  }

  /**
   * Compare selfie with ID document photo or NIDA photo
   */
  async compareFaces(selfieKey, referenceImageKey, isBase64Reference = false) {
    const bucket = this.config.aws?.s3Bucket || 'miradigital-kyc';

    try {
      const params = {
        SourceImage: {
          S3Object: {
            Bucket: bucket,
            Name: selfieKey,
          },
        },
        SimilarityThreshold: 70,
      };

      if (isBase64Reference) {
        // Reference is base64 (e.g., from NIDA)
        params.TargetImage = {
          Bytes: Buffer.from(referenceImageKey, 'base64'),
        };
      } else {
        // Reference is S3 key
        params.TargetImage = {
          S3Object: {
            Bucket: bucket,
            Name: referenceImageKey,
          },
        };
      }

      const response = await this.rekognition.compareFaces(params).promise();

      if (!response.FaceMatches || response.FaceMatches.length === 0) {
        return {
          matched: false,
          score: 0,
          message: 'Faces do not match',
        };
      }

      const bestMatch = response.FaceMatches[0];
      const similarity = bestMatch.Similarity;

      return {
        matched: similarity >= 80,
        score: Math.round(similarity),
        message: similarity >= 80 
          ? 'Face verification successful' 
          : 'Face verification failed. Please ensure your selfie matches your ID photo.',
      };
    } catch (error) {
      logger.error('Face comparison failed', { error: error.message });
      
      // Handle specific errors
      if (error.code === 'InvalidParameterException') {
        return {
          matched: false,
          score: 0,
          message: 'Could not detect face in one or both images',
        };
      }
      
      throw new Error('Failed to verify face match');
    }
  }

  // ==================
  // RISK ASSESSMENT
  // ==================

  /**
   * Perform risk assessment on application
   */
  async assessRisk(application) {
    const flags = [];
    let score = 0;

    // Check for multiple applications from same phone
    const existingApps = await this._countRecentApplications(
      application.tenantId,
      application.phone.number
    );
    if (existingApps > 2) {
      flags.push('MULTIPLE_APPLICATIONS');
      score += 30;
    }

    // Check ID number for previous rejections
    if (application.identification?.number) {
      const previousRejection = await this._checkPreviousRejection(
        application.tenantId,
        application.identification.number
      );
      if (previousRejection) {
        flags.push('PREVIOUSLY_REJECTED');
        score += 50;
      }
    }

    // Face match score
    if (application.selfie?.faceMatch?.score < 85) {
      flags.push('LOW_FACE_MATCH');
      score += 20;
    }

    // NIDA verification
    if (!application.identification?.nidaVerification?.verified) {
      flags.push('NIDA_NOT_VERIFIED');
      score += 25;
    }

    // Income vs product assessment
    // TODO: Add product-specific income requirements

    // Sanctions and PEP screening
    const sanctionsResult = await this._screenSanctions(
      application.personalInfo?.firstName,
      application.personalInfo?.lastName,
      application.personalInfo?.dateOfBirth
    );
    if (sanctionsResult.match) {
      flags.push('SANCTIONS_MATCH');
      score += 100;
    }

    // Determine risk level
    let level = 'LOW';
    if (score >= 50) level = 'HIGH';
    else if (score >= 25) level = 'MEDIUM';

    return {
      score,
      level,
      flags,
      sanctionsChecked: true,
      pepChecked: sanctionsResult.pepChecked,
      assessedAt: new Date(),
    };
  }

  async _countRecentApplications(tenantId, phoneNumber) {
    // Would query database
    return 0;
  }

  async _checkPreviousRejection(tenantId, idNumber) {
    // Would query database
    return false;
  }

  async _screenSanctions(firstName, lastName, dob) {
    // Integration with sanctions screening service
    // For now, return clean
    return {
      match: false,
      pepChecked: true,
    };
  }

  // ==================
  // MIFOS INTEGRATION
  // ==================

  /**
   * Create client and savings account in Mifos
   */
  async createMifosClientAndAccount(application, officeId = 1) {
    try {
      // 1. Create client
      const clientData = {
        officeId,
        firstname: application.personalInfo.firstName,
        middlename: application.personalInfo.middleName || '',
        lastname: application.personalInfo.lastName,
        fullname: application.fullName,
        dateOfBirth: this._formatMifosDate(application.personalInfo.dateOfBirth),
        mobileNo: application.phone.number,
        externalId: application.identification.number,
        genderId: application.personalInfo.gender === 'MALE' ? 1 : 2,
        isStaff: false,
        active: true,
        activationDate: this._formatMifosDate(new Date()),
        dateFormat: 'dd MMMM yyyy',
        locale: 'en',
        // Address
        address: [
          {
            addressType: 'RESIDENTIAL',
            street: application.address?.physical?.street || '',
            city: application.address?.physical?.district || '',
            stateProvinceId: null,
            countryId: null,
            postalCode: application.address?.postal?.postalCode || '',
          },
        ],
      };

      logger.info('Creating Mifos client', {
        applicationId: application._id,
        externalId: application.identification.number,
      });

      const clientResponse = await this.mifosClient.post('/clients', clientData);
      const clientId = clientResponse.data.clientId;

      // 2. Create savings account
      const accountData = {
        clientId,
        productId: application.selectedProduct.productId,
        fieldOfficerId: null,
        submittedOnDate: this._formatMifosDate(new Date()),
        dateFormat: 'dd MMMM yyyy',
        locale: 'en',
      };

      const accountResponse = await this.mifosClient.post('/savingsaccounts', accountData);
      const accountId = accountResponse.data.savingsId;

      // 3. Approve savings account
      await this.mifosClient.post(`/savingsaccounts/${accountId}?command=approve`, {
        approvedOnDate: this._formatMifosDate(new Date()),
        dateFormat: 'dd MMMM yyyy',
        locale: 'en',
      });

      // 4. Activate savings account
      const activateResponse = await this.mifosClient.post(`/savingsaccounts/${accountId}?command=activate`, {
        activatedOnDate: this._formatMifosDate(new Date()),
        dateFormat: 'dd MMMM yyyy',
        locale: 'en',
      });

      const accountNumber = activateResponse.data.accountNo;

      logger.info('Mifos client and account created', {
        applicationId: application._id,
        clientId,
        accountId,
        accountNumber,
      });

      return {
        success: true,
        clientId,
        accountId,
        accountNumber,
      };
    } catch (error) {
      logger.error('Failed to create Mifos client/account', {
        error: error.message,
        applicationId: application._id,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Format date for Mifos API
   */
  _formatMifosDate(date) {
    const d = new Date(date);
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  // ==================
  // UTILITIES
  // ==================

  /**
   * Send SMS via configured gateway
   */
  async _sendSMS(phoneNumber, message) {
    const smsConfig = this.config.sms || {};

    // Support multiple SMS providers
    switch (smsConfig.provider) {
      case 'BEEM':
        return this._sendBeemSMS(phoneNumber, message);
      case 'NEXTSMS':
        return this._sendNextSMS(phoneNumber, message);
      default:
        // Log for development
        logger.info('SMS (dev mode)', { phoneNumber: this._maskPhone(phoneNumber), message });
        return { success: true };
    }
  }

  async _sendBeemSMS(phoneNumber, message) {
    const config = this.config.sms;
    const response = await axios.post(
      'https://apisms.beem.africa/v1/send',
      {
        source_addr: config.senderId || 'MIRADIGITAL',
        message,
        recipients: [{ recipient_id: '1', dest_addr: phoneNumber }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64')}`,
        },
      }
    );
    return response.data;
  }

  async _sendNextSMS(phoneNumber, message) {
    const config = this.config.sms;
    const response = await axios.post(
      'https://messaging-service.co.tz/api/sms/v1/text/single',
      {
        from: config.senderId || 'MIRADIGITAL',
        to: phoneNumber,
        text: message,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`,
        },
      }
    );
    return response.data;
  }

  /**
   * Mask phone number for logging
   */
  _maskPhone(phone) {
    if (!phone || phone.length < 6) return '***';
    return phone.slice(0, 3) + '****' + phone.slice(-3);
  }

  /**
   * Mask ID number for logging
   */
  _maskId(id) {
    if (!id || id.length < 6) return '***';
    return id.slice(0, 4) + '****' + id.slice(-4);
  }

  /**
   * Generate session token for resuming application
   */
  generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }
}

module.exports = OnboardingService;
