const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { verifyToken } = require('../middlewares/authMiddleware');

// POST /api/auth/sync
// Validates Firebase token. If user doesn't exist in MongoDB, inserts them securely.
router.post('/sync', verifyToken, async (req, res) => {
  try {
    const { uid, email, name, picture } = req.user;
    
    let user = await User.findOne({ firebaseUid: uid });
    let isNewUser = false;
    const isPrimaryAdmin = email === process.env.PRIMARY_ADMIN_EMAIL;
    const allPermissions = ['manage_users', 'manage_withdrawals', 'manage_support', 'manage_offerwalls', 'manage_admins'];

    if (!user) {
      user = new User({
        firebaseUid: uid,
        email: email,
        displayName: name || email.split('@')[0],
        avatarUrl: picture || '',
        ...(isPrimaryAdmin && { role: 'admin', adminPermissions: allPermissions })
      });
      await user.save();
      isNewUser = true;
      console.log(`Registration success: ${email} synchronized via Firebase.`);
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
    const { displayName } = req.body;
    
    // Basic username validation (3-20 characters, alphanumeric, dashes, underscores)
    const nameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!displayName || !nameRegex.test(displayName)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username must be 3-20 characters long and can only contain letters, numbers, dashes, and underscores.' 
      });
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid: req.user.uid },
      { displayName },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('[/api/auth/profile] Update Error:', error);
    res.status(500).json({ success: false, error: 'Database Update Error.' });
  }
});

module.exports = router;
