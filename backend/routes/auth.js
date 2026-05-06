const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const CustomOfferSubmission = require('../models/CustomOfferSubmission');
const UserActivityLog = require('../models/UserActivityLog');
const { verifyToken } = require('../middlewares/authMiddleware');
const notify = require('../utils/notify');
const { notifyAdmins } = require('../utils/adminNotify');
const Avatar = require('../models/Avatar');

// POST /api/auth/sync
// Validates Firebase token. If user doesn't exist in MongoDB, inserts them securely.
router.post('/sync', verifyToken, async (req, res) => {
  try {
    const { uid, email, name, picture } = req.user;
    const { ref } = req.body || {};
    
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

      user = new User({
        firebaseUid: uid,
        email: email,
        displayName: uniqueName,
        avatarUrl: picture || '',
        ...(ref && { referredBy: ref }),
        ...(isPrimaryAdmin && { role: 'admin', adminPermissions: allPermissions })
      });
      await user.save();
      isNewUser = true;
      console.log(`Registration success: ${email} synchronized via Firebase. Assigned username: ${uniqueName}`);

      // Send Welcome Notification
      await notify(
        user._id,
        'welcome',
        'Welcome!',
        'Welcome to the platform! Start earning coins by completing tasks.'
      );

      // Support for future tracking: if the user creation somehow sets a referredBy (e.g., via middleware or future req.body parsing)
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
    } else if (isPrimaryAdmin && user.role !== 'admin') {
      // Auto-promote if they are set as primary admin in .env but not in db
      user.role = 'admin';
      user.adminPermissions = allPermissions;
      await user.save();
    }

    res.status(200).json({
      success: true,
      user,
      isNewUser,
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

module.exports = router;
