# Self-Service Customer Onboarding Implementation

## Overview

This document describes the complete self-service customer onboarding flow implementation for MiraDigital. The system allows new customers to register and open bank accounts entirely through the mobile app, with KYC verification through NIDA and biometric face matching.

## Architecture

### Components

1. **Mobile App Screens** (`mobile-app/src/screens/onboarding/`)
   - WelcomeScreen - Entry point with feature overview
   - PhoneVerificationScreen - OTP verification
   - PersonalInfoScreen - Name, DOB, gender collection
   - DocumentCaptureScreen - ID document photo capture
   - NidaVerificationScreen - NIDA number verification
   - SelfieScreen - Selfie with liveness detection
   - AddressScreen - Tanzania region/district/ward/street
   - EmploymentScreen - Employment status and income
   - ProductSelectionScreen - Account type selection
   - TermsScreen - Terms & conditions acceptance
   - ReviewScreen - Application summary and submission
   - StatusScreen - Pending/approved/rejected status

2. **Backend Services**
   - `OnboardingService.js` - Core business logic
   - `OnboardingApplication.js` - MongoDB schema
   - `onboarding.js` - Express routes

3. **External Integrations**
   - NIDA API - National ID verification
   - AWS S3 - Document storage
   - AWS Rekognition - Face matching and liveness
   - AWS Textract - Document OCR
   - Mifos - Core banking for client/account creation
   - SMS Gateway (Beem/NextSMS) - OTP delivery

## Onboarding Flow

```
┌─────────────────┐
│  Welcome Screen │ ────► Features overview, Get Started
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Phone & OTP     │ ────► Enter phone, receive OTP, verify
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Personal Info   │ ────► Name, DOB, Gender, Marital Status
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Document Capture│ ────► Front & back of ID (NIDA/Passport/License)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ NIDA Verify     │ ────► Enter 20-digit NIDA number, verify with NIDA API
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Selfie + Live   │ ────► Take selfie, liveness check, face match
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Address         │ ────► Region, District, Ward, Street
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Employment      │ ────► Status, Employer, Income
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Product Select  │ ────► Choose account type from Mifos products
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Terms & Cond.   │ ────► Read and accept T&C
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Review & Submit │ ────► Review all info, submit application
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Status Screen   │ ────► Pending → Approved/Rejected
└─────────────────┘
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/onboarding/initiate | Start onboarding, send OTP |
| POST | /api/v1/onboarding/verify-otp | Verify OTP |
| POST | /api/v1/onboarding/personal-info | Save personal details |
| POST | /api/v1/onboarding/documents/upload-url | Get S3 presigned URL |
| POST | /api/v1/onboarding/documents/confirm | Confirm document upload, run OCR |
| POST | /api/v1/onboarding/verify-nida | Verify with NIDA API |
| POST | /api/v1/onboarding/selfie/liveness-session | Start Rekognition liveness |
| POST | /api/v1/onboarding/selfie/confirm | Confirm selfie, face match |
| POST | /api/v1/onboarding/address | Save address |
| POST | /api/v1/onboarding/employment | Save employment info |
| POST | /api/v1/onboarding/next-of-kin | Save next of kin |
| GET | /api/v1/onboarding/products | Get available products |
| POST | /api/v1/onboarding/select-product | Select account product |
| POST | /api/v1/onboarding/accept-terms | Accept T&C |
| POST | /api/v1/onboarding/submit | Submit application |
| GET | /api/v1/onboarding/status/:id | Get application status |
| POST | /api/v1/onboarding/resume | Resume existing application |

## Data Model

```javascript
OnboardingApplication {
  tenantId: String,
  phone: String,
  status: ['INITIATED', 'PHONE_VERIFIED', 'PERSONAL_INFO', 
           'DOCUMENTS', 'NIDA_VERIFIED', 'SELFIE', 'ADDRESS',
           'EMPLOYMENT', 'PRODUCT_SELECTED', 'TERMS_ACCEPTED',
           'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'],
  
  personalInfo: {
    firstName, middleName, lastName,
    dateOfBirth, gender, maritalStatus, email
  },
  
  identification: {
    type, frontImageKey, backImageKey,
    nidaNumber, nidaVerified, extractedData
  },
  
  selfie: {
    imageKey, livenessConfidence, faceMatchConfidence,
    livenessSessionId, verified
  },
  
  address: { region, district, ward, street, houseNumber, postalCode },
  
  employment: { status, employerName, occupation, monthlyIncome, incomeSource },
  
  nextOfKin: { name, relationship, phone },
  
  selectedProduct: { productId, productName, productType },
  
  termsAcceptance: { accepted, timestamp, version, ipAddress },
  
  riskAssessment: { score, level, factors, assessedAt },
  
  mifos: { clientId, accountId, createdAt }
}
```

## State Management (Mobile)

The `onboardingStore.ts` Zustand store manages:
- Application ID and current step
- Phone verification state
- Personal info, document, selfie, address, employment data
- Product selection
- Terms acceptance
- Loading and error states
- Navigation between steps
- Persistence with AsyncStorage

## Security Features

1. **OTP Verification** - 6-digit code with 5-minute expiry, max 3 attempts
2. **NIDA Verification** - Cross-reference with Tanzania national database
3. **Liveness Detection** - AWS Rekognition ensures live person
4. **Face Matching** - Compare selfie with ID document photo
5. **Risk Assessment** - Automated scoring based on data quality
6. **Secure Storage** - Documents stored in encrypted S3 buckets
7. **Session Management** - Application sessions expire after 24 hours

## Risk Assessment

Applications are scored on:
- NIDA verification success
- Face match confidence (>90% = low risk)
- Address completeness
- Employment status
- Document quality

Risk Levels:
- **LOW** (auto-approve): Score < 25
- **MEDIUM** (manual review): Score 25-50
- **HIGH** (requires approval): Score > 50

## Mifos Integration

On approval:
1. Create client in Mifos with all KYC data
2. Create savings account with selected product
3. Activate account
4. Store Mifos IDs in application
5. Send welcome SMS with account details

## Environment Variables

```env
# AWS
AWS_REGION=af-south-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
S3_BUCKET_ONBOARDING=miradigital-onboarding-docs

# NIDA
NIDA_API_URL=https://api.nida.go.tz
NIDA_API_KEY=xxx

# SMS
SMS_PROVIDER=beem
SMS_API_KEY=xxx
SMS_SECRET_KEY=xxx
SMS_SENDER_ID=MIRA
```

## Testing the Flow

1. Start with phone number: +255712345678
2. Receive OTP via SMS (or check server logs in dev)
3. Complete each step with valid data
4. Use test NIDA number: 19900101123456789012
5. Submit and check status

## Troubleshooting

- **OTP not received**: Check SMS provider balance/config
- **NIDA verification fails**: Ensure name/DOB matches exactly
- **Face match fails**: Try better lighting, remove glasses
- **Document OCR fails**: Ensure clear, non-blurry photos
- **Mifos creation fails**: Check Mifos API connectivity

## Future Enhancements

1. Video KYC as alternative to document + selfie
2. Address verification via GPS/maps
3. Instant account activation with risk-based limits
4. Referral program integration
5. Multi-language support (Swahili)
