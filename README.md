# MiraDigital - Multi-Channel Digital Banking Platform

A comprehensive digital banking platform enabling retail and corporate customers to access MIFOS/Fineract core banking services through Web, Mobile App, and USSD channels.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                 │
├───────────────┬───────────────┬───────────────┬────────────────┤
│  Web Portal   │  Mobile App   │     USSD      │  (Future)      │
│  (React)      │ (React Native)│   (Node.js)   │                │
└───────┬───────┴───────┬───────┴───────┬───────┴────────────────┘
        │               │               │
        ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (Express.js)                   │
│                      Port: 4000                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MIFOS CONNECTOR SERVICE                       │
│                   (Fineract API Integration)                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              MIFOS/FINERACT (135.181.33.13:8443)                │
│              Tenant: zedone-uat                                 │
│              Version: mutandaguta/miracore-fineract:0.0.8       │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
MiraDigital/
├── api-gateway/          # Central API Gateway (Express.js)
├── mifos-connector/      # MIFOS/Fineract Integration Service
├── payment-service/      # Payment Integrations (Selcom, TIPS, GEPG)
├── card-service/         # VISA SDK Integration (Cards, Tap-to-Pay)
├── tenant-service/       # Multi-Tenant Management
├── web-portal/           # React Web Application
├── mobile-app/           # React Native Mobile Application
├── ussd-gateway/         # USSD Gateway Service
├── shared/               # Shared utilities, types, constants
├── database/             # MongoDB schemas & migrations
└── docs/                 # Documentation
```

## 🔧 Technology Stack

| Component | Technology |
|-----------|------------|
| API Gateway | Node.js + Express |
| MIFOS Connector | Node.js + Axios |
| Payment Service | Node.js (Selcom, TIPS, GEPG) |
| Card Service | Node.js + VISA SDK |
| Web Portal | React.js + Material UI |
| Mobile App | React Native |
| Database | MongoDB (sessions, audit) |
| Cache | Redis (sessions, OTP) |
| Core Banking | MIFOS/Fineract 1.11 |

## 🏢 Multi-Tenancy Architecture

The platform supports multiple tenants (banks/institutions) with:
- **Tenant Isolation**: Each tenant has isolated data and configurations
- **Custom Branding**: Logo, colors, theme per tenant
- **Feature Toggles**: Enable/disable features per tenant
- **Integration Configuration**: Separate API keys per tenant
- **Rate Limiting**: Per-tenant rate limits

## 💳 Payment Integrations

| Provider | Purpose | Features |
|----------|---------|----------|
| **Selcom** | Bill Payments | Utility bills, airtime, subscriptions |
| **TIPS** | Bank Transfers | Bank-to-bank, mobile money |
| **GEPG** | Government | Taxes, fees, licenses |
| **VISA SDK** | Cards | Tokenization, tap-to-pay, online payments |

## 🖥️ Server Configuration

| Server | IP | Purpose |
|--------|-----|---------|
| MiraDigital | 5.75.185.137 | Digital Platform (Web, Mobile API, USSD) |
| MIFOS | 135.181.33.13 | Core Banking (Fineract API) |

## 📱 Channel Access

| Channel | Retail | Corporate |
|---------|--------|-----------|
| Web Portal | ✅ | ✅ |
| Mobile App | ✅ | ❌ |
| USSD | ✅ | ❌ |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- MongoDB 6+
- Redis 7+

### Development Setup

```bash
# Clone repository
git clone https://github.com/your-org/MiraDigital.git
cd MiraDigital

# Install dependencies for all packages
npm run install:all

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Start development servers
npm run dev
```

### Windows Local Development (Laragon)

```powershell
cd C:\laragon\www
git clone user@5.75.185.137:/opt/middleware/MiraDigital.git
cd MiraDigital
npm run install:all
npm run dev
```

## 📋 Environment Variables

```env
# API Gateway
NODE_ENV=development
PORT=4000
JWT_SECRET=your-super-secret-key
JWT_EXPIRY=24h

# MIFOS Configuration
MIFOS_BASE_URL=https://135.181.33.13:8443/fineract-provider/api/v1
MIFOS_TENANT_ID=zedone-uat
MIFOS_USERNAME=api_user
MIFOS_PASSWORD=secure_password

# Database
MONGODB_URI=mongodb://localhost:27017/miradigital

# Cache
REDIS_URL=redis://localhost:6379
```

## 🔐 Security

- JWT-based authentication
- PIN/Password for customers
- OTP verification for transactions
- Rate limiting
- HTTPS/TLS encryption
- Audit logging

## 📅 Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1 | Weeks 1-2 | API Gateway, MIFOS Connector, Auth |
| Phase 2 | Weeks 3-4 | Core Features (Accounts, Loans, Transfers) |
| Phase 3 | Weeks 5-6 | Web Portal MVP |
| Phase 4 | Weeks 7-8 | Mobile App |
| Phase 5 | Post-launch | USSD Integration |

**Target Go-Live:** January 30, 2026

## 📚 Documentation

- [API Documentation](./docs/API.md)
- [MIFOS Integration Guide](./docs/MIFOS_INTEGRATION.md)
- [Mobile App Wireframes](./docs/MOBILE_WIREFRAMES.md)
- [Security Guide](./docs/SECURITY.md)

## 📞 Support

For support, contact the development team.

---

*MiraDigital - Empowering Digital Banking*
