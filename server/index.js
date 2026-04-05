const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const { loggerMiddleware, responseCapture, errorLogger } = require('./middleware/loggerMiddleware');
const logger = require('./config/winston');
const { db } = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const organizationRoutes = require('./routes/organizationRoutes');
const envelopeRoutes = require('./routes/envelopeRoutes');
const documentRoutes = require('./routes/documentRoutes');
const fieldRoutes = require('./routes/fieldRoutes');
const signerRoutes = require('./routes/signerRoutes');
const otpRoutes = require('./routes/otpRoutes');
const billingRoutes = require('./routes/billingRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const apiKeyRoutes = require('./routes/apiKeyRoutes');
const templateRoutes = require('./routes/templateRoutes');
const auditRoutes = require('./routes/auditRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const confirmationRoutes = require('./routes/confirmationRoutes');
const signedDocumentRoutes = require('./routes/signedDocumentRoutes');

// Import schedulers
const { scheduleUsageAlerts } = require('./schedulers/usageAlertScheduler');
const commentRoutes = require('./routes/commentRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const reportRoutes = require('./routes/reportRoutes');
const webhookConfigRoutes = require('./routes/webhookConfigRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const bulkOperationsRoutes = require('./routes/bulkOperationsRoutes');
const documentComparisonRoutes = require('./routes/documentComparisonRoutes');
const accessibilityRoutes = require('./routes/accessibilityRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const complianceRoutes = require('./routes/complianceRoutes');
const retentionPolicyRoutes = require('./routes/retentionPolicyRoutes');
const versionControlRoutes = require('./routes/versionControlRoutes');
const collaborationRoutes = require('./routes/collaborationRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const templateLibraryRoutes = require('./routes/templateLibraryRoutes');
const batchRoutes = require('./routes/batchRoutes');
const documentSecurityRoutes = require('./routes/documentSecurityRoutes');
const fieldManagementRoutes = require('./routes/fieldManagementRoutes');
const mobileOptimizationRoutes = require('./routes/mobileOptimizationRoutes');
const saComplianceRoutes = require('./routes/saComplianceRoutes');
const apiEnhancementRoutes = require('./routes/apiEnhancementRoutes');
const biometricAuthRoutes = require('./routes/biometricAuthRoutes');
const offlineSigningRoutes = require('./routes/offlineSigningRoutes');
const localizationRoutes = require('./routes/localizationRoutes');
const aiDocumentRoutes = require('./routes/aiDocumentRoutes');
const blockchainVerificationRoutes = require('./routes/blockchainVerificationRoutes');
const enterpriseIntegrationRoutes = require('./routes/enterpriseIntegrationRoutes');
const regulatoryComplianceRoutes = require('./routes/regulatoryComplianceRoutes');
const customerSuccessRoutes = require('./routes/customerSuccessRoutes');
const tempKeyRoutes = require('./routes/tempKeyRoutes');

// Initialize Express app
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));
app.use(express.json({ limit: '50mb' })); // Parse JSON requests
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Parse URL-encoded requests
app.use(loggerMiddleware); // Request logging
app.use(responseCapture); // Capture response for logging

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Database connection check
app.get('/api/v1/db-health', async (req, res) => {
  try {
    await db.raw('SELECT 1');
    res.status(200).json({
      status: 'connected',
      message: 'Database connection is healthy'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/organizations', organizationRoutes);
app.use('/api/v1/envelopes', envelopeRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/fields', fieldRoutes);
app.use('/api/v1/signers', signerRoutes);
app.use('/api/v1/otp', otpRoutes);
app.use('/api/v1/billing', billingRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/api-keys', apiKeyRoutes);
app.use('/api/v1/templates', templateRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/confirmations', confirmationRoutes);
app.use('/api/v1/signed-documents', signedDocumentRoutes);
app.use('/api/v1/comments', commentRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/webhooks/config', webhookConfigRoutes);
app.use('/api/v1/integrations', integrationRoutes);
app.use('/api/v1/bulk', bulkOperationsRoutes);
app.use('/api/v1/documents/compare', documentComparisonRoutes);
app.use('/api/v1/accessibility', accessibilityRoutes);
app.use('/api/v1/certificates', certificateRoutes);
app.use('/api/v1/compliance', complianceRoutes);
app.use('/api/v1/retention', retentionPolicyRoutes);
app.use('/api/v1/versions', versionControlRoutes);
app.use('/api/v1/collaboration', collaborationRoutes);
app.use('/api/v1/workflows', workflowRoutes);
app.use('/api/v1/templates/library', templateLibraryRoutes);
app.use('/api/v1/batch', batchRoutes);
app.use('/api/v1', documentSecurityRoutes);
app.use('/api/v1/fields', fieldManagementRoutes);
app.use('/api/v1/mobile', mobileOptimizationRoutes);
app.use('/api/v1/compliance', saComplianceRoutes);
app.use('/api/v1/developer', apiEnhancementRoutes);
app.use('/api/v1/biometric', biometricAuthRoutes);
app.use('/api/v1/offline', offlineSigningRoutes);
app.use('/api/v1/localization', localizationRoutes);
app.use('/api/v1/ai', aiDocumentRoutes);
app.use('/api/v1/blockchain', blockchainVerificationRoutes);
app.use('/api/v1/enterprise', enterpriseIntegrationRoutes);
app.use('/api/v1/regulatory', regulatoryComplianceRoutes);
app.use('/api/v1/customer-success', customerSuccessRoutes);
app.use('/api/v1/temp-keys', tempKeyRoutes);

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorLogger);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  
  // Initialize schedulers
  scheduleUsageAlerts();
  logger.info('Usage alert scheduler initialized');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

module.exports = app;
