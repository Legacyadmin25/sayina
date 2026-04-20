const { ApiError } = require('../middleware/errorMiddleware');
const { db } = require('../config/db');
const { checkRole } = require('../middleware/authMiddleware');

/**
 * @desc    Get envelope analytics
 * @route   GET /api/v1/analytics/envelopes
 * @access  Private (org_admin)
 */
const getEnvelopeAnalytics = async (req, res, next) => {
  try {
    const { 
      start_date, 
      end_date, 
      interval = 'day' 
    } = req.query;
    
    const orgId = req.user.org_id;
    
    // Validate dates
    const startDate = start_date ? new Date(start_date) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = end_date ? new Date(end_date) : new Date();
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return next(new ApiError(400, 'Invalid date format'));
    }
    
    // Validate interval
    const validIntervals = ['day', 'week', 'month'];
    if (!validIntervals.includes(interval)) {
      return next(new ApiError(400, 'Invalid interval. Must be day, week, or month'));
    }
    
    // Build date grouping based on interval
    let dateFormat;
    switch (interval) {
      case 'day':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'week':
        dateFormat = 'YYYY-"W"IW'; // ISO week format
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
    }
    
    // Get envelope counts by status and date
    const envelopesByStatus = await db('envelopes')
      .where('org_id', orgId)
      .whereBetween('created_at', [startDate, endDate])
      .select(
        db.raw(`to_char(created_at, '${dateFormat}') as date`),
        'status',
        db.raw('count(*) as count')
      )
      .groupBy('date', 'status')
      .orderBy('date');
    
    // Get envelope counts by date
    const envelopesByDate = await db('envelopes')
      .where('org_id', orgId)
      .whereBetween('created_at', [startDate, endDate])
      .select(
        db.raw(`to_char(created_at, '${dateFormat}') as date`),
        db.raw('count(*) as count')
      )
      .groupBy('date')
      .orderBy('date');
    
    // Get completion rate
    const completionRate = await db.raw(`
      SELECT 
        ROUND(
          (COUNT(*) FILTER (WHERE status = 'completed') * 100.0) / 
          NULLIF(COUNT(*), 0),
          2
        ) as completion_rate
      FROM envelopes
      WHERE org_id = ? AND created_at BETWEEN ? AND ?
    `, [orgId, startDate, endDate]);
    
    // Get average completion time in hours
    const avgCompletionTime = await db.raw(`
      SELECT 
        ROUND(
          AVG(
            EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600
          ),
          2
        ) as avg_completion_time
      FROM envelopes
      WHERE 
        org_id = ? AND 
        created_at BETWEEN ? AND ? AND 
        status = 'completed' AND 
        completed_at IS NOT NULL
    `, [orgId, startDate, endDate]);
    
    // Format data for response
    const formattedData = {
      by_date: envelopesByDate,
      by_status: envelopesByStatus,
      summary: {
        completion_rate: completionRate.rows[0].completion_rate || 0,
        avg_completion_time: avgCompletionTime.rows[0].avg_completion_time || 0
      }
    };
    
    res.status(200).json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get signer analytics
 * @route   GET /api/v1/analytics/signers
 * @access  Private (org_admin)
 */
const getSignerAnalytics = async (req, res, next) => {
  try {
    const { 
      start_date, 
      end_date
    } = req.query;
    
    const orgId = req.user.org_id;
    
    // Validate dates
    const startDate = start_date ? new Date(start_date) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = end_date ? new Date(end_date) : new Date();
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return next(new ApiError(400, 'Invalid date format'));
    }
    
    // Get signers by status
    const signersByStatus = await db('signers')
      .join('envelopes', 'signers.envelope_id', 'envelopes.id')
      .where('envelopes.org_id', orgId)
      .whereBetween('signers.created_at', [startDate, endDate])
      .select('signers.status', db.raw('count(*) as count'))
      .groupBy('signers.status');
    
    // Get average time to sign in hours
    const avgTimeToSign = await db.raw(`
      SELECT 
        ROUND(
          AVG(
            EXTRACT(EPOCH FROM (signed_at - first_viewed_at)) / 3600
          ),
          2
        ) as avg_time_to_sign
      FROM signers
      JOIN envelopes ON signers.envelope_id = envelopes.id
      WHERE 
        envelopes.org_id = ? AND 
        signers.created_at BETWEEN ? AND ? AND 
        signers.status = 'completed' AND 
        signers.signed_at IS NOT NULL AND
        signers.first_viewed_at IS NOT NULL
    `, [orgId, startDate, endDate]);
    
    // Get view to sign conversion rate
    const viewToSignRate = await db.raw(`
      SELECT 
        ROUND(
          (COUNT(*) FILTER (WHERE signers.status = 'completed') * 100.0) / 
          NULLIF(COUNT(*) FILTER (WHERE signers.first_viewed_at IS NOT NULL), 0),
          2
        ) as view_to_sign_rate
      FROM signers
      JOIN envelopes ON signers.envelope_id = envelopes.id
      WHERE 
        envelopes.org_id = ? AND 
        signers.created_at BETWEEN ? AND ?
    `, [orgId, startDate, endDate]);
    
    // Get device breakdown
    const deviceBreakdown = await db.raw(`
      SELECT 
        CASE
          WHEN user_agent LIKE '%Android%' THEN 'Android'
          WHEN user_agent LIKE '%iPhone%' OR user_agent LIKE '%iPad%' OR user_agent LIKE '%iOS%' THEN 'iOS'
          WHEN user_agent LIKE '%Windows%' THEN 'Windows'
          WHEN user_agent LIKE '%Mac%' THEN 'Mac'
          WHEN user_agent LIKE '%Linux%' THEN 'Linux'
          ELSE 'Other'
        END as device,
        COUNT(*) as count
      FROM signers
      JOIN envelopes ON signers.envelope_id = envelopes.id
      WHERE 
        envelopes.org_id = ? AND 
        signers.created_at BETWEEN ? AND ? AND
        signers.user_agent IS NOT NULL
      GROUP BY device
      ORDER BY count DESC
    `, [orgId, startDate, endDate]);
    
    // Format data for response
    const formattedData = {
      by_status: signersByStatus,
      device_breakdown: deviceBreakdown.rows,
      summary: {
        avg_time_to_sign: avgTimeToSign.rows[0].avg_time_to_sign || 0,
        view_to_sign_rate: viewToSignRate.rows[0].view_to_sign_rate || 0
      }
    };
    
    res.status(200).json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get document analytics
 * @route   GET /api/v1/analytics/documents
 * @access  Private (org_admin)
 */
const getDocumentAnalytics = async (req, res, next) => {
  try {
    const { 
      start_date, 
      end_date
    } = req.query;
    
    const orgId = req.user.org_id;
    
    // Validate dates
    const startDate = start_date ? new Date(start_date) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = end_date ? new Date(end_date) : new Date();
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return next(new ApiError(400, 'Invalid date format'));
    }
    
    // Get document count
    const documentCount = await db('documents')
      .where('org_id', orgId)
      .whereBetween('created_at', [startDate, endDate])
      .count('id as count')
      .first();
    
    // Get document types
    const documentTypes = await db('documents')
      .where('org_id', orgId)
      .whereBetween('created_at', [startDate, endDate])
      .select(db.raw("SUBSTRING(file_name FROM '\\.[^.]*$') as extension"), db.raw('count(*) as count'))
      .groupBy('extension')
      .orderBy('count', 'desc');
    
    // Get average document size
    const avgDocumentSize = await db('documents')
      .where('org_id', orgId)
      .whereBetween('created_at', [startDate, endDate])
      .avg('file_size as avg_size')
      .first();
    
    // Get document size distribution
    const sizeDistribution = await db.raw(`
      SELECT 
        CASE
          WHEN file_size < 1048576 THEN 'Less than 1MB'
          WHEN file_size BETWEEN 1048576 AND 5242880 THEN '1MB - 5MB'
          WHEN file_size BETWEEN 5242881 AND 10485760 THEN '5MB - 10MB'
          ELSE 'More than 10MB'
        END as size_range,
        COUNT(*) as count
      FROM documents
      WHERE 
        org_id = ? AND 
        created_at BETWEEN ? AND ?
      GROUP BY size_range
      ORDER BY 
        CASE
          WHEN size_range = 'Less than 1MB' THEN 1
          WHEN size_range = '1MB - 5MB' THEN 2
          WHEN size_range = '5MB - 10MB' THEN 3
          ELSE 4
        END
    `, [orgId, startDate, endDate]);
    
    // Format data for response
    const formattedData = {
      document_count: parseInt(documentCount.count),
      document_types: documentTypes,
      size_distribution: sizeDistribution.rows,
      summary: {
        avg_size: Math.round(avgDocumentSize.avg_size / 1024) // Convert to KB
      }
    };
    
    res.status(200).json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get usage analytics
 * @route   GET /api/v1/analytics/usage
 * @access  Private (org_admin)
 */
const getUsageAnalytics = async (req, res, next) => {
  try {
    const orgId = req.user.org_id;
    
    // Get current subscription
    const subscription = await db('subscriptions')
      .join('subscription_plans', 'subscriptions.plan_id', 'subscription_plans.id')
      .where('subscriptions.org_id', orgId)
      .where('subscriptions.status', 'active')
      .select(
        'subscriptions.*',
        'subscription_plans.name as plan_name',
        'subscription_plans.monthly_envelopes',
        'subscription_plans.max_users',
        'subscription_plans.max_documents'
      )
      .first();
    
    if (!subscription) {
      return next(new ApiError(404, 'No active subscription found'));
    }
    
    // Get current month's envelope count
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    const envelopeCount = await db('envelopes')
      .where('org_id', orgId)
      .where('created_at', '>=', firstDayOfMonth)
      .count('id as count')
      .first();
    
    // Get user count
    const userCount = await db('users')
      .where('org_id', orgId)
      .count('id as count')
      .first();
    
    // Get document count
    const documentCount = await db('documents')
      .where('org_id', orgId)
      .count('id as count')
      .first();
    
    // Get SMS credit usage
    const organization = await db('organizations')
      .where('id', orgId)
      .select('sms_credits')
      .first();
    
    // Get SMS usage history
    const smsUsageHistory = await db('sms_logs')
      .where('org_id', orgId)
      .select(
        db.raw("to_char(created_at, 'YYYY-MM') as month"),
        db.raw('sum(count) as count')
      )
      .groupBy('month')
      .orderBy('month', 'desc')
      .limit(6);
    
    // Format data for response
    const formattedData = {
      subscription: {
        plan_name: subscription.plan_name,
        monthly_envelopes: subscription.monthly_envelopes,
        max_users: subscription.max_users,
        max_documents: subscription.max_documents,
        renewal_date: subscription.renewal_date
      },
      usage: {
        envelopes: {
          used: parseInt(envelopeCount.count),
          limit: subscription.monthly_envelopes,
          percentage: Math.round((parseInt(envelopeCount.count) / subscription.monthly_envelopes) * 100)
        },
        users: {
          used: parseInt(userCount.count),
          limit: subscription.max_users,
          percentage: Math.round((parseInt(userCount.count) / subscription.max_users) * 100)
        },
        documents: {
          used: parseInt(documentCount.count),
          limit: subscription.max_documents,
          percentage: Math.round((parseInt(documentCount.count) / subscription.max_documents) * 100)
        },
        sms_credits: {
          remaining: organization.sms_credits,
          usage_history: smsUsageHistory
        }
      }
    };
    
    res.status(200).json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get organization dashboard summary
 * @route   GET /api/v1/analytics/dashboard
 * @access  Private (org_admin)
 */
const getDashboardSummary = async (req, res, next) => {
  try {
    const orgId = req.user.org_id;
    
    // Get envelope counts by status
    const envelopesByStatus = await db('envelopes')
      .where('org_id', orgId)
      .select('status', db.raw('count(*) as count'))
      .groupBy('status');
    
    // Get recent envelopes
    const recentEnvelopes = await db('envelopes')
      .join('users', 'envelopes.created_by', 'users.id')
      .where('envelopes.org_id', orgId)
      .select(
        'envelopes.id',
        'envelopes.name',
        'envelopes.status',
        'envelopes.created_at',
        'users.first_name',
        'users.last_name'
      )
      .orderBy('envelopes.created_at', 'desc')
      .limit(5);
    
    // Get pending signatures
    const pendingSignatures = await db('signers')
      .join('envelopes', 'signers.envelope_id', 'envelopes.id')
      .where('envelopes.org_id', orgId)
      .where('signers.status', 'pending')
      .whereNotIn('signers.role', ['cc', 'viewer'])
      .select(
        'signers.id',
        'signers.first_name',
        'signers.last_name',
        'signers.email',
        'signers.created_at',
        'envelopes.id as envelope_id',
        'envelopes.name as envelope_name'
      )
      .orderBy('signers.created_at', 'desc')
      .limit(5);
    
    // Get user activity
    const userActivity = await db('system_logs')
      .leftJoin('users', 'system_logs.user_id', 'users.id')
      .where(function() {
        this.where('users.org_id', orgId).orWhereNull('system_logs.user_id');
      })
      .select(
        'system_logs.id',
        'system_logs.action',
        'system_logs.created_at',
        'users.id as user_id',
        'users.first_name',
        'users.last_name'
      )
      .orderBy('system_logs.created_at', 'desc')
      .limit(10);
    
    // Format activity logs
    const formattedActivity = userActivity.map(activity => ({
      id: activity.id,
      action: activity.action,
      created_at: activity.created_at,
      user: {
        id: activity.user_id,
        name: `${activity.first_name} ${activity.last_name}`
      },
      metadata: JSON.parse(activity.metadata || '{}')
    }));
    
    // Format data for response
    const formattedData = {
      envelope_counts: envelopesByStatus,
      recent_envelopes: recentEnvelopes.map(envelope => ({
        id: envelope.id,
        name: envelope.name,
        status: envelope.status,
        created_at: envelope.created_at,
        created_by: `${envelope.first_name} ${envelope.last_name}`
      })),
      pending_signatures: pendingSignatures.map(s => ({
        ...s,
        name: `${s.first_name} ${s.last_name}`.trim(),
      })),
      recent_activity: formattedActivity
    };
    
    res.status(200).json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getEnvelopeAnalytics,
  getSignerAnalytics,
  getDocumentAnalytics,
  getUsageAnalytics,
  getDashboardSummary
};
