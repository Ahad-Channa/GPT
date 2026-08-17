const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const admin = require('../config/firebase');

// ─── Auth middleware for chat moderation ────────────────────────────────────
// Allows: admin (with manage_chat perm OR primary admin), chat_mod, support_agent, moderator
const requireChatMod = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

    const decoded = await admin.auth().verifyIdToken(token);
    const user = await User.findOne({ firebaseUid: decoded.uid });

    const primaryAdminEmail = process.env.PRIMARY_ADMIN_EMAIL;
    const isPrimary = primaryAdminEmail && decoded.email === primaryAdminEmail;

    if (isPrimary) {
      req.adminUser = user;
      req.isPrimary = true;
      return next();
    }

    const allowedRoles = ['chat_mod', 'support_agent', 'moderator'];
    const isAdminWithChatPerm = user?.role === 'admin' && user?.adminPermissions?.includes('manage_chat');

    if (!user || (!allowedRoles.includes(user.role) && !isAdminWithChatPerm)) {
      return res.status(403).json({ status: 'error', message: 'Forbidden: Chat moderation access required' });
    }

    req.adminUser = user;
    req.isPrimary = false;
    next();
  } catch (err) {
    console.error('requireChatMod error:', err);
    return res.status(401).json({ status: 'error', message: 'Invalid token' });
  }
};

// ─── Same but only primary admin ─────────────────────────────────────────────
const requirePrimaryForChat = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

    const decoded = await admin.auth().verifyIdToken(token);
    const primaryAdminEmail = process.env.PRIMARY_ADMIN_EMAIL;

    if (!primaryAdminEmail || decoded.email !== primaryAdminEmail) {
      return res.status(403).json({ status: 'error', message: 'Forbidden: Primary Admin only' });
    }

    const user = await User.findOne({ firebaseUid: decoded.uid });
    req.adminUser = user;
    next();
  } catch (err) {
    console.error('requirePrimaryForChat error:', err);
    return res.status(401).json({ status: 'error', message: 'Invalid token' });
  }
};

// GET /api/chat/history - Get the last 50 chat messages, supports pagination via 'before' query
router.get('/history', async (req, res) => {
  try {
    const { before } = req.query;
    const query = { isDeleted: false };

    if (before) {
      const beforeMsg = await ChatMessage.findById(before);
      if (beforeMsg) {
        query.createdAt = { $lt: beforeMsg.createdAt };
      }
    }

    const messages = await ChatMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('userId', 'displayName avatarUrl role totalEarned');

    // Reverse so the oldest of the 50 is first, and newest is last (for UI rendering)
    const formattedMessages = messages.reverse().map(msg => ({
      _id: msg._id,
      message: msg.message,
      createdAt: msg.createdAt,
      user: msg.userId
    }));

    res.status(200).json({ status: 'success', data: formattedMessages });
  } catch (error) {
    console.error('Fetch chat history error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch chat history' });
  }
});

// GET /api/chat/all - Admin/Mod: get last 200 messages including deleted ones
router.get('/all', requireChatMod, async (req, res) => {
  try {
    const messages = await ChatMessage.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('userId', 'displayName avatarUrl role totalEarned');

    const formattedMessages = messages.reverse().map(msg => ({
      _id: msg._id,
      message: msg.message,
      isDeleted: msg.isDeleted,
      createdAt: msg.createdAt,
      user: msg.userId
    }));

    res.status(200).json({ status: 'success', data: formattedMessages });
  } catch (error) {
    console.error('Fetch all chat messages error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch chat messages' });
  }
});

// DELETE /api/chat/messages/:id - Admin/Mod: soft-delete a single message
router.delete('/messages/:id', requireChatMod, async (req, res) => {
  try {
    const msg = await ChatMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ status: 'error', message: 'Message not found' });

    msg.isDeleted = true;
    await msg.save();

    // Emit socket event so all clients remove the message immediately
    req.io.emit('messageDeleted', { _id: msg._id.toString() });

    res.status(200).json({ status: 'success', message: 'Message deleted' });
  } catch (error) {
    console.error('Delete chat message error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete message' });
  }
});

// DELETE /api/chat/clear-all - Primary Admin only: nuke the entire active chat
router.delete('/clear-all', requirePrimaryForChat, async (req, res) => {
  try {
    const result = await ChatMessage.updateMany(
      { isDeleted: false },
      { $set: { isDeleted: true } }
    );

    // Notify all connected clients to clear their chat
    req.io.emit('chatCleared');

    res.status(200).json({
      status: 'success',
      message: `Cleared ${result.modifiedCount} messages`,
      clearedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Clear all chat error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to clear chat' });
  }
});

// DELETE /api/chat/clear-recent - Admin/Mod: nuke the last 30 active messages
router.delete('/clear-recent', requireChatMod, async (req, res) => {
  try {
    const limit = parseInt(req.query.count) || 30;
    
    // Find the last N active messages
    const recentMessages = await ChatMessage.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(limit);

    if (recentMessages.length === 0) {
      return res.status(200).json({ status: 'success', message: 'No active messages to delete', clearedCount: 0 });
    }

    const messageIds = recentMessages.map(m => m._id);

    // Soft delete them
    const result = await ChatMessage.updateMany(
      { _id: { $in: messageIds } },
      { $set: { isDeleted: true } }
    );

    // Notify all connected clients for each message so we don't need frontend code changes
    // or we could emit a new event, but emitting individual messageDeleted works perfectly
    messageIds.forEach(id => {
      req.io.emit('messageDeleted', { _id: id.toString() });
    });

    res.status(200).json({
      status: 'success',
      message: `Cleared last ${result.modifiedCount} messages`,
      clearedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Clear recent chat error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to clear recent messages' });
  }
});

module.exports = router;
