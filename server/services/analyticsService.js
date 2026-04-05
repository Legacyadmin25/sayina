/**
 * Analytics Service
 * 
 * This service provides analytics and reporting functionality for the Sayina E-Signature platform,
 * including envelope, signer, document, and organization-level metrics.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

/**
 * Get envelope analytics
 * @param {string} orgId - Organization ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Envelope analytics
 */
const getEnvelopeAnalytics = async (orgId, options = {}) => {
  try {
    const { 
      startDate, 
      endDate,
      period = 'month' // day, week, month, year
    } = options;
    
    // Build date filter
    let dateFilter = {};
    if (startDate) {
      dateFilter.created_at = dateFilter.created_at || {};
      dateFilter.created_at['>='] = new Date(startDate);
    }
    if (endDate) {
      dateFilter.created_at = dateFilter.created_at || {};
      dateFilter.created_at['<='] = new Date(endDate);
    }
    
    // Get total envelopes
    const totalEnvelopes = await db('envelopes')
      .where('org_id', orgId)
      .where(dateFilter)
      .count('id as count')
      .first();
    
    // Get envelopes by status
    const envelopesByStatus = await db('envelopes')
      .where('org_id', orgId)
      .where(dateFilter)
      .select('status')
      .count('id as count')
      .groupBy('status');
    
    // Get average completion time
    const completedEnvelopes = await db('envelopes')
      .where('org_id', orgId)
      .where('status', 'completed')
      .where(dateFilter)
      .select(
        db.raw('AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_completion_time')
      )
      .first();
    
    // Get envelope trend data
    let trendQuery;
    switch (period) {
      case 'day':
        trendQuery = db.raw(`
          SELECT 
            DATE_TRUNC('day', created_at) as period,
            COUNT(id) as count
          FROM envelopes
          WHERE org_id = ?
          GROUP BY period
          ORDER BY period
        `, [orgId]);
        break;
      case 'week':
        trendQuery = db.raw(`
          SELECT 
            DATE_TRUNC('week', created_at) as period,
            COUNT(id) as count
          FROM envelopes
          WHERE org_id = ?
          GROUP BY period
          ORDER BY period
        `, [orgId]);
        break;
      case 'year':
        trendQuery = db.raw(`
          SELECT 
            DATE_TRUNC('year', created_at) as period,
            COUNT(id) as count
          FROM envelopes
          WHERE org_id = ?
          GROUP BY period
          ORDER BY period
        `, [orgId]);
        break;
      case 'month':
      default:
        trendQuery = db.raw(`
          SELECT 
            DATE_TRUNC('month', created_at) as period,
            COUNT(id) as count
          FROM envelopes
          WHERE org_id = ?
          GROUP BY period
          ORDER BY period
        `, [orgId]);
    }
    
    const envelopeTrend = await trendQuery;
    
    // Format response
    return {
      total_envelopes: totalEnvelopes.count || 0,
      by_status: envelopesByStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      avg_completion_time: completedEnvelopes?.avg_completion_time 
        ? Math.round(completedEnvelopes.avg_completion_time) 
        : 0,
      trend: envelopeTrend.rows || []
    };
  } catch (error) {
    console.error('Error getting envelope analytics:', error);
    throw error;
  }
};

/**
 * Get signer analytics
 * @param {string} orgId - Organization ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Signer analytics
 */
const getSignerAnalytics = async (orgId, options = {}) => {
  try {
    const { startDate, endDate } = options;
    
    // Build date filter
    let dateFilter = {};
    if (startDate) {
      dateFilter.created_at = dateFilter.created_at || {};
      dateFilter.created_at['>='] = new Date(startDate);
    }
    if (endDate) {
      dateFilter.created_at = dateFilter.created_at || {};
      dateFilter.created_at['<='] = new Date(endDate);
    }
    
    // Get total signers
    const totalSigners = await db('signers')
      .where('org_id', orgId)
      .where(dateFilter)
      .count('id as count')
      .first();
    
    // Get signers by status
    const signersByStatus = await db('signers')
      .where('org_id', orgId)
      .where(dateFilter)
      .select('status')
      .count('id as count')
      .groupBy('status');
    
    // Get average time to sign
    const signedDocuments = await db('signers')
      .where('org_id', orgId)
      .where('status', 'completed')
      .where(dateFilter)
      .select(
        db.raw('AVG(EXTRACT(EPOCH FROM (signed_at - first_viewed_at))) as avg_time_to_sign')
      )
      .first();
    
    // Get conversion rate (viewed to signed)
    const viewedSigners = await db('signers')
      .where('org_id', orgId)
      .whereNotNull('first_viewed_at')
      .where(dateFilter)
      .count('id as count')
      .first();
    
    const completedSigners = await db('signers')
      .where('org_id', orgId)
      .where('status', 'completed')
      .where(dateFilter)
      .count('id as count')
      .first();
    
    const conversionRate = viewedSigners.count > 0 
      ? (completedSigners.count / viewedSigners.count) * 100 
      : 0;
    
    // Get device breakdown
    const deviceBreakdown = await db('signing_sessions')
      .join('signers', 'signing_sessions.signer_id', 'signers.id')
      .where('signers.org_id', orgId)
      .where(dateFilter)
      .select('device_type')
      .count('signing_sessions.id as count')
      .groupBy('device_type');
    
    // Format response
    return {
      total_signers: totalSigners.count || 0,
      by_status: signersByStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      avg_time_to_sign: signedDocuments?.avg_time_to_sign 
        ? Math.round(signedDocuments.avg_time_to_sign) 
        : 0,
      conversion_rate: parseFloat(conversionRate.toFixed(2)),
      device_breakdown: deviceBreakdown.reduce((acc, item) => {
        acc[item.device_type || 'unknown'] = parseInt(item.count);
        return acc;
      }, {})
    };
  } catch (error) {
    console.error('Error getting signer analytics:', error);
    throw error;
  }
};

/**
 * Get document analytics
 * @param {string} orgId - Organization ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Document analytics
 */
const getDocumentAnalytics = async (orgId, options = {}) => {
  try {
    const { startDate, endDate } = options;
    
    // Build date filter
    let dateFilter = {};
    if (startDate) {
      dateFilter.created_at = dateFilter.created_at || {};
      dateFilter.created_at['>='] = new Date(startDate);
    }
    if (endDate) {
      dateFilter.created_at = dateFilter.created_at || {};
      dateFilter.created_at['<='] = new Date(endDate);
    }
    
    // Get total documents
    const totalDocuments = await db('documents')
      .where('org_id', orgId)
      .where(dateFilter)
      .count('id as count')
      .first();
    
    // Get documents by type
    const documentsByType = await db('documents')
      .where('org_id', orgId)
      .where(dateFilter)
      .select('file_type')
      .count('id as count')
      .groupBy('file_type');
    
    // Get average document size
    const avgDocumentSize = await db('documents')
      .where('org_id', orgId)
      .where(dateFilter)
      .avg('file_size as avg_size')
      .first();
    
    // Get document count by month
    const documentsByMonth = await db.raw(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(id) as count
      FROM documents
      WHERE org_id = ?
      GROUP BY month
      ORDER BY month
    `, [orgId]);
    
    // Format response
    return {
      total_documents: totalDocuments.count || 0,
      by_type: documentsByType.reduce((acc, item) => {
        const fileType = item.file_type || 'unknown';
        const simplifiedType = fileType.split('/')[1] || fileType;
        acc[simplifiedType] = parseInt(item.count);
        return acc;
      }, {}),
      avg_size: avgDocumentSize?.avg_size 
        ? Math.round(avgDocumentSize.avg_size / 1024) // Convert to KB
        : 0,
      by_month: documentsByMonth.rows || []
    };
  } catch (error) {
    console.error('Error getting document analytics:', error);
    throw error;
  }
};

/**
 * Get organization usage analytics
 * @param {string} orgId - Organization ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} - Usage analytics
 */
const getUsageAnalytics = async (orgId, options = {}) => {
  try {
    // Get subscription info
    const subscription = await db('subscriptions')
      .where('org_id', orgId)
      .orderBy('created_at', 'desc')
      .first();
    
    // Get current month's usage
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);
    
    const currentMonthEnvelopes = await db('envelopes')
      .where('org_id', orgId)
      .where('created_at', '>=', currentMonthStart)
      .count('id as count')
      .first();
    
    // Get SMS credit usage
    const smsCredits = await db('sms_credits')
      .where('org_id', orgId)
      .select('remaining_credits')
      .first();
    
    const smsUsage = await db('sms_logs')
      .where('org_id', orgId)
      .where('created_at', '>=', currentMonthStart)
      .count('id as count')
      .first();
    
    // Calculate storage usage
    const storageUsage = await db.raw(`
      SELECT SUM(file_size) as total_size
      FROM documents
      WHERE org_id = ?
    `, [orgId]);
    
    // Format response
    return {
      subscription: subscription ? {
        plan: subscription.plan_name,
        status: subscription.status,
        renewal_date: subscription.renewal_date
      } : null,
      current_month_usage: {
        envelopes: parseInt(currentMonthEnvelopes.count) || 0,
        envelope_limit: subscription?.envelope_limit || 0,
        usage_percentage: subscription?.envelope_limit 
          ? Math.round((parseInt(currentMonthEnvelopes.count) / subscription.envelope_limit) * 100) 
          : 0
      },
      sms_credits: {
        remaining: smsCredits?.remaining_credits || 0,
        used_this_month: parseInt(smsUsage.count) || 0
      },
      storage: {
        used_bytes: parseInt(storageUsage.rows[0]?.total_size) || 0,
        used_mb: Math.round((parseInt(storageUsage.rows[0]?.total_size) || 0) / (1024 * 1024)),
        limit_mb: subscription?.storage_limit_mb || 0
      }
    };
  } catch (error) {
    console.error('Error getting usage analytics:', error);
    throw error;
  }
};

/**
 * Get dashboard summary
 * @param {string} orgId - Organization ID
 * @returns {Promise<Object>} - Dashboard summary
 */
const getDashboardSummary = async (orgId) => {
  try {
    // Get recent activity
    const recentActivity = await db.raw(`
      (SELECT 
        'envelope' as type,
        id,
        name,
        status,
        created_at,
        updated_at
      FROM envelopes
      WHERE org_id = ?
      ORDER BY updated_at DESC
      LIMIT 5)
      
      UNION ALL
      
      (SELECT 
        'document' as type,
        id,
        name,
        status,
        created_at,
        updated_at
      FROM documents
      WHERE org_id = ?
      ORDER BY updated_at DESC
      LIMIT 5)
      
      ORDER BY updated_at DESC
      LIMIT 10
    `, [orgId, orgId]);
    
    // Get envelope counts by status
    const envelopeCounts = await db('envelopes')
      .where('org_id', orgId)
      .select('status')
      .count('id as count')
      .groupBy('status');
    
    // Get pending signatures count
    const pendingSignatures = await db('signers')
      .where('org_id', orgId)
      .where('status', 'sent')
      .count('id as count')
      .first();
    
    // Get completed signatures count
    const completedSignatures = await db('signers')
      .where('org_id', orgId)
      .where('status', 'completed')
      .count('id as count')
      .first();
    
    // Format response
    return {
      recent_activity: recentActivity.rows || [],
      envelope_counts: envelopeCounts.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      signature_counts: {
        pending: parseInt(pendingSignatures.count) || 0,
        completed: parseInt(completedSignatures.count) || 0
      }
    };
  } catch (error) {
    console.error('Error getting dashboard summary:', error);
    throw error;
  }
};

/**
 * Generate analytics report
 * @param {string} orgId - Organization ID
 * @param {string} reportType - Report type
 * @param {Object} options - Report options
 * @returns {Promise<Object>} - Report data
 */
const generateAnalyticsReport = async (orgId, reportType, options = {}) => {
  try {
    const { startDate, endDate } = options;
    
    let reportData = {};
    
    switch (reportType) {
      case 'envelope':
        reportData = await getEnvelopeAnalytics(orgId, { startDate, endDate });
        break;
      case 'signer':
        reportData = await getSignerAnalytics(orgId, { startDate, endDate });
        break;
      case 'document':
        reportData = await getDocumentAnalytics(orgId, { startDate, endDate });
        break;
      case 'usage':
        reportData = await getUsageAnalytics(orgId, { startDate, endDate });
        break;
      case 'dashboard':
      default:
        reportData = await getDashboardSummary(orgId);
    }
    
    // Create report record
    const reportId = uuidv4();
    await db('analytics_reports').insert({
      id: reportId,
      org_id: orgId,
      report_type: reportType,
      parameters: JSON.stringify({ startDate, endDate }),
      results: JSON.stringify(reportData),
      created_at: db.fn.now()
    });
    
    return {
      report_id: reportId,
      report_type: reportType,
      data: reportData
    };
  } catch (error) {
    console.error('Error generating analytics report:', error);
    throw error;
  }
};

/**
 * Get saved reports
 * @param {string} orgId - Organization ID
 * @returns {Promise<Array>} - Saved reports
 */
const getSavedReports = async (orgId) => {
  try {
    const reports = await db('analytics_reports')
      .where('org_id', orgId)
      .orderBy('created_at', 'desc');
    
    return reports.map(report => ({
      id: report.id,
      report_type: report.report_type,
      parameters: JSON.parse(report.parameters),
      created_at: report.created_at
    }));
  } catch (error) {
    console.error('Error getting saved reports:', error);
    throw error;
  }
};

/**
 * Get report by ID
 * @param {string} reportId - Report ID
 * @returns {Promise<Object>} - Report data
 */
const getReportById = async (reportId) => {
  try {
    const report = await db('analytics_reports')
      .where('id', reportId)
      .first();
    
    if (!report) {
      throw new Error('Report not found');
    }
    
    return {
      id: report.id,
      org_id: report.org_id,
      report_type: report.report_type,
      parameters: JSON.parse(report.parameters),
      data: JSON.parse(report.results),
      created_at: report.created_at
    };
  } catch (error) {
    console.error('Error getting report by ID:', error);
    throw error;
  }
};

module.exports = {
  getEnvelopeAnalytics,
  getSignerAnalytics,
  getDocumentAnalytics,
  getUsageAnalytics,
  getDashboardSummary,
  generateAnalyticsReport,
  getSavedReports,
  getReportById
};
