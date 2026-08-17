const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'admin'],
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  }
}, { timestamps: true });

const supportTicketSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'closed'],
    default: 'open'
  },
  unreadByAdmin: {
    type: Boolean,
    default: true   // new ticket = unread for admin
  },
  unreadByUser: {
    type: Boolean,
    default: false
  },
  messages: [messageSchema],
  closedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Index for fast user ticket lookups
supportTicketSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
