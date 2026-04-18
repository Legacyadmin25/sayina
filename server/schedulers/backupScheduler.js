const cron = require('node-cron');
const { db } = require('../config/db');
const https = require('https');
const fs = require('fs');
const path = require('path');
const logger = require('../config/winston');

// cPanel API credentials (from environment variables)
const CPANEL_HOST = process.env.CPANEL_HOST || 'cybercircuit.co.za';
const CPANEL_PORT = parseInt(process.env.CPANEL_PORT || '2083', 10);
const CPANEL_USER = process.env.CPANEL_USER;
const CPANEL_PASS = process.env.CPANEL_PASS;
const BACKUP_DIR = process.env.CPANEL_BACKUP_DIR || '/home1/legacybi/sayina-backups';

/**
 * Upload a file to cPanel via the Fileman API
 */
async function uploadToCPanel(filename, content) {
  return new Promise((resolve, reject) => {
    const boundary = '----BackupBoundary' + Date.now();
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`),
      Buffer.from(content, 'utf8'),
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const options = {
      hostname: CPANEL_HOST,
      port: CPANEL_PORT,
      path: `/json-api/cpanel?cpanel_jsonapi_user=${CPANEL_USER}&cpanel_jsonapi_apiversion=2&cpanel_jsonapi_module=Fileman&cpanel_jsonapi_func=savefile&dir=${encodeURIComponent(BACKUP_DIR)}&filename=${encodeURIComponent(filename)}&content=${encodeURIComponent(content)}`,
      method: 'GET',
      auth: `${CPANEL_USER}:${CPANEL_PASS}`,
      rejectUnauthorized: false,
      timeout: 60000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.cpanelresult?.event?.result === 1) {
            resolve(true);
          } else {
            reject(new Error(`cPanel upload failed: ${JSON.stringify(json)}`));
          }
        } catch (e) {
          reject(new Error(`cPanel response parse error: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('cPanel upload timeout')); });
    req.end();
  });
}

/**
 * Export all critical tables as CSV and upload to cPanel
 */
async function runBackup() {
  if (!CPANEL_USER || !CPANEL_PASS) {
    throw new Error('Backup failed: CPANEL_USER and CPANEL_PASS environment variables are required');
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const tables = [
    'organizations', 'users', 'plans', 'subscriptions',
    'envelopes', 'documents', 'signers', 'fields',
    'events', 'system_logs', 'sms_logs', 'transactions'
  ];

  logger.info(`Starting database backup: ${timestamp}`);
  let successCount = 0;
  let errorCount = 0;

  for (const table of tables) {
    try {
      // Check if table exists
      const exists = await db.schema.hasTable(table);
      if (!exists) continue;

      // Export table data
      const rows = await db(table).select('*');
      if (rows.length === 0) continue;

      // Convert to CSV
      const headers = Object.keys(rows[0]);
      const csvLines = [headers.join(',')];
      for (const row of rows) {
        const values = headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          const str = String(val).replace(/"/g, '""');
          return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
        });
        csvLines.push(values.join(','));
      }

      const csv = csvLines.join('\n');
      await uploadToCPanel(`${table}_${timestamp}.csv`, csv);
      successCount++;
      logger.info(`Backed up ${table}: ${rows.length} rows`);
    } catch (err) {
      errorCount++;
      logger.error(`Backup failed for ${table}: ${err.message}`);
    }
  }

  // Also backup uploaded document file paths for reference
  try {
    const docs = await db('documents').select('id', 'envelope_id', 'name', 'file_path', 'file_type', 'file_size', 'sha256_hash', 'created_at');
    if (docs.length > 0) {
      const manifest = JSON.stringify(docs, null, 2);
      await uploadToCPanel(`document_manifest_${timestamp}.json`, manifest);
      logger.info(`Document manifest backed up: ${docs.length} documents`);
    }
  } catch (err) {
    logger.error(`Document manifest backup failed: ${err.message}`);
  }

  // Cleanup old backups (keep last 30 days) - list and delete via cPanel API
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const cutoffStr = cutoffDate.toISOString().substring(0, 10);

    // We'll handle cleanup via the cPanel cron since listing files via API is complex
    logger.info(`Backup cleanup: files older than ${cutoffStr} will be cleaned by cPanel cron`);
  } catch (err) {
    logger.error(`Backup cleanup error: ${err.message}`);
  }

  logger.info(`Backup completed: ${successCount} tables backed up, ${errorCount} errors`);
  return { successCount, errorCount, timestamp };
}

/**
 * Schedule daily backup at 2am SAST (midnight UTC)
 */
function scheduleBackups() {
  // Run at midnight UTC (2am SAST)
  cron.schedule('0 0 * * *', async () => {
    try {
      await runBackup();
    } catch (err) {
      logger.error(`Scheduled backup failed: ${err.message}`);
    }
  });

  logger.info('Backup scheduler initialized: daily at 00:00 UTC (02:00 SAST)');
}

module.exports = { scheduleBackups, runBackup };
