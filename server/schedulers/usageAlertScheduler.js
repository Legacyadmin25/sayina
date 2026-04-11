/**
 * Scheduler for checking usage thresholds and sending notifications
 * Runs daily at midnight to check if organizations are approaching their usage limits
 */
let cron;
try {
  cron = require('node-cron');
} catch (e) {
  console.warn('[usageAlertScheduler] node-cron not available — scheduled jobs disabled');
}
const { checkUsageThresholds } = require('../controllers/billingController');
const logger = require('../config/winston');

// Schedule the job to run daily at midnight
const scheduleUsageAlerts = () => {
  logger.info('Scheduling usage alert checks');

  if (cron) {
    // Run at midnight every day (0 0 * * *)
    cron.schedule('0 0 * * *', async () => {
      logger.info('Running scheduled usage threshold check');
      try {
        const result = await checkUsageThresholds();
        if (result.success) {
          logger.info('Scheduled usage threshold check completed successfully');
        } else {
          logger.error('Scheduled usage threshold check failed', result.error);
        }
      } catch (error) {
        logger.error('Error in scheduled usage threshold check:', error);
      }
    });
  }
  
  // Also check once on server startup to catch any alerts that might have been missed
  // during server downtime
  setTimeout(async () => {
    try {
      logger.info('Running initial usage threshold check on server startup');
      await checkUsageThresholds();
    } catch (error) {
      logger.error('Error in initial usage threshold check:', error);
    }
  }, 5000); // Wait 5 seconds after server start to allow other services to initialize
};

module.exports = { scheduleUsageAlerts };
