const { ApiError } = require('../middleware/errorMiddleware');
const { db } = require('../config/db');
const { logSystemEvent } = require('../services/loggerService');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * @desc    Generate envelope activity report
 * @route   GET /api/v1/reports/envelopes/activity
 * @access  Private (org_admin)
 */
const generateEnvelopeActivityReport = async (req, res, next) => {
  try {
    const { 
      start_date, 
      end_date,
      format = 'json'
    } = req.query;
    
    const orgId = req.user.org_id;
    const userId = req.user.id;
    
    // Validate dates
    const startDate = start_date ? new Date(start_date) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = end_date ? new Date(end_date) : new Date();
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return next(new ApiError(400, 'Invalid date format'));
    }
    
    // Get envelope activity
    const envelopeActivity = await db('system_logs')
      .join('users', 'system_logs.user_id', 'users.id')
      .join('envelopes', function() {
        this.on(db.raw("system_logs.metadata->>'envelope_id'"), '=', 'envelopes.id');
      })
      .where('envelopes.org_id', orgId)
      .whereBetween('system_logs.created_at', [startDate, endDate])
      .whereRaw("system_logs.metadata->>'envelope_id' IS NOT NULL")
      .select(
        'system_logs.id',
        'system_logs.action',
        'system_logs.created_at',
        'system_logs.metadata',
        'users.id as user_id',
        'users.first_name',
        'users.last_name',
        'users.email',
        'envelopes.id as envelope_id',
        'envelopes.name as envelope_name'
      )
      .orderBy('system_logs.created_at', 'desc');
    
    // Format data
    const formattedData = envelopeActivity.map(activity => ({
      id: activity.id,
      action: activity.action,
      timestamp: activity.created_at,
      user: {
        id: activity.user_id,
        name: `${activity.first_name} ${activity.last_name}`,
        email: activity.email
      },
      envelope: {
        id: activity.envelope_id,
        name: activity.envelope_name
      },
      metadata: JSON.parse(activity.metadata || '{}')
    }));
    
    // Log report generation
    await logSystemEvent({
      user_id: userId,
      action: 'report_generated',
      metadata: {
        report_type: 'envelope_activity',
        start_date: startDate,
        end_date: endDate
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    // Return based on format
    if (format === 'pdf') {
      // Generate PDF report
      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const margin = 50;
      let y = height - margin;
      
      // Add title
      page.drawText('Envelope Activity Report', {
        x: margin,
        y,
        size: 20,
        font: boldFont,
        color: rgb(0, 0, 0)
      });
      
      y -= 30;
      
      // Add date range
      page.drawText(`Date Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`, {
        x: margin,
        y,
        size: 12,
        font: timesRomanFont,
        color: rgb(0, 0, 0)
      });
      
      y -= 30;
      
      // Add activity entries
      for (const activity of formattedData) {
        if (y < margin + 50) {
          // Add new page if we're running out of space
          const newPage = pdfDoc.addPage();
          y = height - margin;
        }
        
        // Format timestamp
        const timestamp = new Date(activity.timestamp).toLocaleString();
        
        // Draw activity entry
        page.drawText(`${timestamp} - ${activity.user.name} - ${activity.action}`, {
          x: margin,
          y,
          size: 10,
          font: timesRomanFont,
          color: rgb(0, 0, 0)
        });
        
        y -= 15;
        
        page.drawText(`Envelope: ${activity.envelope.name}`, {
          x: margin + 20,
          y,
          size: 10,
          font: timesRomanFont,
          color: rgb(0, 0, 0)
        });
        
        y -= 20;
      }
      
      // Save PDF to temp file
      const pdfBytes = await pdfDoc.save();
      const tempFilePath = path.join(__dirname, '..', 'temp', `envelope_activity_${uuidv4()}.pdf`);
      
      // Ensure temp directory exists
      if (!fs.existsSync(path.join(__dirname, '..', 'temp'))) {
        fs.mkdirSync(path.join(__dirname, '..', 'temp'), { recursive: true });
      }
      
      fs.writeFileSync(tempFilePath, pdfBytes);
      
      // Send PDF file
      res.download(tempFilePath, 'envelope_activity_report.pdf', (err) => {
        if (err) {
          next(new ApiError(500, 'Error sending PDF file'));
        }
        
        // Delete temp file after sending
        fs.unlinkSync(tempFilePath);
      });
    } else {
      // Return JSON data
      res.status(200).json({
        success: true,
        count: formattedData.length,
        data: formattedData
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate user activity report
 * @route   GET /api/v1/reports/users/activity
 * @access  Private (org_admin)
 */
const generateUserActivityReport = async (req, res, next) => {
  try {
    const { 
      start_date, 
      end_date,
      user_id,
      format = 'json'
    } = req.query;
    
    const orgId = req.user.org_id;
    const requestUserId = req.user.id;
    
    // Validate dates
    const startDate = start_date ? new Date(start_date) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = end_date ? new Date(end_date) : new Date();
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return next(new ApiError(400, 'Invalid date format'));
    }
    
    // Build query
    let query = db('system_logs')
      .join('users', 'system_logs.user_id', 'users.id')
      .where('users.org_id', orgId)
      .whereBetween('system_logs.created_at', [startDate, endDate]);
    
    // Filter by user if provided
    if (user_id) {
      query = query.where('users.id', user_id);
    }
    
    // Get user activity
    const userActivity = await query
      .select(
        'system_logs.id',
        'system_logs.action',
        'system_logs.created_at',
        'system_logs.metadata',
        'system_logs.ip_address',
        'system_logs.user_agent',
        'users.id as user_id',
        'users.first_name',
        'users.last_name',
        'users.email'
      )
      .orderBy('system_logs.created_at', 'desc');
    
    // Format data
    const formattedData = userActivity.map(activity => ({
      id: activity.id,
      action: activity.action,
      timestamp: activity.created_at,
      user: {
        id: activity.user_id,
        name: `${activity.first_name} ${activity.last_name}`,
        email: activity.email
      },
      ip_address: activity.ip_address,
      user_agent: activity.user_agent,
      metadata: JSON.parse(activity.metadata || '{}')
    }));
    
    // Log report generation
    await logSystemEvent({
      user_id: requestUserId,
      action: 'report_generated',
      metadata: {
        report_type: 'user_activity',
        start_date: startDate,
        end_date: endDate,
        user_id: user_id || 'all'
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    // Return based on format
    if (format === 'pdf') {
      // Generate PDF report
      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const margin = 50;
      let y = height - margin;
      
      // Add title
      page.drawText('User Activity Report', {
        x: margin,
        y,
        size: 20,
        font: boldFont,
        color: rgb(0, 0, 0)
      });
      
      y -= 30;
      
      // Add date range
      page.drawText(`Date Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`, {
        x: margin,
        y,
        size: 12,
        font: timesRomanFont,
        color: rgb(0, 0, 0)
      });
      
      y -= 30;
      
      // Add activity entries
      for (const activity of formattedData) {
        if (y < margin + 50) {
          // Add new page if we're running out of space
          const newPage = pdfDoc.addPage();
          y = height - margin;
        }
        
        // Format timestamp
        const timestamp = new Date(activity.timestamp).toLocaleString();
        
        // Draw activity entry
        page.drawText(`${timestamp} - ${activity.user.name} - ${activity.action}`, {
          x: margin,
          y,
          size: 10,
          font: timesRomanFont,
          color: rgb(0, 0, 0)
        });
        
        y -= 15;
        
        page.drawText(`IP: ${activity.ip_address}`, {
          x: margin + 20,
          y,
          size: 10,
          font: timesRomanFont,
          color: rgb(0, 0, 0)
        });
        
        y -= 20;
      }
      
      // Save PDF to temp file
      const pdfBytes = await pdfDoc.save();
      const tempFilePath = path.join(__dirname, '..', 'temp', `user_activity_${uuidv4()}.pdf`);
      
      // Ensure temp directory exists
      if (!fs.existsSync(path.join(__dirname, '..', 'temp'))) {
        fs.mkdirSync(path.join(__dirname, '..', 'temp'), { recursive: true });
      }
      
      fs.writeFileSync(tempFilePath, pdfBytes);
      
      // Send PDF file
      res.download(tempFilePath, 'user_activity_report.pdf', (err) => {
        if (err) {
          next(new ApiError(500, 'Error sending PDF file'));
        }
        
        // Delete temp file after sending
        fs.unlinkSync(tempFilePath);
      });
    } else {
      // Return JSON data
      res.status(200).json({
        success: true,
        count: formattedData.length,
        data: formattedData
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate billing report
 * @route   GET /api/v1/reports/billing
 * @access  Private (org_admin)
 */
const generateBillingReport = async (req, res, next) => {
  try {
    const { 
      start_date, 
      end_date,
      format = 'json'
    } = req.query;
    
    const orgId = req.user.org_id;
    const userId = req.user.id;
    
    // Validate dates
    const startDate = start_date ? new Date(start_date) : new Date(new Date().setMonth(new Date().getMonth() - 6));
    const endDate = end_date ? new Date(end_date) : new Date();
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return next(new ApiError(400, 'Invalid date format'));
    }
    
    // Get payments
    const payments = await db('payments')
      .where('org_id', orgId)
      .whereBetween('created_at', [startDate, endDate])
      .select('*')
      .orderBy('created_at', 'desc');
    
    // Get subscription history
    const subscriptionHistory = await db('subscriptions')
      .where('org_id', orgId)
      .whereBetween('created_at', [startDate, endDate])
      .join('subscription_plans', 'subscriptions.plan_id', 'subscription_plans.id')
      .select(
        'subscriptions.*',
        'subscription_plans.name as plan_name',
        'subscription_plans.price as plan_price'
      )
      .orderBy('subscriptions.created_at', 'desc');
    
    // Get SMS credit purchases
    const smsCredits = await db('sms_credit_purchases')
      .where('org_id', orgId)
      .whereBetween('created_at', [startDate, endDate])
      .select('*')
      .orderBy('created_at', 'desc');
    
    // Format data
    const formattedData = {
      payments: payments.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        payment_method: payment.payment_method,
        description: payment.description,
        reference: payment.reference,
        created_at: payment.created_at
      })),
      subscriptions: subscriptionHistory.map(sub => ({
        id: sub.id,
        plan_name: sub.plan_name,
        plan_price: sub.plan_price,
        status: sub.status,
        start_date: sub.start_date,
        end_date: sub.end_date,
        renewal_date: sub.renewal_date,
        created_at: sub.created_at
      })),
      sms_credits: smsCredits.map(credit => ({
        id: credit.id,
        amount: credit.amount,
        credits: credit.credits,
        status: credit.status,
        created_at: credit.created_at
      }))
    };
    
    // Calculate totals
    const totalSpent = payments
      .filter(payment => payment.status === 'completed')
      .reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    
    const totalSmsCredits = smsCredits
      .filter(credit => credit.status === 'completed')
      .reduce((sum, credit) => sum + parseInt(credit.credits), 0);
    
    // Add summary
    formattedData.summary = {
      total_spent: totalSpent,
      total_sms_credits_purchased: totalSmsCredits,
      date_range: {
        start_date: startDate,
        end_date: endDate
      }
    };
    
    // Log report generation
    await logSystemEvent({
      user_id: userId,
      action: 'report_generated',
      metadata: {
        report_type: 'billing',
        start_date: startDate,
        end_date: endDate
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    // Return based on format
    if (format === 'pdf') {
      // Generate PDF report
      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const margin = 50;
      let y = height - margin;
      
      // Add title
      page.drawText('Billing Report', {
        x: margin,
        y,
        size: 20,
        font: boldFont,
        color: rgb(0, 0, 0)
      });
      
      y -= 30;
      
      // Add date range
      page.drawText(`Date Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`, {
        x: margin,
        y,
        size: 12,
        font: timesRomanFont,
        color: rgb(0, 0, 0)
      });
      
      y -= 20;
      
      // Add summary
      page.drawText(`Total Spent: $${totalSpent.toFixed(2)}`, {
        x: margin,
        y,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0)
      });
      
      y -= 20;
      
      page.drawText(`Total SMS Credits Purchased: ${totalSmsCredits}`, {
        x: margin,
        y,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0)
      });
      
      y -= 30;
      
      // Add payments section
      page.drawText('Payment History', {
        x: margin,
        y,
        size: 14,
        font: boldFont,
        color: rgb(0, 0, 0)
      });
      
      y -= 20;
      
      for (const payment of formattedData.payments) {
        if (y < margin + 50) {
          // Add new page if we're running out of space
          const newPage = pdfDoc.addPage();
          y = height - margin;
        }
        
        // Format date
        const date = new Date(payment.created_at).toLocaleDateString();
        
        // Draw payment entry
        page.drawText(`${date} - $${parseFloat(payment.amount).toFixed(2)} - ${payment.status}`, {
          x: margin,
          y,
          size: 10,
          font: timesRomanFont,
          color: rgb(0, 0, 0)
        });
        
        y -= 15;
        
        page.drawText(`Description: ${payment.description}`, {
          x: margin + 20,
          y,
          size: 10,
          font: timesRomanFont,
          color: rgb(0, 0, 0)
        });
        
        y -= 20;
      }
      
      // Save PDF to temp file
      const pdfBytes = await pdfDoc.save();
      const tempFilePath = path.join(__dirname, '..', 'temp', `billing_report_${uuidv4()}.pdf`);
      
      // Ensure temp directory exists
      if (!fs.existsSync(path.join(__dirname, '..', 'temp'))) {
        fs.mkdirSync(path.join(__dirname, '..', 'temp'), { recursive: true });
      }
      
      fs.writeFileSync(tempFilePath, pdfBytes);
      
      // Send PDF file
      res.download(tempFilePath, 'billing_report.pdf', (err) => {
        if (err) {
          next(new ApiError(500, 'Error sending PDF file'));
        }
        
        // Delete temp file after sending
        fs.unlinkSync(tempFilePath);
      });
    } else {
      // Return JSON data
      res.status(200).json({
        success: true,
        data: formattedData
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate signer report
 * @route   GET /api/v1/reports/signers
 * @access  Private (org_admin)
 */
const generateSignerReport = async (req, res, next) => {
  try {
    const { 
      start_date, 
      end_date,
      status,
      format = 'json'
    } = req.query;
    
    const orgId = req.user.org_id;
    const userId = req.user.id;
    
    // Validate dates
    const startDate = start_date ? new Date(start_date) : new Date(new Date().setDate(new Date().getDate() - 30));
    const endDate = end_date ? new Date(end_date) : new Date();
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return next(new ApiError(400, 'Invalid date format'));
    }
    
    // Build query
    let query = db('signers')
      .join('envelopes', 'signers.envelope_id', 'envelopes.id')
      .where('envelopes.org_id', orgId)
      .whereBetween('signers.created_at', [startDate, endDate]);
    
    // Filter by status if provided
    if (status) {
      query = query.where('signers.status', status);
    }
    
    // Get signers
    const signers = await query
      .select(
        'signers.*',
        'envelopes.name as envelope_name',
        'envelopes.status as envelope_status'
      )
      .orderBy('signers.created_at', 'desc');
    
    // Format data
    const formattedData = signers.map(signer => ({
      id: signer.id,
      name: signer.name,
      email: signer.email,
      phone: signer.phone,
      status: signer.status,
      role: signer.role,
      order: signer.order,
      created_at: signer.created_at,
      first_viewed_at: signer.first_viewed_at,
      signed_at: signer.signed_at,
      declined_at: signer.declined_at,
      decline_reason: signer.decline_reason,
      envelope: {
        id: signer.envelope_id,
        name: signer.envelope_name,
        status: signer.envelope_status
      }
    }));
    
    // Calculate statistics
    const stats = {
      total: formattedData.length,
      completed: formattedData.filter(s => s.status === 'completed').length,
      pending: formattedData.filter(s => s.status === 'pending').length,
      declined: formattedData.filter(s => s.status === 'declined').length,
      expired: formattedData.filter(s => s.status === 'expired').length,
      avg_time_to_sign: 0
    };
    
    // Calculate average time to sign (in hours)
    const completedSigners = formattedData.filter(s => 
      s.status === 'completed' && s.signed_at && s.first_viewed_at
    );
    
    if (completedSigners.length > 0) {
      const totalHours = completedSigners.reduce((sum, signer) => {
        const signedAt = new Date(signer.signed_at);
        const viewedAt = new Date(signer.first_viewed_at);
        const diffHours = (signedAt - viewedAt) / (1000 * 60 * 60);
        return sum + diffHours;
      }, 0);
      
      stats.avg_time_to_sign = parseFloat((totalHours / completedSigners.length).toFixed(2));
    }
    
    // Log report generation
    await logSystemEvent({
      user_id: userId,
      action: 'report_generated',
      metadata: {
        report_type: 'signers',
        start_date: startDate,
        end_date: endDate,
        status: status || 'all'
      },
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    });
    
    // Return based on format
    if (format === 'pdf') {
      // Generate PDF report
      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      
      const page = pdfDoc.addPage();
      const { width, height } = page.getSize();
      const margin = 50;
      let y = height - margin;
      
      // Add title
      page.drawText('Signer Report', {
        x: margin,
        y,
        size: 20,
        font: boldFont,
        color: rgb(0, 0, 0)
      });
      
      y -= 30;
      
      // Add date range
      page.drawText(`Date Range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`, {
        x: margin,
        y,
        size: 12,
        font: timesRomanFont,
        color: rgb(0, 0, 0)
      });
      
      y -= 20;
      
      // Add summary
      page.drawText(`Total Signers: ${stats.total}`, {
        x: margin,
        y,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0)
      });
      
      y -= 15;
      
      page.drawText(`Completed: ${stats.completed} | Pending: ${stats.pending} | Declined: ${stats.declined}`, {
        x: margin,
        y,
        size: 12,
        font: timesRomanFont,
        color: rgb(0, 0, 0)
      });
      
      y -= 15;
      
      page.drawText(`Average Time to Sign: ${stats.avg_time_to_sign} hours`, {
        x: margin,
        y,
        size: 12,
        font: timesRomanFont,
        color: rgb(0, 0, 0)
      });
      
      y -= 30;
      
      // Add signer entries
      for (const signer of formattedData) {
        if (y < margin + 50) {
          // Add new page if we're running out of space
          const newPage = pdfDoc.addPage();
          y = height - margin;
        }
        
        // Format date
        const date = new Date(signer.created_at).toLocaleDateString();
        
        // Draw signer entry
        page.drawText(`${signer.name} (${signer.email}) - Status: ${signer.status}`, {
          x: margin,
          y,
          size: 10,
          font: boldFont,
          color: rgb(0, 0, 0)
        });
        
        y -= 15;
        
        page.drawText(`Envelope: ${signer.envelope.name}`, {
          x: margin + 20,
          y,
          size: 10,
          font: timesRomanFont,
          color: rgb(0, 0, 0)
        });
        
        y -= 15;
        
        let timeInfo = `Created: ${date}`;
        
        if (signer.first_viewed_at) {
          timeInfo += ` | First Viewed: ${new Date(signer.first_viewed_at).toLocaleDateString()}`;
        }
        
        if (signer.signed_at) {
          timeInfo += ` | Signed: ${new Date(signer.signed_at).toLocaleDateString()}`;
        }
        
        page.drawText(timeInfo, {
          x: margin + 20,
          y,
          size: 10,
          font: timesRomanFont,
          color: rgb(0, 0, 0)
        });
        
        y -= 20;
      }
      
      // Save PDF to temp file
      const pdfBytes = await pdfDoc.save();
      const tempFilePath = path.join(__dirname, '..', 'temp', `signer_report_${uuidv4()}.pdf`);
      
      // Ensure temp directory exists
      if (!fs.existsSync(path.join(__dirname, '..', 'temp'))) {
        fs.mkdirSync(path.join(__dirname, '..', 'temp'), { recursive: true });
      }
      
      fs.writeFileSync(tempFilePath, pdfBytes);
      
      // Send PDF file
      res.download(tempFilePath, 'signer_report.pdf', (err) => {
        if (err) {
          next(new ApiError(500, 'Error sending PDF file'));
        }
        
        // Delete temp file after sending
        fs.unlinkSync(tempFilePath);
      });
    } else {
      // Return JSON data
      res.status(200).json({
        success: true,
        count: formattedData.length,
        stats,
        data: formattedData
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateEnvelopeActivityReport,
  generateUserActivityReport,
  generateBillingReport,
  generateSignerReport
};
