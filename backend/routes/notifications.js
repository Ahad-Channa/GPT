const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { verifyToken } = require('../middlewares/authMiddleware');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');
const { buildOfferRewardMessage } = require('../services/notifications/offerRewardMessage');

// GET /api/notifications
// Returns 30 most recent notifications + unreadCount
router.get('/', verifyToken, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const notifications = await Notification.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    // Older reward notifications were stored with generic copy. Enrich those
    // responses from the linked transaction so existing users see the actual
    // offer/step and hold period. This is read-only; historical notifications
    // are not rewritten in the database.
    const rewardNotifications = notifications.filter((notification) =>
      ['offer_reward', 'direct_offer_reward'].includes(notification.type)
      && /^You (?:earned|completed an offer)\b/i.test(notification.message || '')
    );
    if (rewardNotifications.length) {
      const linkedIds = rewardNotifications
        .map((notification) => notification.metadata?.txId)
        .filter((id) => mongoose.Types.ObjectId.isValid(id));
      const legacyOfferwallNotifications = rewardNotifications.filter((notification) =>
        notification.type === 'offer_reward'
        && notification.metadata?.providerId
        && Number(notification.metadata?.amount) > 0
        && notification.createdAt
      );
      const providerIds = [...new Set(legacyOfferwallNotifications.map((notification) => notification.metadata.providerId))];
      const amounts = [...new Set(legacyOfferwallNotifications.map((notification) => Number(notification.metadata.amount)))];
      const timestamps = legacyOfferwallNotifications.map((notification) => new Date(notification.createdAt).getTime());
      const searchWindow = timestamps.length ? {
        $gte: new Date(Math.min(...timestamps) - 2 * 60 * 1000),
        $lte: new Date(Math.max(...timestamps) + 2 * 60 * 1000),
      } : null;

      const [linkedTransactions, nearbyOfferwallTransactions] = await Promise.all([
        linkedIds.length
          ? Transaction.find({ _id: { $in: linkedIds }, userId: user._id })
            .select('transactionType amount status description holdUntil createdAt metadata')
            .lean()
          : [],
        providerIds.length && amounts.length && searchWindow
          ? Transaction.find({
            userId: user._id,
            transactionType: 'offer_reward',
            'metadata.providerId': { $in: providerIds },
            amount: { $in: amounts },
            createdAt: searchWindow,
          }).select('transactionType amount status description holdUntil createdAt metadata').lean()
          : [],
      ]);

      const transactionMap = new Map(linkedTransactions.map((transaction) => [transaction._id.toString(), transaction]));
      const usedTransactionIds = new Set();
      for (const notification of rewardNotifications) {
        const txId = notification.metadata?.txId;
        let transaction = mongoose.Types.ObjectId.isValid(txId) ? transactionMap.get(txId.toString()) : null;

        // Legacy offerwall notifications did not store txId. Match only an
        // exact user/provider/amount event close to the notification timestamp.
        if (!transaction && notification.type === 'offer_reward' && notification.metadata?.providerId) {
          const notificationTime = new Date(notification.createdAt).getTime();
          const candidates = nearbyOfferwallTransactions
            .filter((candidate) => !usedTransactionIds.has(candidate._id.toString())
              && candidate.metadata?.providerId === notification.metadata.providerId
              && Number(candidate.amount) === Number(notification.metadata.amount))
            .map((candidate) => ({ candidate, distance: Math.abs(new Date(candidate.createdAt).getTime() - notificationTime) }))
            .filter(({ distance }) => distance <= 2 * 60 * 1000)
            .sort((a, b) => a.distance - b.distance);
          if (candidates.length && (candidates.length === 1 || candidates[1].distance - candidates[0].distance > 1000)) {
            transaction = candidates[0].candidate;
            usedTransactionIds.add(transaction._id.toString());
          }
        }

        const message = buildOfferRewardMessage(transaction);
        if (message) notification.message = message;
      }
    }

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
