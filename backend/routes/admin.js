const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const PromoCode = require('../models/PromoCode');
const AdminLog = require('../models/AdminLog');
const CustomOffer = require('../models/CustomOffer');
const CustomOfferSubmission = require('../models/CustomOfferSubmission');
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
    const { note } = req.body;
    const tx = await Transaction.findById(req.params.id).populate('userId', 'email displayName');
    if (!tx) return res.status(404).json({ success: false, error: 'Withdrawal not found' });
    if (tx.transactionType !== 'withdrawal') return res.status(400).json({ success: false, error: 'Not a withdrawal transaction' });
    if (tx.status !== 'pending') return res.status(400).json({ success: false, error: `Cannot approve a ${tx.status} withdrawal` });

    tx.status = 'completed';
    tx.metadata = {
      ...tx.metadata,
      approvedBy: req.dbUser.email,
      approvedAt: new Date().toISOString(),
      ...(note && { note })
    };
    await tx.save();

    await createLog(req.dbUser._id, 'APPROVE_WITHDRAWAL', tx.userId._id, {
      txId: tx._id,
      amount: tx.amount,
      method: tx.method,
      destination: tx.payoutDestination,
      ...(note && { note })
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

    // Dynamically set secretConfigured
    const providers = settings.offerwallProviders.map(p => {
      const pObj = p.toObject ? p.toObject() : p;
      const envSecretMap = {
        cpx: 'CPX_HASH_KEY',
        adgem: 'ADGEM_API_KEY',
        lootably: 'LOOTABLY_SECRET',
        torox: 'TOROX_SECRET',
        primeearn: 'PRIMEEARN_SECRET',
        ayet: 'AYET_SECRET',
        adtowall: 'ADTOWALL_SECRET',
        revu: 'REVU_SECRET',
      };
      pObj.secretConfigured = !!process.env[envSecretMap[p.id]];
      return pObj;
    });

    const settingsObj = settings.toObject ? settings.toObject() : settings;
    settingsObj.offerwallProviders = providers;

    res.json({ success: true, settings: settingsObj });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch settings' });
  }
});

// PUT update platform settings
router.put('/settings', requirePermission('manage_withdrawals'), async (req, res) => {
  try {
    const { withdrawalFeePercent, withdrawalMethods, coinsPerUSD, rewardEngine } = req.body;
    const settings = await Settings.getSingleton();

    if (withdrawalFeePercent !== undefined) {
      const fee = Number(withdrawalFeePercent);
      if (!isNaN(fee) && fee >= 0 && fee <= 50) {
        settings.withdrawalFeePercent = fee;
      }
    }

    if (coinsPerUSD !== undefined) {
      const rate = Number(coinsPerUSD);
      if (!isNaN(rate) && rate > 0) {
        settings.coinsPerUSD = rate;
      }
    }

    if (withdrawalMethods !== undefined && Array.isArray(withdrawalMethods)) {
      settings.withdrawalMethods = withdrawalMethods;
    }

    if (rewardEngine !== undefined) {
      settings.rewardEngine = { ...settings.rewardEngine, ...rewardEngine };
    }

    await settings.save();

    await createLog(req.dbUser._id, 'ADJUST_BALANCE', null, {
      action: 'UPDATE_SETTINGS',
      changes: { withdrawalFeePercent, coinsPerUSD, withdrawalMethods, rewardEngine },
    });

    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
});

// ----------------------------------------------------
// OFFERWALLS SECTION
// ----------------------------------------------------

router.put('/offerwalls/:providerId', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const { enabled, conversionRatio } = req.body;
    const settings = await Settings.getSingleton();

    const provider = settings.offerwallProviders.find(p => p.id === req.params.providerId);
    if (!provider) return res.status(404).json({ success: false, error: 'Provider not found' });

    if (enabled !== undefined) provider.enabled = Boolean(enabled);
    if (conversionRatio !== undefined) {
      const ratio = Number(conversionRatio);
      if (!isNaN(ratio) && ratio > 0) provider.conversionRatio = ratio;
    }

    await settings.save();

    await createLog(req.dbUser._id, 'UPDATE_OFFERWALL', null, {
      providerId: provider.id, enabled, conversionRatio
    });

    res.json({ success: true, provider });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update offerwall provider' });
  }
});

// ----------------------------------------------------
// PROMO CODES SECTION
// ----------------------------------------------------

router.get('/promo-codes', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const [codes, total] = await Promise.all([
      PromoCode.find()
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit)),
      PromoCode.countDocuments()
    ]);

    res.json({ success: true, codes, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch promo codes' });
  }
});

router.post('/promo-codes', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const { code, rewardCoins, maxUses, expiresAt } = req.body;

    const newCode = new PromoCode({
      code: code.trim().toUpperCase(),
      rewardCoins: Number(rewardCoins),
      maxUses: Number(maxUses) || 0,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdBy: req.dbUser._id,
    });

    await newCode.save();
    await createLog(req.dbUser._id, 'CREATE_PROMO', null, { code: newCode.code, rewardCoins });

    res.status(201).json({ success: true, code: newCode });
  } catch (error) {
    res.status(500).json({ success: false, error: error.code === 11000 ? 'Promo code already exists' : 'Failed to create promo code' });
  }
});

router.put('/promo-codes/:id', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const { isActive, rewardCoins, expiresAt } = req.body;
    const upd = {};
    if (isActive !== undefined) upd.isActive = Boolean(isActive);
    if (rewardCoins !== undefined) upd.rewardCoins = Number(rewardCoins);
    if (expiresAt !== undefined) upd.expiresAt = expiresAt === null ? null : new Date(expiresAt);

    const promo = await PromoCode.findByIdAndUpdate(req.params.id, upd, { new: true });
    if (!promo) return res.status(404).json({ success: false, error: 'Promo not found' });

    await createLog(req.dbUser._id, 'EDIT_PROMO', null, { codeId: promo._id, ...upd });

    res.json({ success: true, code: promo });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update promo code' });
  }
});

router.delete('/promo-codes/:id', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const promo = await PromoCode.findByIdAndDelete(req.params.id);
    if (!promo) return res.status(404).json({ success: false, error: 'Promo not found' });

    await createLog(req.dbUser._id, 'DELETE_PROMO', null, { code: promo.code });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete promo code' });
  }
});

// ----------------------------------------------------
// CUSTOM OFFERS SECTION
// ----------------------------------------------------

router.get('/custom-offers', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const offers = await CustomOffer.find().sort({ createdAt: -1 }).lean();
    
    const clickCounts = await require('../models/UserActivityLog').aggregate([
      { $match: { actionType: 'click_offer', sourceType: 'featured_offer' } },
      { $group: { _id: '$sourceId', count: { $sum: 1 } } }
    ]);
    
    const clicksMap = {};
    clickCounts.forEach(c => clicksMap[c._id.toString()] = c.count);
    
    const offersWithClicks = offers.map(o => ({
      ...o,
      clicks: clicksMap[o._id.toString()] || 0
    }));

    res.json({ success: true, offers: offersWithClicks });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch custom offers' });
  }
});

router.post('/custom-offers', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const { title, description, rewardAmount, externalLink, trackingType, expirationDate } = req.body;
    const newOffer = new CustomOffer({
      title, description, rewardAmount, externalLink, trackingType, expirationDate: expirationDate || null
    });
    await newOffer.save();
      await createLog(req.dbUser._id, 'CREATE_CUSTOM_OFFER', null, `Created custom offer: ${title}`);
      res.status(201).json({ success: true, offer: newOffer });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to create custom offer' });
    }
  });

  router.put('/custom-offers/:id', requirePermission('manage_offerwalls'), async (req, res) => {
    try {
      const upd = { ...req.body };
      const offer = await CustomOffer.findByIdAndUpdate(req.params.id, upd, { new: true });
      if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' });
      await createLog(req.dbUser._id, 'UPDATE_CUSTOM_OFFER', null, `Updated custom offer: ${offer.title} (Active: ${offer.isActive})`);
      res.json({ success: true, offer });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update custom offer' });
    }
  });

  router.delete('/custom-offers/:id', requirePermission('manage_offerwalls'), async (req, res) => {
    try {
      const offer = await CustomOffer.findByIdAndDelete(req.params.id);
      if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' });
      await createLog(req.dbUser._id, 'DELETE_CUSTOM_OFFER', null, `Deleted custom offer: ${offer.title}`);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to delete custom offer' });
    }
  });

router.get('/custom-offers/submissions/all', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const submissions = await CustomOfferSubmission.find()
      .populate('userId', 'email displayName')
      .populate('offerId', 'title rewardAmount')
      .sort({ createdAt: -1 });
    res.json({ success: true, submissions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
  }
});

// Update submission status (approve/reject)
router.put('/custom-offers/submissions/:id', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const submission = await CustomOfferSubmission.findById(req.params.id)
      .populate('userId')
      .populate('offerId');

    if (!submission) return res.status(404).json({ success: false, error: 'Submission not found' });

    if (submission.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Cannot change status of a ${submission.status} submission` });
    }

    submission.status = status;
    if (adminNote) submission.adminNote = adminNote;
    await submission.save();

      const user = await User.findById(submission.userId._id);

      if (status === 'approved') {
        // Credit the user
        const amountNum = Number(submission.offerId.rewardAmount);
        user.walletBalance += amountNum;
        await user.save();

        await Transaction.create({
          userId: user._id,
          transactionType: 'offer_reward',
          amount: amountNum,
          balanceAfter: user.walletBalance,
          description: `Offer Reward: ${submission.offerId.title}`,
          status: 'completed',
        });

        await createLog(req.dbUser._id, 'APPROVE_CUSTOM_OFFER', user._id, `Approved submission for offer: ${submission.offerId.title}`);
      } else if (status === 'rejected') {
        await createLog(
          req.dbUser._id,
          'REJECT_CUSTOM_OFFER',
          user._id,
          `Rejected submission for offer: ${submission.offerId.title}. Reason: ${adminNote || 'No reason provided'}`
        );
      }

      res.json({ success: true, submission });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to update submission' });
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
    const { reason } = req.body;
    const adminToUpdate = await User.findById(req.params.id);
    if (!adminToUpdate) return res.status(404).json({ success: false, error: 'Admin not found' });

    if (adminToUpdate.email === process.env.PRIMARY_ADMIN_EMAIL) {
      await createLog(req.dbUser._id, 'ATTEMPT_REVOKE_PRIMARY_ADMIN', adminToUpdate._id, { reason: reason || 'N/A' });
      return res.status(403).json({ success: false, error: 'Cannot modify primary admin' });
    }

    const adminUser = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'admin' },
      { role: 'user', adminPermissions: [] },
      { returnDocument: 'after' }
    );
    if (!adminUser) return res.status(404).json({ success: false, error: 'Admin not found' });
    await createLog(req.dbUser._id, 'REVOKE_ADMIN', adminUser._id, { reason: reason || 'No reason provided' });
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

// ----------------------------------------------------
// CHARGEBACK SECTION
// ----------------------------------------------------
router.post('/chargebacks/:transactionId/process', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const parentTx = await Transaction.findById(req.params.transactionId);
    if (!parentTx) return res.status(404).json({ success: false, error: 'Transaction not found' });
    if (parentTx.status === 'reversed') return res.status(400).json({ success: false, error: 'Transaction already reversed' });

    // Reverse the parent transaction amount
    await User.findByIdAndUpdate(parentTx.userId, {
      $inc: { walletBalance: -Math.abs(parentTx.amount) }
    });

    parentTx.status = 'reversed';
    await parentTx.save();

    await createLog(req.dbUser._id, 'PROCESS_CHARGEBACK', parentTx.userId, {
      txId: parentTx._id,
      amount: -Math.abs(parentTx.amount),
    });

    // 2. Cascade reverse linked transactions (e.g. referrals, bonuses derived from this)
    const linkedTxs = await Transaction.find({ linkedTransactionId: parentTx._id, status: { $ne: 'reversed' } });
    for (const linkedTx of linkedTxs) {
      if (linkedTx.transactionType === 'referral_reward') {
        // If it was still on hold, just reverse and deduct from referralEarnings (not wallet balance)
        if (linkedTx.status === 'hold') {
          await User.findByIdAndUpdate(linkedTx.userId, {
            $inc: { referralEarnings: -linkedTx.amount }
          });
        } else {
          // If it was already completed (paid out), deduct from walletBalance AND referralEarnings
          await User.findByIdAndUpdate(linkedTx.userId, {
            $inc: { walletBalance: -linkedTx.amount, referralEarnings: -linkedTx.amount }
          });
        }
      } else {
        // Generic daily bonus or leaderboard refund derived from this offer
        await User.findByIdAndUpdate(linkedTx.userId, {
          $inc: { walletBalance: -linkedTx.amount }
        });
      }
      
      linkedTx.status = 'reversed';
      await linkedTx.save();
      
      await createLog(req.dbUser._id, 'PROCESS_CHARGEBACK_CASCADED', linkedTx.userId, {
        txId: linkedTx._id,
        parentTxId: parentTx._id,
        amount: -linkedTx.amount,
      });
    }

    res.json({ success: true, message: 'Chargeback processed and cascaded', transaction: parentTx, linkedCount: linkedTxs.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to process chargeback' });
  }
});

module.exports = router;
