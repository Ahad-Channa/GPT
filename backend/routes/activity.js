const express = require('express');
const router = express.Router();
const UserActivityLog = require('../models/UserActivityLog');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/track', verifyToken, async (req, res) => {
  try {
    const { actionType, targetId, metadata } = req.body;
    
    // Extract primitive tracking info
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || '';
    const deviceInfo = req.headers['user-agent'] || '';
    
    // In production, might parse IP with an external service or GeoLite to get Country.
    // We will leave country blank or 'Unknown' for now until configured.
    const country = 'Unknown'; 

    const User = require('../models/User');
    const dbUser = await User.findOne({ firebaseUid: req.user.uid });
    if (!dbUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const newLog = await UserActivityLog.create({
      userId: dbUser._id,
      actionType,
      ipAddress,
      country,
      deviceInfo,
      targetId: targetId || null,
      metadata: metadata || {}
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Activity track error:', err);
    res.status(500).json({ success: false, error: 'Failed to track activity' });
  }
});

router.get('/history', verifyToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));

    const User = require('../models/User');
    const dbUser = await User.findOne({ firebaseUid: req.user.uid });
    if (!dbUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const query = { userId: dbUser._id };

    const [logs, total] = await Promise.all([
      UserActivityLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      UserActivityLog.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      }
    });
  } catch (err) {
    console.error('[/api/activity/history] Error:', err);
    res.status(500).json({ success: false, error: 'Failed to load activity history' });
  }
});

module.exports = router;
