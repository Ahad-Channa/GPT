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

    if (!user) {
      user = new User({
        firebaseUid: uid,
        email: email,
        displayName: name || email.split('@')[0],
        avatarUrl: picture || '',
      });
      await user.save();
      isNewUser = true;
      console.log(`Registration success: ${email} synchronized via Firebase.`);
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

module.exports = router;
