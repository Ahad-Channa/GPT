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
        'UPDATE_SETTINGS',
        'UPDATE_OFFERWALL',
        'CREATE_PROMO',
        'EDIT_PROMO',
        'DELETE_PROMO',
        'ATTEMPT_BAN_PRIMARY_ADMIN',
        'ATTEMPT_BALANCE_PRIMARY_ADMIN',
        'ATTEMPT_EDIT_PERMISSIONS_PRIMARY_ADMIN',
        'ATTEMPT_REVOKE_PRIMARY_ADMIN',
        'CREATE_CUSTOM_OFFER',
        'UPDATE_CUSTOM_OFFER',
        'DELETE_CUSTOM_OFFER',
        'APPROVE_CUSTOM_OFFER',
        'REJECT_CUSTOM_OFFER',
        'CUSTOM_OFFER_APPROVE',
        'CUSTOM_OFFER_REJECT',
        'TRANSACTION_PROOF_APPROVE',
        'TRANSACTION_PROOF_REJECT',
        'PROCESS_CHARGEBACK',
        'PROCESS_CHARGEBACK_CASCADED'
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
