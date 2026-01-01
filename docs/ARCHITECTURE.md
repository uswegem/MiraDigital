# MiraDigital - Revised Multi-Tenant Architecture

## Project Structure (Updated)

```
MiraDigital/
│
├── api-gateway/                    # Central API Gateway (Multi-Tenant)
│   ├── src/
│   │   ├── config/
│   │   │   ├── index.js
│   │   │   └── tenants.js          # Tenant configurations
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   ├── tenant.js           # NEW: Tenant resolution
│   │   │   ├── rateLimiter.js
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── accounts.js
│   │   │   ├── loans.js
│   │   │   ├── payments.js         # NEW: Payment routes
│   │   │   ├── cards.js            # NEW: Card management routes
│   │   │   └── bills.js            # NEW: Bill payment routes
│   │   ├── services/
│   │   │   ├── authService.js
│   │   │   ├── accountService.js
│   │   │   └── loanService.js
│   │   └── utils/
│   └── package.json
│
├── core-banking/                   # MIFOS Integration Service
│   ├── src/
│   │   ├── MifosClient.js          # Multi-tenant MIFOS client
│   │   ├── clients/
│   │   ├── loans/
│   │   ├── savings/
│   │   └── transactions/
│   └── package.json
│
├── payment-service/                # NEW: Payment Orchestration
│   ├── src/
│   │   ├── orchestrator/
│   │   │   ├── PaymentOrchestrator.js
│   │   │   └── TransactionManager.js
│   │   ├── adapters/
│   │   │   ├── BaseAdapter.js
│   │   │   ├── SelcomAdapter.js    # Bill payments
│   │   │   ├── TIPSAdapter.js      # Instant transfers
│   │   │   └── GEPGAdapter.js      # Government payments
│   │   ├── models/
│   │   │   ├── Payment.js
│   │   │   └── Transaction.js
│   │   └── config/
│   │       └── providers.js
│   └── package.json
│
├── card-service/                   # NEW: Card & VISA Integration
│   ├── src/
│   │   ├── visa/
│   │   │   ├── VisaSDK.js          # VISA SDK wrapper
│   │   │   ├── TokenService.js     # Card tokenization
│   │   │   └── TapToPay.js         # NFC payments
│   │   ├── models/
│   │   │   ├── Card.js
│   │   │   └── TokenizedCard.js
│   │   ├── services/
│   │   │   ├── CardManagement.js
│   │   │   └── VirtualCard.js
│   │   └── config/
│   │       └── visa.config.js
│   └── package.json
│
├── notification-service/           # NEW: Notifications
│   ├── src/
│   │   ├── channels/
│   │   │   ├── sms.js
│   │   │   ├── push.js
│   │   │   └── email.js
│   │   └── templates/
│   └── package.json
│
├── tenant-service/                 # NEW: Tenant Management
│   ├── src/
│   │   ├── models/
│   │   │   └── Tenant.js
│   │   ├── services/
│   │   │   ├── TenantService.js
│   │   │   └── FeatureFlagService.js
│   │   └── config/
│   └── package.json
│
├── shared/                         # Shared Libraries
│   ├── constants/
│   │   ├── errors.js
│   │   ├── paymentTypes.js
│   │   └── cardTypes.js
│   ├── types/
│   │   └── index.d.ts
│   ├── validators/
│   │   ├── payment.js
│   │   └── card.js
│   └── utils/
│       ├── encryption.js
│       ├── masking.js              # PAN masking, etc.
│       └── idempotency.js
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   │   └── tenants.seed.js
│   └── models/
│       ├── User.js
│       ├── Audit.js
│       ├── Tenant.js               # NEW
│       ├── Card.js                 # NEW
│       ├── Payment.js              # NEW
│       └── Transaction.js          # NEW
│
├── web-portal/                     # React Web (Multi-Tenant)
│   ├── src/
│   │   ├── context/
│   │   │   └── TenantContext.jsx   # Tenant theming
│   │   ├── components/
│   │   │   ├── cards/              # Card management UI
│   │   │   └── payments/           # Payment UI
│   │   └── pages/
│   └── package.json
│
├── mobile-app/                     # React Native (Multi-Tenant)
│   ├── src/
│   │   ├── screens/
│   │   │   ├── cards/              # Card screens
│   │   │   └── payments/           # Payment screens
│   │   ├── native-modules/
│   │   │   └── VisaNFC.js          # Native VISA NFC bridge
│   │   └── theme/
│   │       └── TenantTheme.js
│   └── package.json
│
├── ussd-gateway/                   # USSD Service
│   └── ...
│
├── admin-portal/                   # Tenant Admin Portal
│   ├── src/
│   │   ├── pages/
│   │   │   ├── tenants/
│   │   │   ├── users/
│   │   │   └── reports/
│   │   └── ...
│   └── package.json
│
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   └── services/
│       ├── api-gateway.Dockerfile
│       ├── payment-service.Dockerfile
│       └── card-service.Dockerfile
│
├── nginx/
│   ├── nginx.conf
│   └── ssl/
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── MULTI_TENANCY.md
│   ├── PAYMENT_INTEGRATIONS.md
│   ├── CARD_INTEGRATION.md
│   └── API.md
│
├── package.json                    # Monorepo root
└── README.md
```

## Multi-Tenancy Implementation

### 1. Tenant Resolution Middleware

```javascript
// api-gateway/src/middleware/tenant.js

const TenantService = require('../../tenant-service/src/services/TenantService');

const tenantMiddleware = async (req, res, next) => {
  try {
    // Extract tenant from subdomain or header
    let tenantId = null;
    
    // Method 1: Subdomain (miracore.miradigital.co.tz)
    const host = req.get('host');
    const subdomain = host.split('.')[0];
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      tenantId = subdomain;
    }
    
    // Method 2: Header (X-Tenant-ID)
    if (!tenantId) {
      tenantId = req.get('X-Tenant-ID');
    }
    
    // Method 3: Query param (for testing)
    if (!tenantId && process.env.NODE_ENV === 'development') {
      tenantId = req.query.tenant;
    }
    
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: { code: 'TENANT_REQUIRED', message: 'Tenant identification required' }
      });
    }
    
    // Load tenant configuration
    const tenant = await TenantService.getTenant(tenantId);
    if (!tenant || !tenant.active) {
      return res.status(404).json({
        success: false,
        error: { code: 'TENANT_NOT_FOUND', message: 'Tenant not found or inactive' }
      });
    }
    
    // Attach tenant to request
    req.tenant = tenant;
    req.tenantId = tenant.id;
    
    // Set tenant context for database queries
    req.dbContext = { tenantId: tenant.id };
    
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = tenantMiddleware;
```

### 2. Tenant-Scoped Database Models

```javascript
// database/models/User.js

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true,
  },
  // ... other fields
});

// Compound indexes for tenant isolation
userSchema.index({ tenantId: 1, mobileNumber: 1 }, { unique: true });
userSchema.index({ tenantId: 1, email: 1 }, { unique: true, sparse: true });

// Pre-query middleware to enforce tenant isolation
userSchema.pre(/^find/, function(next) {
  if (this._tenantId) {
    this.where({ tenantId: this._tenantId });
  }
  next();
});

// Helper to set tenant context
userSchema.statics.forTenant = function(tenantId) {
  const Model = this;
  const query = Model.find();
  query._tenantId = tenantId;
  return query;
};

module.exports = mongoose.model('User', userSchema);
```

### 3. Tenant Configuration Model

```javascript
// database/models/Tenant.js

const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  name: {
    type: String,
    required: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
  
  // Branding
  branding: {
    primaryColor: { type: String, default: '#1E3A8A' },
    secondaryColor: { type: String, default: '#10B981' },
    logoUrl: String,
    appName: String,
    favicon: String,
    loginBackground: String,
  },
  
  // Feature Flags
  features: {
    billPayments: { type: Boolean, default: true },
    cardManagement: { type: Boolean, default: false },
    tipsTransfer: { type: Boolean, default: true },
    gepg: { type: Boolean, default: false },
    loans: { type: Boolean, default: true },
    ussd: { type: Boolean, default: true },
    corporateBanking: { type: Boolean, default: false },
  },
  
  // MIFOS Configuration
  mifos: {
    baseUrl: { type: String, required: true },
    tenantId: { type: String, required: true },
    username: String,
    password: String, // Encrypted
  },
  
  // Payment Provider Credentials (Encrypted)
  integrations: {
    selcom: {
      enabled: { type: Boolean, default: false },
      apiKey: String,
      apiSecret: String,
      vendorId: String,
    },
    tips: {
      enabled: { type: Boolean, default: false },
      institutionCode: String,
      apiKey: String,
    },
    gepg: {
      enabled: { type: Boolean, default: false },
      spCode: String,
      apiKey: String,
    },
    visa: {
      enabled: { type: Boolean, default: false },
      merchantId: String,
      apiKey: String,
      sharedSecret: String,
    },
  },
  
  // Limits
  limits: {
    maxTransferAmount: { type: Number, default: 10000000 },
    dailyTransferLimit: { type: Number, default: 50000000 },
    maxBillPayment: { type: Number, default: 5000000 },
  },
  
  // Contact
  support: {
    phone: String,
    email: String,
    whatsapp: String,
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

module.exports = mongoose.model('Tenant', tenantSchema);
```

## Payment Service Architecture

### Payment Orchestrator

```javascript
// payment-service/src/orchestrator/PaymentOrchestrator.js

const SelcomAdapter = require('../adapters/SelcomAdapter');
const TIPSAdapter = require('../adapters/TIPSAdapter');
const GEPGAdapter = require('../adapters/GEPGAdapter');

class PaymentOrchestrator {
  constructor(tenant) {
    this.tenant = tenant;
    this.adapters = this._initializeAdapters();
  }
  
  _initializeAdapters() {
    const adapters = {};
    
    if (this.tenant.integrations.selcom?.enabled) {
      adapters.selcom = new SelcomAdapter(this.tenant.integrations.selcom);
    }
    if (this.tenant.integrations.tips?.enabled) {
      adapters.tips = new TIPSAdapter(this.tenant.integrations.tips);
    }
    if (this.tenant.integrations.gepg?.enabled) {
      adapters.gepg = new GEPGAdapter(this.tenant.integrations.gepg);
    }
    
    return adapters;
  }
  
  async payBill(billType, details) {
    if (!this.adapters.selcom) {
      throw new Error('Bill payments not enabled for this tenant');
    }
    return this.adapters.selcom.payBill(billType, details);
  }
  
  async transferViaTIPS(details) {
    if (!this.adapters.tips) {
      throw new Error('TIPS transfers not enabled for this tenant');
    }
    return this.adapters.tips.transfer(details);
  }
  
  async payGovernment(details) {
    if (!this.adapters.gepg) {
      throw new Error('GEPG payments not enabled for this tenant');
    }
    return this.adapters.gepg.createPayment(details);
  }
}

module.exports = PaymentOrchestrator;
```

## Card Service Architecture

### VISA Integration

```javascript
// card-service/src/visa/VisaSDK.js

const axios = require('axios');
const crypto = require('crypto');

class VisaSDK {
  constructor(config) {
    this.merchantId = config.merchantId;
    this.apiKey = config.apiKey;
    this.sharedSecret = config.sharedSecret;
    this.baseUrl = config.sandbox 
      ? 'https://sandbox.api.visa.com'
      : 'https://api.visa.com';
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`,
      },
    });
  }
  
  /**
   * Tokenize a card (for secure storage)
   */
  async tokenizeCard(cardDetails) {
    const response = await this.client.post('/vts/v1/tokens', {
      panData: {
        accountNumber: cardDetails.pan,
        expirationDate: {
          month: cardDetails.expiryMonth,
          year: cardDetails.expiryYear,
        },
      },
      tokenType: 'CHIP',
      clientWalletAccountId: cardDetails.walletId,
    });
    
    return {
      token: response.data.vToken,
      last4: cardDetails.pan.slice(-4),
      expiryMonth: cardDetails.expiryMonth,
      expiryYear: cardDetails.expiryYear,
      cardType: this._detectCardType(cardDetails.pan),
    };
  }
  
  /**
   * Get card details for display (masked)
   */
  async getTokenDetails(token) {
    const response = await this.client.get(`/vts/v1/tokens/${token}`);
    return response.data;
  }
  
  /**
   * Generate cryptogram for tap-to-pay
   */
  async generateTapCryptogram(token, amount, merchantId) {
    const response = await this.client.post('/vts/v1/tokens/cryptogram', {
      vToken: token,
      transactionAmount: amount,
      merchantId: merchantId,
      cryptogramType: 'UCAF',
    });
    
    return response.data.cryptogram;
  }
  
  /**
   * Process online payment
   */
  async processPayment(paymentDetails) {
    const response = await this.client.post('/cybersource/payments', {
      paymentInformation: {
        tokenizedCard: {
          number: paymentDetails.token,
          transactionType: '1',
        },
      },
      orderInformation: {
        amountDetails: {
          totalAmount: paymentDetails.amount,
          currency: 'TZS',
        },
      },
      processingInformation: {
        capture: true,
      },
    });
    
    return {
      transactionId: response.data.id,
      status: response.data.status,
      authCode: response.data.processorInformation?.authorizationCode,
    };
  }
  
  _detectCardType(pan) {
    if (/^4/.test(pan)) return 'VISA';
    if (/^5[1-5]/.test(pan)) return 'MASTERCARD';
    if (/^3[47]/.test(pan)) return 'AMEX';
    return 'UNKNOWN';
  }
}

module.exports = VisaSDK;
```

## Frontend Multi-Tenancy

### Tenant Theme Provider

```jsx
// web-portal/src/context/TenantContext.jsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const TenantContext = createContext(null);

export const TenantProvider = ({ children }) => {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadTenant = async () => {
      try {
        // Extract tenant from subdomain
        const subdomain = window.location.hostname.split('.')[0];
        
        // Fetch tenant config
        const response = await fetch(`/api/v1/tenant/config`);
        const data = await response.json();
        
        setTenant(data.data);
      } catch (error) {
        console.error('Failed to load tenant', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadTenant();
  }, []);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  // Create MUI theme from tenant config
  const theme = createTheme({
    palette: {
      primary: {
        main: tenant?.branding?.primaryColor || '#1E3A8A',
      },
      secondary: {
        main: tenant?.branding?.secondaryColor || '#10B981',
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
    },
  });
  
  return (
    <TenantContext.Provider value={tenant}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const tenant = useContext(TenantContext);
  if (!tenant) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return tenant;
};

// Feature flag hook
export const useFeature = (featureName) => {
  const tenant = useTenant();
  return tenant?.features?.[featureName] ?? false;
};
```

### Feature-Gated Components

```jsx
// Usage in components
const PaymentOptions = () => {
  const hasBillPayments = useFeature('billPayments');
  const hasCards = useFeature('cardManagement');
  const hasGEPG = useFeature('gepg');
  
  return (
    <Grid container spacing={2}>
      {hasBillPayments && (
        <Grid item>
          <BillPaymentCard />
        </Grid>
      )}
      {hasCards && (
        <Grid item>
          <CardManagementCard />
        </Grid>
      )}
      {hasGEPG && (
        <Grid item>
          <GovernmentPaymentsCard />
        </Grid>
      )}
    </Grid>
  );
};
```

## Integration Summary

| Integration | Service | Adapter | Features |
|-------------|---------|---------|----------|
| **Selcom** | payment-service | SelcomAdapter | LUKU, DSTV, Water, Airtime |
| **TIPS** | payment-service | TIPSAdapter | Bank transfers, Mobile money |
| **GEPG** | payment-service | GEPGAdapter | Tax, Fees, Government services |
| **VISA** | card-service | VisaSDK | Tokenization, Tap-to-Pay, Online payments |
| **MIFOS** | core-banking | MifosClient | Accounts, Loans, Transactions |

## Security Considerations

1. **PCI-DSS Compliance** for card handling
2. **Encryption at rest** for sensitive credentials
3. **Tenant isolation** in all database queries
4. **API key rotation** per tenant
5. **Audit logging** for all transactions
