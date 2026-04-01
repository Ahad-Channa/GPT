const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'BAN_USER',
        'UNBAN_USER',
        'ADJUST_BALANCE',
        'CREATE_ADMIN',
        'REVOKE_ADMIN',
        'EDIT_PERMISSIONS',
        'APPROVE_WITHDRAWAL',
        'REJECT_WITHDRAWAL',
        'COMPLETE_WITHDRAWAL',
      ],
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdminLog', adminLogSchema);
