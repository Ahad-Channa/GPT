const express = require('express');
const router = express.Router();
const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const admin = require('../config/firebase');

// ─── Auth Middlewares ────────────────────────────────────────────────────────

const requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    const decoded = await admin.auth().verifyIdToken(token);
    const user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });
    req.authUser = user;
    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Invalid token' });
  }
};

const requireAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
    const decoded = await admin.auth().verifyIdToken(token);
    const user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
      return res.status(403).json({ status: 'error', message: 'Forbidden' });
    }
    req.adminUser = user;
    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Invalid token' });
  }
};

// ─── User Routes ─────────────────────────────────────────────────────────────

// GET /api/support/my-ticket — get user's active (non-closed) ticket
router.get('/my-ticket', requireAuth, async (req, res) => {
  try {
    const ticket = await SupportTicket.findOne({
      userId: req.authUser._id,
      status: { $ne: 'closed' }
    }).populate('userId', 'displayName avatarUrl role');

    if (!ticket) return res.json({ status: 'success', data: null });

    // Mark unreadByUser = false (user viewed it)
    if (ticket.unreadByUser) {
      ticket.unreadByUser = false;
      await ticket.save();
    }

    res.json({ status: 'success', data: ticket });
  } catch (err) {
    console.error('Get my-ticket error:', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// POST /api/support/message — user sends a message (auto-creates ticket if needed)
router.post('/message', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ status: 'error', message: 'Message required' });
    }

    let ticket = await SupportTicket.findOne({
      userId: req.authUser._id,
      status: { $ne: 'closed' }
    });

    const newMessage = {
      sender: 'user',
      senderId: req.authUser._id,
      text: text.trim().slice(0, 2000)
    };

    if (!ticket) {
      // Create new ticket
      ticket = new SupportTicket({
        userId: req.authUser._id,
        status: 'open',
        unreadByAdmin: true,
        unreadByUser: false,
        messages: [newMessage]
      });
      await ticket.save();
    } else {
      ticket.messages.push(newMessage);
      ticket.unreadByAdmin = true;
      await ticket.save();
    }

    await ticket.populate('userId', 'displayName avatarUrl role');

    const addedMsg = ticket.messages[ticket.messages.length - 1];

    // Emit to admin support room
    const io = req.io;
    if (io) {
      io.to(`support:${ticket._id}`).emit('supportMessage', {
        ticketId: ticket._id,
        message: {
          _id: addedMsg._id,
          sender: addedMsg.sender,
          senderId: {
            _id: req.authUser._id,
            displayName: req.authUser.displayName,
            avatarUrl: req.authUser.avatarUrl
          },
          text: addedMsg.text,
          createdAt: addedMsg.createdAt
        }
      });
      // Notify admin panel of new/updated ticket
      io.emit('supportTicketUpdate', {
        ticketId: ticket._id,
        userId: req.authUser._id,
        status: ticket.status,
        unreadByAdmin: true,
        lastMessage: addedMsg.text,
        updatedAt: ticket.updatedAt
      });
    }

    res.json({ status: 'success', data: { ticket, message: addedMsg } });
  } catch (err) {
    console.error('Support message error:', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// ─── Admin Routes ─────────────────────────────────────────────────────────────

// GET /api/support/tickets — list all tickets, optional ?status=open|in-progress|closed|unread
router.get('/tickets', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let filter = {};

    if (status === 'unread') {
      filter.unreadByAdmin = true;
    } else if (status && status !== 'all') {
      filter.status = status;
    }

    const tickets = await SupportTicket.find(filter)
      .sort({ updatedAt: -1 })
      .populate('userId', 'displayName avatarUrl role email')
      .select('-messages'); // exclude messages for list view (perf)

    res.json({ status: 'success', data: tickets });
  } catch (err) {
    console.error('List tickets error:', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// GET /api/support/tickets/counts — counts per status for badge
router.get('/tickets/counts', requireAdmin, async (req, res) => {
  try {
    const [open, inProgress, closed, unread] = await Promise.all([
      SupportTicket.countDocuments({ status: 'open' }),
      SupportTicket.countDocuments({ status: 'in-progress' }),
      SupportTicket.countDocuments({ status: 'closed' }),
      SupportTicket.countDocuments({ unreadByAdmin: true })
    ]);
    res.json({ status: 'success', data: { open, inProgress, closed, unread } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// GET /api/support/tickets/:id — get full ticket with messages
router.get('/tickets/:id', requireAdmin, async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('userId', 'displayName avatarUrl role email');

    if (!ticket) return res.status(404).json({ status: 'error', message: 'Ticket not found' });

    // Mark as read by admin
    if (ticket.unreadByAdmin) {
      ticket.unreadByAdmin = false;
      await ticket.save();
    }

    res.json({ status: 'success', data: ticket });
  } catch (err) {
    console.error('Get ticket error:', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// POST /api/support/tickets/:id/reply — admin replies
router.post('/tickets/:id/reply', requireAdmin, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ status: 'error', message: 'Reply text required' });
    }

    const ticket = await SupportTicket.findById(req.params.id)
      .populate('userId', 'displayName avatarUrl role');
    if (!ticket) return res.status(404).json({ status: 'error', message: 'Ticket not found' });
    if (ticket.status === 'closed') {
      return res.status(400).json({ status: 'error', message: 'Cannot reply to a closed ticket' });
    }

    // Auto-advance to in-progress on first admin reply if still open
    if (ticket.status === 'open') {
      ticket.status = 'in-progress';
    }

    const newMessage = {
      sender: 'admin',
      senderId: req.adminUser._id,
      text: text.trim().slice(0, 2000)
    };

    ticket.messages.push(newMessage);
    ticket.unreadByUser = true;
    ticket.unreadByAdmin = false;
    await ticket.save();

    const addedMsg = ticket.messages[ticket.messages.length - 1];

    // Emit to the support room so user gets it in real-time
    const io = req.io;
    if (io) {
      io.to(`support:${ticket._id}`).emit('supportMessage', {
        ticketId: ticket._id,
        message: {
          _id: addedMsg._id,
          sender: addedMsg.sender,
          senderId: {
            _id: req.adminUser._id,
            displayName: req.adminUser.displayName,
            avatarUrl: req.adminUser.avatarUrl,
            role: req.adminUser.role
          },
          text: addedMsg.text,
          createdAt: addedMsg.createdAt
        }
      });
      // Notify ticket list update
      io.emit('supportTicketUpdate', {
        ticketId: ticket._id,
        userId: ticket.userId._id,
        status: ticket.status,
        unreadByAdmin: false,
        lastMessage: addedMsg.text,
        updatedAt: ticket.updatedAt
      });
    }

    res.json({ status: 'success', data: { ticket, message: addedMsg } });
  } catch (err) {
    console.error('Admin reply error:', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

// PATCH /api/support/tickets/:id/status — change ticket status
router.patch('/tickets/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['open', 'in-progress', 'closed'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid status' });
    }

    const ticket = await SupportTicket.findById(req.params.id)
      .populate('userId', 'displayName avatarUrl role');
    if (!ticket) return res.status(404).json({ status: 'error', message: 'Ticket not found' });

    ticket.status = status;
    if (status === 'closed') ticket.closedAt = new Date();
    await ticket.save();

    // If closed, notify the user's socket so their chat resets
    const io = req.io;
    if (io && status === 'closed') {
      io.to(`support:${ticket._id}`).emit('ticketClosed', { ticketId: ticket._id });
    }
    // Always broadcast ticket update
    if (io) {
      io.emit('supportTicketUpdate', {
        ticketId: ticket._id,
        userId: ticket.userId._id,
        status: ticket.status,
        unreadByAdmin: ticket.unreadByAdmin,
        updatedAt: ticket.updatedAt
      });
    }

    res.json({ status: 'success', data: ticket });
  } catch (err) {
    console.error('Status change error:', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
});

module.exports = router;
