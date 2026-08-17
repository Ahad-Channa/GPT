const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { verifyToken } = require('../middlewares/authMiddleware');

// GET /api/notifications
// Returns 30 most recent notifications + unreadCount
router.get('/', verifyToken, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const notifications = await Notification.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({ userId: user._id, isRead: false });

    res.status(200).json({ success: true, notifications, unreadCount });
  } catch (error) {
    console.error('[/api/notifications GET] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

// POST /api/notifications/mark-read
// Marks all or specific notifications as read
router.post('/mark-read', verifyToken, async (req, res) => {
  try {
    const { ids } = req.body || {};
    const User = require('../models/User');
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    let query = { userId: user._id, isRead: false };

    if (ids && Array.isArray(ids) && ids.length > 0) {
      query._id = { $in: ids };
    }

    await Notification.updateMany(query, { $set: { isRead: true } });

    res.status(200).json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    console.error('[/api/notifications/mark-read POST] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notifications as read' });
  }
});

// DELETE /api/notifications/:id
// Dismiss a single notification
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const notification = await Notification.findOneAndDelete({ _id: req.params.id, userId: user._id });
    
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    
    res.status(200).json({ success: true, message: 'Notification dismissed' });
  } catch (error) {
    console.error('[/api/notifications/:id DELETE] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to dismiss notification' });
  }
});

// DELETE /api/notifications
// Dismiss all notifications for the user
router.delete('/', verifyToken, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    await Notification.deleteMany({ userId: user._id });
    
    res.status(200).json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    console.error('[/api/notifications DELETE] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to clear all notifications' });
  }
});

module.exports = router;
