require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoose = require('mongoose');
const Redis = require('ioredis');

const config = require('./config');
const logger = require('./utils/logger');
const { generalLimiter, errorHandler, notFoundHandler } = require('./middleware');

// Import models
const User = require('../../database/models/User');
const Audit = require('../../database/models/Audit');

// Import services
const MifosClient = require('../../mifos-connector/src/MifosClient');
const AuthService = require('./services/authService');
const AccountService = require('./services/accountService');
const LoanService = require('./services/loanService');

// Import routes
const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/accounts');
const loanRoutes = require('./routes/loans');
const qrPayRoutes = require('./routes/qrpay');
const onboardingRoutes = require('./routes/onboarding');
const documentsRoutes = require('./routes/documents');

// Initialize Express app
const app = express();

// Trust proxy (for rate limiting behind nginx)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors(config.cors));
app.use(compression());

// Request parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging
app.use(morgan('combined', { stream: logger.stream }));

// Rate limiting
app.use(generalLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Initialize services and routes
async function initializeApp() {
  try {
    // Connect to MongoDB
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    logger.info('MongoDB connected');

    // Initialize Redis
    logger.info('Connecting to Redis...');
    const redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });
    
    redis.on('connect', () => logger.info('Redis connected'));
    redis.on('error', (err) => logger.error('Redis error', { error: err.message }));

    // Initialize MIFOS client
    logger.info('Initializing MIFOS client...');
    const mifosClient = new MifosClient(config.mifos);
    
    // Test MIFOS connection
    const mifosHealth = await mifosClient.healthCheck();
    logger.info('MIFOS health check', mifosHealth);

    // Initialize services
    const authService = new AuthService(mifosClient, User, redis);
    const accountService = new AccountService(mifosClient, Audit);
    const loanService = new LoanService(mifosClient, Audit);

    // Mount routes
    app.use('/api/v1/auth', authRoutes(authService));
    app.use('/api/v1/accounts', accountRoutes(accountService));
    app.use('/api/v1/loans', loanRoutes(loanService));
    app.use('/api/v1/qr-pay', qrPayRoutes(accountService, Audit));
    app.use('/api/v1/onboarding', onboardingRoutes(mifosClient, config));
    app.use('/api/v1/documents', documentsRoutes(config));

    // MIFOS health check endpoint
    app.get('/api/v1/mifos/health', async (req, res) => {
      const health = await mifosClient.healthCheck();
      res.json({ success: true, data: health });
    });

    // 404 handler
    app.use(notFoundHandler);

    // Error handler
    app.use(errorHandler);

    // Start server
    const server = app.listen(config.server.port, config.server.host, () => {
      logger.info(`🚀 MiraDigital API Gateway running on http://${config.server.host}:${config.server.port}`);
      logger.info(`Environment: ${config.server.env}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await mongoose.connection.close();
          logger.info('MongoDB connection closed');
          
          redis.quit();
          logger.info('Redis connection closed');
          
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error: error.message });
          process.exit(1);
        }
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to initialize application', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Start the application
initializeApp();

module.exports = app;
