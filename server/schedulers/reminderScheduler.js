const cron = require('node-cron');
const { db } = require('../config/db');
const { sendEmail } = require('../services/emailService');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const logger = require('../config/winston');

/**
 * Load the signing invitation template (reused for reminders)
 */
let reminderTemplate;
try {
  const templatePath = path.join(__dirname, '../templates/emails/signing-invitation.html');
  const source = fs.readFileSync(templatePath, 'utf-8');
  reminderTemplate = handlebars.compile(source);
} catch (err) {
  console.warn('Reminder email template not found, using plain text fallback');
}

/**
 * Send signing reminders to signers who haven't signed after 2 days
 */
async function sendSigningReminders() {
  try {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Find pending signers on active envelopes older than 2 days
    const pendingSigners = await db('signers')
      .join('envelopes', 'signers.envelope_id', 'envelopes.id')
      .join('organizations', 'envelopes.org_id', 'organizations.id')
      .whereIn('envelopes.status', ['sent', 'in_progress'])
      .where('signers.status', 'pending')
      .where('envelopes.created_at', '<', twoDaysAgo.toISOString())
      .whereNull('signers.reminder_sent_at')
      .select(
        'signers.id as signer_id',
        'signers.name as signer_name',
        'signers.email as signer_email',
        'envelopes.id as envelope_id',
        'envelopes.name as envelope_name',
        'envelopes.created_at as envelope_created_at',
        'organizations.name as org_name',
        'organizations.primary_color'
      )
      .limit(50); // Process in batches

    if (pendingSigners.length === 0) {
      return { sent: 0 };
    }

    let sentCount = 0;
    for (const signer of pendingSigners) {
      try {
        const signerName = signer.signerName ?? signer.signer_name;
        const signerEmail = signer.signerEmail ?? signer.signer_email;
        const envelopeName = signer.envelopeName ?? signer.envelope_name;
        const envelopeId = signer.envelopeId ?? signer.envelope_id;
        const signerId = signer.signerId ?? signer.signer_id;
        const orgName = signer.orgName ?? signer.org_name;

        const signingUrl = `${process.env.CLIENT_URL || 'https://sayina.co.za'}/sign/${envelopeId}`;

        let html;
        if (reminderTemplate) {
          html = reminderTemplate({
            signerName,
            organizationName: orgName,
            envelopeName,
            signingUrl,
            isReminder: true,
            message: `This is a friendly reminder that you have a document waiting for your signature. Please sign at your earliest convenience.`,
            brandColor: signer.primaryColor ?? signer.primary_color ?? '#3B82F6'
          });
        } else {
          html = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background-color:#3a86ff;padding:20px;text-align:center;border-radius:5px 5px 0 0;">
                <h2 style="color:#ffffff;margin:0;">Reminder: Document Awaiting Your Signature</h2>
              </div>
              <div style="padding:20px;">
                <p>Hi ${signerName},</p>
                <p>${orgName} is waiting for you to sign "<strong>${envelopeName}</strong>".</p>
                <p style="text-align:center;margin:24px 0;">
                  <a href="${signingUrl}" style="background:#3a86ff;color:#fff;padding:12px 24px;text-decoration:none;border-radius:5px;font-weight:bold;display:inline-block;">Review & Sign Document</a>
                </p>
                <p style="color:#666;font-size:13px;">Or copy this link into your browser:<br>${signingUrl}</p>
                <p>If you have any questions, please contact the sender.</p>
              </div>
              <div style="background-color:#f8f9fa;padding:15px;text-align:center;font-size:12px;color:#666;border-top:1px solid #eee;">
                <p>&copy; ${new Date().getFullYear()} Sayina. All rights reserved.</p>
                <p>Powered by <strong>Sayina</strong> E-Signature Service</p>
              </div>
            </div>
          `;
        }

        await sendEmail(
          signerEmail,
          `Reminder: "${envelopeName}" is awaiting your signature`,
          html
        );

        // Mark reminder as sent
        await db('signers')
          .where('id', signerId)
          .update({ reminder_sent_at: new Date().toISOString() });

        sentCount++;
      } catch (err) {
        console.error(`Failed to send reminder to ${signer.signer_email}:`, err.message);
      }
    }

    console.log(`Signing reminders: sent ${sentCount} of ${pendingSigners.length}`);
    return { sent: sentCount, total: pendingSigners.length };
  } catch (error) {
    console.error('Reminder scheduler error:', error.message);
    throw error;
  }
}

/**
 * Mark expired envelopes
 */
async function expireEnvelopes() {
  try {
    const result = await db('envelopes')
      .whereIn('status', ['sent', 'in_progress', 'draft'])
      .whereNotNull('expiry_days')
      .whereRaw("created_at + (expiry_days || ' days')::interval < NOW()")
      .update({ status: 'expired', updated_at: new Date().toISOString() });

    if (result > 0) {
      console.log(`Expired ${result} overdue envelopes`);
    }
    return { expired: result };
  } catch (error) {
    console.error('Envelope expiry error:', error.message);
    throw error;
  }
}

/**
 * Initialize reminder and expiry schedulers
 */
function initReminderScheduler() {
  // Send reminders every day at 9am SAST (7am UTC)
  cron.schedule('0 7 * * *', async () => {
    console.log('Running signing reminder job...');
    try {
      await sendSigningReminders();
    } catch (err) {
      console.error('Reminder job failed:', err.message);
    }
  });

  // Expire overdue envelopes every day at 1am SAST (11pm UTC previous day)
  cron.schedule('0 23 * * *', async () => {
    console.log('Running envelope expiry job...');
    try {
      await expireEnvelopes();
    } catch (err) {
      console.error('Expiry job failed:', err.message);
    }
  });

  console.log('Reminder & expiry schedulers initialized (reminders at 9am SAST, expiry at 1am SAST)');
}

module.exports = { initReminderScheduler, sendSigningReminders, expireEnvelopes };
