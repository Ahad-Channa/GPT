const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const AdminLog = require('../models/AdminLog');
const adminFirebase = require('../config/firebase');
const { verifyToken } = require('../middlewares/authMiddleware');
const { requireAdmin, requirePrimaryAdmin, requirePermission } = require('../middlewares/adminMiddleware');

// === ADMIN ROUTES ENTRY POINT ===
router.use(verifyToken, requireAdmin);

// Utility to create logs
const createLog = async (adminId, action, targetUserId, details) => {
  try {
    await AdminLog.create({ adminId, action, targetUserId, details });
  } catch (error) {
    console.error('Failed to create AdminLog:', error);
  }
};

// ----------------------------------------------------
// USERS SECTION
// ----------------------------------------------------

router.get('/users', requirePermission('manage_users'), async (req, res) => {
  try {
    const { search = '', page = 1, limit = 50 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { firebaseUid: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-__v')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(query);
    res.json({ success: true, users, total });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
});

router.put('/users/:id/ban', requirePermission('manage_users'), async (req, res) => {
  try {
    const { isBanned } = req.body;
    const userToUpdate = await User.findById(req.params.id);
    if (!userToUpdate) return res.status(404).json({ success: false, error: 'User not found' });
    
    if (userToUpdate.email === process.env.PRIMARY_ADMIN_EMAIL) {
      await createLog(req.dbUser._id, 'ATTEMPT_BAN_PRIMARY_ADMIN', userToUpdate._id, { reason: req.body.reason || 'Unauthorized access attempt' });
      return res.status(403).json({ success: false, error: 'Cannot modify primary admin' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { isBanned }, { returnDocument: 'after' });
    await createLog(req.dbUser._id, isBanned ? 'BAN_USER' : 'UNBAN_USER', user._id, { reason: req.body.reason || 'No reason provided' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update user ban status' });
  }
});

router.put('/users/:id/balance', requirePermission('manage_users'), async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (user.email === process.env.PRIMARY_ADMIN_EMAIL) {
      await createLog(req.dbUser._id, 'ATTEMPT_BALANCE_PRIMARY_ADMIN', user._id, { amount, reason });
      return res.status(403).json({ success: false, error: 'Cannot modify primary admin' });
    }

    const amountNum = Number(amount);
    const prevBalance = user.walletBalance;
    user.walletBalance = Math.max(0, user.walletBalance + amountNum);
    await user.save();

    // Create a transaction record for admin balance adjustments
    await Transaction.create({
      userId: user._id,
      transactionType: 'admin_adjustment',
      amount: amountNum,
      balanceAfter: user.walletBalance,
      description: `Admin Adjustment: ${reason || 'No reason provided'} (by ${req.dbUser.displayName || req.dbUser.email})`,
      status: 'completed',
    });

    await createLog(req.dbUser._id, 'ADJUST_BALANCE', user._id, { amount, reason, prevBalance, newBalance: user.walletBalance });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to adjust balance' });
  }
});

// ----------------------------------------------------
// WITHDRAWALS SECTION
// ----------------------------------------------------

// GET all withdrawals (paginated, with filters)
router.get('/withdrawals', requirePermission('manage_withdrawals'), async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;
    const query = { transactionType: 'withdrawal' };
    if (status !== 'all') query.status = status;

    const [withdrawals, total] = await Promise.all([
      Transaction.find(query)
        .populate('userId', 'email displayName walletBalance')
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit)),
      Transaction.countDocuments(query),
    ]);

    res.json({
      success: true,
      withdrawals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch withdrawals' });
  }
});

// PUT approve a withdrawal
router.put('/withdrawals/:id/approve', requirePermission('manage_withdrawals'), async (req, res) => {
  try {
    const tx = await Transaction.findById(req.params.id).populate('userId', 'email displayName');
    if (!tx) return res.status(404).json({ success: false, error: 'Withdrawal not found' });
    if (tx.transactionType !== 'withdrawal') return res.status(400).json({ success: false, error: 'Not a withdrawal transaction' });
    if (tx.status !== 'pending') return res.status(400).json({ success: false, error: `Cannot approve a ${tx.status} withdrawal` });

    tx.status = 'completed';
    tx.metadata = { ...tx.metadata, approvedBy: req.dbUser.email, approvedAt: new Date().toISOString() };
    await tx.save();

    await createLog(req.dbUser._id, 'APPROVE_WITHDRAWAL', tx.userId._id, {
      txId: tx._id,
      amount: tx.amount,
      method: tx.method,
      destination: tx.payoutDestination,
    });

    res.json({ success: true, transaction: tx });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to approve withdrawal' });
  }
});

// PUT reject a withdrawal (refunds coins to user)
router.put('/withdrawals/:id/reject', requirePermission('manage_withdrawals'), async (req, res) => {
  try {
    const { reason } = req.body;
    const tx = await Transaction.findById(req.params.id).populate('userId');
    if (!tx) return res.status(404).json({ success: false, error: 'Withdrawal not found' });
    if (tx.transactionType !== 'withdrawal') return res.status(400).json({ success: false, error: 'Not a withdrawal transaction' });
    if (tx.status !== 'pending') return res.status(400).json({ success: false, error: `Cannot reject a ${tx.status} withdrawal` });

    // Refund: amount is negative (e.g. -500), fee is positive (e.g. 25)
    // Total refund = Math.abs(amount) + fee
    const refundAmount = Math.abs(tx.amount) + (tx.fee || 0);

    const updatedUser = await User.findByIdAndUpdate(
      tx.userId._id,
      { $inc: { walletBalance: refundAmount } },
      { returnDocument: 'after' }
    );

    // Create refund transaction record
    await Transaction.create({
      userId: tx.userId._id,
      transactionType: 'admin_adjustment',
      amount: refundAmount,
      balanceAfter: updatedUser.walletBalance,
      description: `Withdrawal Refund — Request rejected. ${reason ? 'Reason: ' + reason : ''}`,
      status: 'completed',
    });

    tx.status = 'rejected';
    tx.metadata = { ...tx.metadata, rejectedBy: req.dbUser.email, rejectedAt: new Date().toISOString(), reason: reason || 'No reason provided' };
    await tx.save();

    await createLog(req.dbUser._id, 'REJECT_WITHDRAWAL', tx.userId._id, {
      txId: tx._id,
      amount: tx.amount,
      refundAmount,
      reason: reason || 'No reason provided',
    });

    res.json({ success: true, transaction: tx, refundAmount });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to reject withdrawal' });
  }
});

// ----------------------------------------------------
// PLATFORM SETTINGS SECTION
// ----------------------------------------------------

// GET platform settings
router.get('/settings', requirePermission('manage_withdrawals'), async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

// PUT update platform settings
router.put('/settings', requirePermission('manage_withdrawals'), async (req, res) => {
  try {
    const { withdrawalFeePercent, withdrawalMethods, coinsPerUSD } = req.body;
    const settings = await Settings.getSingleton();

    if (withdrawalFeePercent !== undefined) {
      const fee = Number(withdrawalFeePercent);
      if (isNaN(fee) || fee < 0 || fee > 50) {
        return res.status(400).json({ success: false, error: 'Fee must be between 0% and 50%' });
      }
      settings.withdrawalFeePercent = fee;
    }

    if (coinsPerUSD !== undefined) {
      const rate = Number(coinsPerUSD);
      if (isNaN(rate) || rate <= 0) {
        return res.status(400).json({ success: false, error: 'coinsPerUSD must be a positive number' });
      }
      settings.coinsPerUSD = rate;
    }

    if (withdrawalMethods !== undefined && Array.isArray(withdrawalMethods)) {
      settings.withdrawalMethods = withdrawalMethods;
    }

    await settings.save();

    await createLog(req.dbUser._id, 'ADJUST_BALANCE', null, {
      action: 'UPDATE_SETTINGS',
      changes: { withdrawalFeePercent, coinsPerUSD, withdrawalMethods },
    });

    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// ----------------------------------------------------
// STAFF SECTION (Requires Primary Admin)
// ----------------------------------------------------

router.get('/admins', requirePrimaryAdmin, async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('-__v');
    res.json({ success: true, admins });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch admins' });
  }
});

router.post('/admins', requirePrimaryAdmin, async (req, res) => {
  try {
    const { userId, permissions } = req.body;
    const user = await User.findByIdAndUpdate(userId, { role: 'admin', adminPermissions: permissions || [] }, { returnDocument: 'after' });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    await createLog(req.dbUser._id, 'CREATE_ADMIN', user._id, { permissions });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to promote admin' });
  }
});

router.put('/admins/:id/permissions', requirePrimaryAdmin, async (req, res) => {
  try {
    const { permissions } = req.body;
    const adminToUpdate = await User.findById(req.params.id);
    if (!adminToUpdate) return res.status(404).json({ success: false, error: 'Admin not found' });
    
    if (adminToUpdate.email === process.env.PRIMARY_ADMIN_EMAIL) {
      await createLog(req.dbUser._id, 'ATTEMPT_EDIT_PERMISSIONS_PRIMARY_ADMIN', adminToUpdate._id, { permissions });
      return res.status(403).json({ success: false, error: 'Cannot modify primary admin' });
    }

    const admin = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'admin' },
      { adminPermissions: permissions },
      { returnDocument: 'after' }
    );
    if (!admin) return res.status(404).json({ success: false, error: 'Admin not found' });
    await createLog(req.dbUser._id, 'EDIT_PERMISSIONS', admin._id, { permissions });
    res.json({ success: true, admin });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update admin permissions' });
  }
});

router.post('/create-admin-credentials', requirePrimaryAdmin, async (req, res) => {
  try {
    const { email, password, displayName, permissions } = req.body;

    const pwdRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    if (!password || !pwdRegex.test(password)) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters and include 1 special character and 1 number.' });
    }
    const nameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!displayName || !nameRegex.test(displayName)) {
      return res.status(400).json({ success: false, error: 'Invalid User Name.' });
    }

    const userRecord = await adminFirebase.auth().createUser({ email, password, displayName });
    const newUser = new User({ firebaseUid: userRecord.uid, email: userRecord.email, displayName, role: 'admin', adminPermissions: permissions || [] });
    await newUser.save();
    await createLog(req.dbUser._id, 'CREATE_ADMIN', newUser._id, { method: 'DIRECT_MINT', permissions });

    res.json({ success: true, user: newUser });
  } catch (error) {
    console.error('Create Admin Credentials Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to mint admin credentials' });
  }
});

router.delete('/admins/:id', requirePrimaryAdmin, async (req, res) => {
  try {
    const adminToUpdate = await User.findById(req.params.id);
    if (!adminToUpdate) return res.status(404).json({ success: false, error: 'Admin not found' });

    if (adminToUpdate.email === process.env.PRIMARY_ADMIN_EMAIL) {
      await createLog(req.dbUser._id, 'ATTEMPT_REVOKE_PRIMARY_ADMIN', adminToUpdate._id, {});
      return res.status(403).json({ success: false, error: 'Cannot modify primary admin' });
    }

    const adminUser = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'admin' },
      { role: 'user', adminPermissions: [] },
      { returnDocument: 'after' }
    );
    if (!adminUser) return res.status(404).json({ success: false, error: 'Admin not found' });
    await createLog(req.dbUser._id, 'REVOKE_ADMIN', adminUser._id, {});
    res.json({ success: true, user: adminUser });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to revoke admin status' });
  }
});

// ----------------------------------------------------
// LOGS SECTION
// ----------------------------------------------------
router.get('/logs', requirePrimaryAdmin, async (req, res) => {
  try {
    const logs = await AdminLog.find()
      .populate('adminId', 'email displayName')
      .populate('targetUserId', 'email displayName')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch logs' });
  }
});

module.exports = router;
