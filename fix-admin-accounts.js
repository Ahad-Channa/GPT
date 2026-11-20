/**
 * ═══════════════════════════════════════════════════════════════
 *  FIX ADMIN ACCOUNTS — Run this on production server
 * ═══════════════════════════════════════════════════════════════
 *
 *  Usage: node fix-admin-accounts.js
 *
 *  This script:
 *  1. Finds ALL admin accounts in the database
 *  2. Resets their fraudStatus to 'clean', fraudFlag to 0
 *  3. Sets fraudExempt to true (so they can never be blocked again)
 *  4. Ensures isBanned is false
 *
 *  Run this from your backend directory (where node_modules is).
 */

const path = require('path');
const fs = require('fs');

// Add backend/node_modules to module lookup path if run from root directory
const backendModules = path.resolve(__dirname, 'backend', 'node_modules');
if (fs.existsSync(backendModules)) {
  module.paths.push(backendModules);
}
const parentModules = path.resolve(__dirname, '..', 'node_modules');
if (fs.existsSync(parentModules)) {
  module.paths.push(parentModules);
}

// Attempt to load .env from current directory or backend directory
if (fs.existsSync(path.resolve(__dirname, '.env'))) {
  require('dotenv').config({ path: path.resolve(__dirname, '.env') });
} else if (fs.existsSync(path.resolve(__dirname, 'backend', '.env'))) {
  require('dotenv').config({ path: path.resolve(__dirname, 'backend', '.env') });
} else if (fs.existsSync(path.resolve(__dirname, '..', '.env'))) {
  require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
} else {
  require('dotenv').config();
}
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('ERROR: No MongoDB URI found in .env file.');
  console.error('Make sure MONGODB_URI or MONGO_URI is set in your .env');
  process.exit(1);
}

mongoose.connect(MONGO_URI).then(async () => {
  console.log('Connected to MongoDB');
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  // Fix ALL admin accounts
  const result = await User.updateMany(
    { role: 'admin' },
    {
      $set: {
        fraudStatus: 'clean',
        fraudFlag: 0,
        isBanned: false,
        fraudExempt: true,  // Admins are always exempt
      }
    }
  );
  console.log(`✅ Fixed ${result.modifiedCount} admin account(s)`);

  // Show all admin accounts
  const admins = await User.find({ role: 'admin' }).lean();
  admins.forEach(a => {
    console.log(`  → ${a.email} | role: ${a.role} | fraudStatus: ${a.fraudStatus} | fraudExempt: ${a.fraudExempt} | isBanned: ${a.isBanned}`);
  });

  if (admins.length === 0) {
    console.log('⚠️  No admin accounts found. Check your PRIMARY_ADMIN_EMAIL in .env');
  }

  console.log('\nDone! Admin accounts are now unblocked and exempt from fraud checks.');
  process.exit(0);
}).catch(err => {
  console.error('Failed to connect:', err.message);
  process.exit(1);
});
