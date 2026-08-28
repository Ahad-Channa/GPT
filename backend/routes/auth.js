const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const CustomOfferSubmission = require('../models/CustomOfferSubmission');
const UserActivityLog = require('../models/UserActivityLog');
const { verifyToken } = require('../middlewares/authMiddleware');
const { fraudCheck, getClientIp } = require('../middlewares/fraudCheck');
const notify = require('../utils/notify');
const { notifyAdmins } = require('../utils/adminNotify');
const Avatar = require('../models/Avatar');

/**
 * Generates a unique 8-character alphanumeric referral code.
 * Retries up to 5 times to avoid the (extremely unlikely) collision.
 */
async function generateUniqueReferralCode() {
  for (let i = 0; i < 5; i++) {
    const code = crypto.randomBytes(5).toString('base64url').slice(0, 8).toUpperCase();
    const exists = await User.findOne({ referralCode: code });
    if (!exists) return code;
  }
  // Fallback: longer random string virtually guarantees uniqueness
  return crypto.randomBytes(8).toString('base64url').slice(0, 12).toUpperCase();
}

// POST /api/auth/sync
// Validates Firebase token. If user doesn't exist in MongoDB, inserts them securely.
router.post('/sync', verifyToken, fraudCheck('auth_sync', 'light'), async (req, res) => {
  try {
    const { uid, email, name, picture } = req.user;
    const { ref, fingerprint } = req.body || {};

    let user = await User.findOne({ firebaseUid: uid });
    let isNewUser = false;
    const isPrimaryAdmin = email === process.env.PRIMARY_ADMIN_EMAIL;
    const allPermissions = ['manage_users', 'manage_withdrawals', 'manage_support', 'manage_offerwalls', 'manage_admins'];

    if (!user) {
      let baseName = (name || email.split('@')[0] || 'user').replace(/[^a-zA-Z0-9_-]/g, '');
      if (baseName.length < 3) baseName = 'user' + Math.floor(Math.random() * 10000);
      let uniqueName = baseName;
      let nameExists = await User.findOne({ displayName: new RegExp(`^${uniqueName}$`, 'i') });
      let counter = 1;
      while (nameExists) {
        uniqueName = `${baseName}${counter}`;
        nameExists = await User.findOne({ displayName: new RegExp(`^${uniqueName}$`, 'i') });
        counter++;
      }

      // Resolve the referrer: support both legacy ObjectId and new short referralCode
      let referredById = null;
      if (ref) {
        if (/^[0-9a-fA-F]{24}$/.test(ref)) {
          // Legacy: ref is a MongoDB ObjectId
          referredById = ref;
        } else {
          // New: ref is a short referralCode — look up the user
          const referrer = await User.findOne({ referralCode: ref.toUpperCase() });
          if (referrer) referredById = referrer._id;
        }
      }

      // Generate a unique referral code for this new user
      const referralCode = await generateUniqueReferralCode();

      user = new User({
        firebaseUid: uid,
        email: email,
        displayName: uniqueName,
        avatarUrl: picture || '',
        referralCode,
        ...(referredById && { referredBy: referredById }),
        ...(isPrimaryAdmin && { role: 'admin', adminPermissions: allPermissions })
      });
      await user.save();
      isNewUser = true;
      console.log(`Registration success: ${email} synchronized via Firebase. Assigned username: ${uniqueName}`);

      // ── Anti-fraud: check for multi-account via fingerprint ──
      if (fingerprint) {
        const linkedAccounts = await User.find({
          deviceFingerprints: fingerprint,
          _id: { $ne: user._id },
        }).select('_id displayName email');
        if (linkedAccounts.length > 0) {
          user.fraudFlag = (user.fraudFlag || 0) + 1;
          user.fraudStatus = 'flagged';
          await user.save();
          await notifyAdmins({
            category: 'users',
            type: 'multi_account_detected',
            message: `🚨 Multi-account detected! ${user.displayName} shares device fingerprint with: ${linkedAccounts.map(a => a.displayName).join(', ')}`,
            permissionRequired: 'manage_users',
            metadata: { userId: user._id, linkedAccountIds: linkedAccounts.map(a => a._id) },
          });
        }
      }

      // Send Welcome Notification
      await notify(
        user._id,
        'welcome',
        'Welcome!',
        'Welcome to the platform! Start earning coins by completing tasks.'
      );

      if (user.referredBy) {
        await notify(
          user.referredBy,
          'referral_signup',
          'New Referral!',
          `${user.displayName} joined using your referral link!`,
          { newUserId: user._id }
        );

        // Add admin notification
        await notifyAdmins({
          category: 'users',
          type: 'referral_signup',
          message: `User ${user.displayName} signed up via a referral link.`,
          permissionRequired: 'manage_users',
          metadata: { userId: user._id, referrerId: user.referredBy }
        });

      }
    } else {
      // Existing user: backfill referralCode if they don't have one yet
      if (!user.referralCode) {
        user.referralCode = await generateUniqueReferralCode();
        await user.save();
      }

      if (isPrimaryAdmin && user.role !== 'admin') {
        // Auto-promote if they are set as primary admin in .env but not in db
        user.role = 'admin';
        user.adminPermissions = allPermissions;
        await user.save();
      }
    }

    // Check if 2FA is required for this user
    let twoFactorRequired = false;
    if (user.twoFactorEnabled) {
      const twoFactorToken = req.headers['x-two-factor-token'];
      const { verifyTwoFactorToken } = require('../utils/twoFactorUtils');
      const verifiedPayload = verifyTwoFactorToken(twoFactorToken);
      if (!verifiedPayload || verifiedPayload.uid !== user.firebaseUid) {
        twoFactorRequired = true;
      }
    }

    // Attach fraud warning to response if proxy/VPN was detected
    const fraudWarning = req.fraud?.flagged || false;

    res.status(200).json({
      success: true,
      user,
      isNewUser,
      twoFactorRequired,
      fraudWarning,
    });
  } catch (error) {
    console.error('[/api/auth/sync] Database Error:', error);
    res.status(500).json({ success: false, error: 'Database Synchronization Error.' });
  }
});

// PUT /api/auth/profile
// Allows a user to update their display name with basic validation
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { displayName, avatarUrl, isPrivate } = req.body;

    // Basic username validation (3-20 characters, alphanumeric, dashes, underscores)
    const nameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (displayName && !nameRegex.test(displayName)) {
      return res.status(400).json({
        success: false,
        error: 'Username must be 3-20 characters long and can only contain letters, numbers, dashes, and underscores.'
      });
    }

    const updateFields = {};
    if (displayName) {
      // Check for uniqueness (case-insensitive)
      const nameExists = await User.findOne({
        displayName: new RegExp(`^${displayName}$`, 'i'),
        firebaseUid: { $ne: req.user.uid }
      });
      if (nameExists) {
        return res.status(400).json({ success: false, error: 'Username is already taken.' });
      }
      updateFields.displayName = displayName;
    }
    if (avatarUrl) {
      const avatarDoc = await Avatar.findOne({ url: avatarUrl });
      if (avatarDoc && avatarDoc.isPremium) {
        const currentUser = await User.findOne({ firebaseUid: req.user.uid });
        if (!currentUser || !currentUser.unlockedAvatars || !currentUser.unlockedAvatars.includes(avatarDoc._id)) {
          return res.status(403).json({ success: false, error: 'You do not own this premium avatar.' });
        }
      }
      updateFields.avatarUrl = avatarUrl;
    }
    if (typeof isPrivate === 'boolean') updateFields.isPrivate = isPrivate;

    const user = await User.findOneAndUpdate(
      { firebaseUid: req.user.uid },
      updateFields,
      { returnDocument: 'after' }
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, error: 'Username is already taken.' });
    }
    console.error('[/api/auth/profile] Update Error:', error);
    res.status(500).json({ success: false, error: 'Database Update Error.' });
  }
});

// DELETE /api/auth/account
// Deletes the user and related data
router.delete('/account', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // Delete related data
    await Transaction.deleteMany({ user: user._id });
    await CustomOfferSubmission.deleteMany({ user: user._id });
    await UserActivityLog.deleteMany({ user: user._id });

    // Delete user
    await User.findOneAndDelete({ firebaseUid: req.user.uid });

    res.status(200).json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('[/api/auth/account] Deletion Error:', error);
    res.status(500).json({ success: false, error: 'Account Deletion Error.' });
  }
});

// ── Two-Factor Authentication (2FA) Routes ──

// POST /api/auth/setup-2fa
// Generates a temp secret and returns otpauth URL + secret key
router.post('/setup-2fa', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const { generateBase32Secret } = require('../utils/twoFactorUtils');
    const secret = generateBase32Secret();
    user.tempTwoFactorSecret = secret;
    await user.save();

    const appName = 'GPT-Earn';
    const otpauthUrl = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${encodeURIComponent(appName)}`;

    res.status(200).json({
      success: true,
      secret,
      otpauthUrl
    });
  } catch (error) {
    console.error('[/api/auth/setup-2fa] Setup Error:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate 2FA setup.' });
  }
});

// POST /api/auth/confirm-2fa
// Verifies code and completes 2FA activation
router.post('/confirm-2fa', verifyToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Verification code is required.' });

    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (!user.tempTwoFactorSecret) return res.status(400).json({ success: false, error: '2FA setup was not initiated.' });

    const { verifyTOTP, signTwoFactorToken } = require('../utils/twoFactorUtils');
    const isValid = verifyTOTP(code, user.tempTwoFactorSecret);
    if (!isValid) return res.status(400).json({ success: false, error: 'Invalid verification code. Please check your app.' });

    user.twoFactorSecret = user.tempTwoFactorSecret;
    user.tempTwoFactorSecret = null;
    user.twoFactorEnabled = true;
    await user.save();

    // Issue a 2FA session token
    const twoFactorToken = signTwoFactorToken(user.firebaseUid);

    res.status(200).json({
      success: true,
      message: 'Two-factor authentication enabled successfully!',
      twoFactorToken,
      user
    });
  } catch (error) {
    console.error('[/api/auth/confirm-2fa] Confirmation Error:', error);
    res.status(500).json({ success: false, error: 'Failed to confirm 2FA.' });
  }
});

// POST /api/auth/verify-2fa
// Validates 2FA code during login/session initialization
router.post('/verify-2fa', verifyToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Verification code is required.' });

    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ success: false, error: 'Two-factor authentication is not enabled for this account.' });
    }

    const { verifyTOTP, signTwoFactorToken } = require('../utils/twoFactorUtils');
    const isValid = verifyTOTP(code, user.twoFactorSecret);
    if (!isValid) return res.status(400).json({ success: false, error: 'Invalid verification code.' });

    // Issue a 2FA session token
    const twoFactorToken = signTwoFactorToken(user.firebaseUid);

    res.status(200).json({
      success: true,
      twoFactorToken,
      user
    });
  } catch (error) {
    console.error('[/api/auth/verify-2fa] Verification Error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify 2FA.' });
  }
});

// POST /api/auth/disable-2fa
// Disables 2FA (requires code to confirm)
router.post('/disable-2fa', verifyToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Verification code is required to disable 2FA.' });

    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (!user.twoFactorEnabled) return res.status(400).json({ success: false, error: '2FA is already disabled.' });

    const { verifyTOTP } = require('../utils/twoFactorUtils');
    const isValid = verifyTOTP(code, user.twoFactorSecret);
    if (!isValid) return res.status(400).json({ success: false, error: 'Invalid verification code. Cannot disable 2FA.' });

    user.twoFactorSecret = null;
    user.twoFactorEnabled = false;
    user.tempTwoFactorSecret = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Two-factor authentication disabled successfully.',
      user
    });
  } catch (error) {
    console.error('[/api/auth/disable-2fa] Disable Error:', error);
    res.status(500).json({ success: false, error: 'Failed to disable 2FA.' });
  }
});

module.exports = router;
