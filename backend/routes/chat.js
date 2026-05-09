const express = require('express');
const router = express.Router();
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const admin = require('../config/firebase');

// ─── Auth middleware ────────────────────────────────────────────────────────
const requireAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    const decoded = await admin.auth().verifyIdToken(token);
    const user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user || (user.role !== 'admin' && user.role !== 'mod')) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }
    req.adminUser = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ status: 'error', message: 'Invalid token' });
  }
};

// GET /api/chat/history - Get the last 50 chat messages
router.get('/history', async (req, res) => {
  try {
    const messages = await ChatMessage.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('userId', 'displayName avatarUrl role');
      
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

// GET /api/chat/all - Admin: get last 100 messages including deleted ones
router.get('/all', requireAdmin, async (req, res) => {
  try {
    const messages = await ChatMessage.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('userId', 'displayName avatarUrl role');

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

// DELETE /api/chat/messages/:id - Admin/Mod: soft-delete a message
router.delete('/messages/:id', requireAdmin, async (req, res) => {
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

module.exports = router;
