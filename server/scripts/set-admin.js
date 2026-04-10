/**
 * One-time script: Set info@legacybit.co.za as admin
 * Run with:  node scripts/set-admin.js
 * (from the /server directory, with DATABASE_URL in env or .env loaded)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { db } = require('../config/db');

(async () => {
  const TARGET_EMAIL = 'info@legacybit.co.za';

  try {
    const user = await db('users').where({ email: TARGET_EMAIL }).first();

    if (!user) {
      console.error(`❌  User not found: ${TARGET_EMAIL}`);
      console.error('Make sure this account has been created first (sign up on the site).');
      process.exit(1);
    }

    console.log(`Found user: ${user.email}  |  current role: ${user.role}`);

    if (user.role === 'admin') {
      console.log('✅  Already set as admin — nothing to do.');
      process.exit(0);
    }

    await db('users').where({ email: TARGET_EMAIL }).update({ role: 'admin' });

    const updated = await db('users').where({ email: TARGET_EMAIL }).select('email', 'role').first();
    console.log(`✅  Done!  ${updated.email}  →  role: ${updated.role}`);
    process.exit(0);

  } catch (err) {
    console.error('❌  Error:', err.message);
    process.exit(1);
  } finally {
    await db.destroy();
  }
})();
