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
const notify = require('../utils/notify');
const { notifyAdmins } = require('../utils/adminNotify');
const { emitWalletUpdate, emitToUser } = require('../utils/walletEvents');
const { processVipLevelUp } = require('../utils/vipUtils');
const AdminNotification = require('../models/AdminNotification');
const Avatar = require('../models/Avatar');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for Avatar uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../../frontend/public/avatars');
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, ''));
  }
});
const upload = multer({ storage: storage });
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
        { _id: search.length === 24 ? search : null } // Allows search by Object ID 
      ].filter(Boolean); // Ignore the null if search string isn't valid Object ID
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

// GET a single user's transaction history (for admin detail view)
router.get('/users/:id/transactions', requirePermission('manage_users'), async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const [user, txs] = await Promise.all([
      User.findById(req.params.id).select('-__v'),
      Transaction.find({ userId: req.params.id })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean(),
    ]);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, user, transactions: txs });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch user transactions' });
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

    if (isBanned) {
      await notify(user._id, 'account_banned', 'Account Suspended', 'Your account has been suspended by an administrator.');
    }

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
    if (amountNum > 0) {
      user.totalEarned = (user.totalEarned || 0) + amountNum;
    }
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

    await notify(user._id, 'admin_adjustment', 'Balance Adjustment', `An admin has adjusted your balance by ${amountNum > 0 ? '+' : ''}${amountNum} coins. Reason: ${reason || 'N/A'}`, { amount: amountNum });

    // Trigger VIP level-up check if coins were added (admin credits count toward VIP)
    if (amountNum > 0) {
      processVipLevelUp(user, amountNum, emitToUser);
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to adjust balance' });
  }
});

router.put('/users/:id/referral', requirePermission('manage_users'), async (req, res) => {
  try {
    const { referralPercentage } = req.body;
    const userToUpdate = await User.findById(req.params.id);
    if (!userToUpdate) return res.status(404).json({ success: false, error: 'User not found' });

    if (userToUpdate.email === process.env.PRIMARY_ADMIN_EMAIL) {
      return res.status(403).json({ success: false, error: 'Cannot modify primary admin' });
    }

    let val = null; // Unset it by passing null/undefined/empty
    if (referralPercentage !== '' && referralPercentage !== null && referralPercentage !== undefined) {
      val = Number(referralPercentage);
      if (isNaN(val) || val < 0 || val > 100) {
        return res.status(400).json({ success: false, error: 'Invalid referral percentage' });
      }
    }

    const user = await User.findByIdAndUpdate(req.params.id, { referralPercentage: val }, { returnDocument: 'after' });
    await createLog(req.dbUser._id, 'ADJUST_REFERRAL_PCT', user._id, { referralPercentage: val });

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update user referral setting' });
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

    await notify(tx.userId._id, 'withdrawal_approved', 'Withdrawal Approved!', `Your payout of ${Math.abs(tx.amount)} coins has been approved.`, { txId: tx._id });

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

    await notify(tx.userId._id, 'withdrawal_rejected', 'Withdrawal Rejected', `Your withdrawal of ${Math.abs(tx.amount)} coins was rejected. ${refundAmount} coins refunded.`, { txId: tx._id, refundAmount });

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
    const { withdrawalFeePercent, withdrawalMethods, coinsPerUSD, rewardEngine, referralConfig, showGlobalStats } = req.body;
    const settings = await Settings.getSingleton();

    if (showGlobalStats !== undefined) {
      settings.showGlobalStats = Boolean(showGlobalStats);
    }

    if (referralConfig !== undefined) {
      if (referralConfig.globalPercentage !== undefined) {
        settings.referralConfig.globalPercentage = Number(referralConfig.globalPercentage);
      }
      if (referralConfig.holdDays !== undefined) {
        settings.referralConfig.holdDays = Number(referralConfig.holdDays);
      }
      settings.markModified('referralConfig');
    }

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
    const { title, description, rewardAmount, externalLink, trackingType, expirationDate, icon, coverImage } = req.body;
    const newOffer = new CustomOffer({
      title, description, rewardAmount, externalLink, trackingType,
      expirationDate: expirationDate || null,
      icon: icon || null,
      coverImage: coverImage || null,
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
      user.totalEarned = (user.totalEarned || 0) + amountNum;
      await user.save();
      emitWalletUpdate(user.firebaseUid, user.walletBalance);

      const offerTx = await Transaction.create({
        userId: user._id,
        transactionType: 'custom_offer_reward',
        amount: amountNum,
        balanceAfter: user.walletBalance,
        description: `Custom Offer Reward: ${submission.offerId.title}`,
        status: 'completed',
        sourceType: 'offer',
        sourceId: submission.offerId._id,
      });

      await createLog(req.dbUser._id, 'APPROVE_CUSTOM_OFFER', user._id, { offerTitle: submission.offerId.title, submissionId: submission._id });
      await notify(user._id, 'offer_approved', 'Custom Offer Approved!', `Your submission for '${submission.offerId.title}' was approved! +${amountNum} coins.`, { offerId: submission.offerId._id });

      // Trigger VIP level-up check (custom offer rewards are real earnings)
      processVipLevelUp(user, amountNum, emitToUser);

      // ── Referral Commission ──────────────────────────────────────────────
      // If this user was referred by someone, credit the referrer a commission
      if (user.referredBy) {
        try {
          const referrer = await User.findById(user.referredBy);
          if (referrer) {
            const settings = await Settings.getSingleton();
            const holdDays = settings.referralConfig?.holdDays ?? 30;
            const globalPct = settings.referralConfig?.globalPercentage ?? 5;
            const pct = (user.referralPercentage !== null && user.referralPercentage !== undefined)
              ? user.referralPercentage
              : globalPct;
            const refAmount = Math.floor(amountNum * (pct / 100));

            if (refAmount > 0) {
              const holdDate = new Date();
              holdDate.setDate(holdDate.getDate() + holdDays);

              // Increment referralEarnings tracker (not wallet yet — it's on hold)
              await User.updateOne(
                { _id: referrer._id },
                { $inc: { referralEarnings: refAmount } }
              );

              await Transaction.create({
                userId: referrer._id,
                transactionType: 'referral_reward',
                sourceType: 'referral',
                sourceId: offerTx._id,
                linkedTransactionId: offerTx._id,
                amount: refAmount,
                balanceAfter: referrer.walletBalance, // Unchanged — on hold
                description: `Referral Reward from Featured Offer`,
                status: 'hold',
                holdUntil: holdDate,
              });

              await notify(
                referrer._id,
                'referral_earning',
                'Referral Earning!',
                `You earned +${refAmount} coins from ${user.displayName || 'a referral'}'s featured offer.`,
                { amount: refAmount, sourceUserId: user._id }
              );
            }
          }
        } catch (refErr) {
          // Non-fatal: log but don't fail the approval
          console.error('[Referral] Failed to process referral commission for custom offer:', refErr);
        }
      }
      // ─────────────────────────────────────────────────────────────────────

    } else if (status === 'rejected') {
      await createLog(req.dbUser._id, 'REJECT_CUSTOM_OFFER', user._id, {
        offerTitle: submission.offerId.title,
        submissionId: submission._id,
        reason: adminNote || 'No reason provided',
      });
      await notify(user._id, 'offer_rejected', 'Custom Offer Rejected', `Your submission for '${submission.offerId.title}' was rejected.${adminNote ? ' Reason: ' + adminNote : ''}`, { offerId: submission.offerId._id });
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
// LOGS & ANNOUNCEMENTS SECTION
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

// POST /api/admin/announcements
router.post('/announcements', requirePrimaryAdmin, async (req, res) => {
  try {
    const { title, message, targetAll, targetUserIds } = req.body;

    if (targetAll) {
      // Find all valid users to receive the announcement
      const users = await User.find({}).select('_id');
      for (const u of users) {
        await notify(u._id, 'announcement', title, message);
      }
    } else if (targetUserIds && Array.isArray(targetUserIds)) {
      for (const id of targetUserIds) {
        await notify(id, 'announcement', title, message);
      }
    }

    await createLog(req.dbUser._id, 'SEND_ANNOUNCEMENT', null, { title, targetCount: targetAll ? 'all' : targetUserIds.length });
    res.json({ success: true, message: 'Announcements sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to send announcements' });
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

    await notify(parentTx.userId, 'chargeback', 'Transaction Reversed', `A transaction was reversed and -${Math.abs(parentTx.amount)} coins were deducted.`, { txId: parentTx._id, amount: -Math.abs(parentTx.amount) });

    await notifyAdmins({
      category: 'security',
      type: 'chargeback_processed',
      message: `Chargeback processed by ${req.dbUser.displayName || req.dbUser.email} for transaction ${parentTx._id}.`,
      permissionRequired: 'manage_offerwalls',
      metadata: { transactionId: parentTx._id, userId: parentTx.userId }
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

// ----------------------------------------------------
// LEADERBOARD SECTION
// ----------------------------------------------------
const LeaderboardCycle = require('../models/Leaderboard');
const { resetLeaderboard } = require('./leaderboard');

// GET leaderboard config
router.get('/leaderboard-config', requirePrimaryAdmin, async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    res.json({ success: true, leaderboardConfig: settings.leaderboardConfig });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard config' });
  }
});

// PUT update leaderboard config (enable/disable + rewards + visible/rewarded ranks)
router.put('/leaderboard-config', requirePrimaryAdmin, async (req, res) => {
  try {
    const { daily, weekly, monthly } = req.body;
    const settings = await Settings.getSingleton();

    ['daily', 'weekly', 'monthly'].forEach(period => {
      const incoming = req.body[period];
      if (!incoming) return;
      if (incoming.enabled !== undefined) settings.leaderboardConfig[period].enabled = Boolean(incoming.enabled);
      if (incoming.visibleSlots !== undefined) settings.leaderboardConfig[period].visibleSlots = Math.max(5, Math.min(100, Number(incoming.visibleSlots) || 25));
      if (incoming.rewardedRanks !== undefined) settings.leaderboardConfig[period].rewardedRanks = Math.max(0, Math.min(100, Number(incoming.rewardedRanks) || 3));
      if (incoming.rewardTiers !== undefined && Array.isArray(incoming.rewardTiers)) {
        settings.leaderboardConfig[period].rewardTiers = incoming.rewardTiers.map(v => Math.max(0, Number(v) || 0));
      }
    });

    settings.markModified('leaderboardConfig');
    await settings.save();

    await createLog(req.dbUser._id, 'UPDATE_LEADERBOARD_CONFIG', null, { daily, weekly, monthly });

    res.json({ success: true, leaderboardConfig: settings.leaderboardConfig });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to update leaderboard config' });
  }
});

// POST manually trigger a leaderboard reset
router.post('/leaderboard-reset/:period', requirePrimaryAdmin, async (req, res) => {
  try {
    const { period } = req.params;
    if (!['daily', 'weekly', 'monthly'].includes(period)) {
      return res.status(400).json({ success: false, error: 'Invalid period' });
    }
    const result = await resetLeaderboard(period);
    await createLog(req.dbUser._id, 'MANUAL_LEADERBOARD_RESET', null, { period, result });
    res.json({ success: true, result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to reset leaderboard' });
  }
});

// GET leaderboard history (past cycles)
router.get('/leaderboard-history', requirePrimaryAdmin, async (req, res) => {
  try {
    const { period, page = 1, limit = 20 } = req.query;
    const query = { status: 'completed' };
    if (period && ['daily', 'weekly', 'monthly'].includes(period)) query.period = period;

    const [cycles, total] = await Promise.all([
      LeaderboardCycle.find(query)
        .sort({ cycleEnd: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      LeaderboardCycle.countDocuments(query),
    ]);

    res.json({ success: true, cycles, total, totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard history' });
  }
});

// ----------------------------------------------------
// OVERVIEW & NOTIFICATIONS
// ----------------------------------------------------

router.get('/overview-stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const bannedUsers = await User.countDocuments({ isBanned: true });

    // Total pending withdrawals
    const pendingWithdrawalObj = await Transaction.aggregate([
      { $match: { transactionType: 'withdrawal', status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalPendingWithdrawal = pendingWithdrawalObj.length > 0 ? Math.abs(pendingWithdrawalObj[0].total) : 0;

    // Total pending custom offers
    const pendingOffers = await CustomOfferSubmission.countDocuments({ status: 'pending' });

    // Economy - total user balance
    const economyObj = await User.aggregate([
      { $group: { _id: null, total: { $sum: '$walletBalance' } } }
    ]);
    const economyTotal = economyObj.length > 0 ? economyObj[0].total : 0;

    res.json({
      success: true,
      stats: {
        totalUsers,
        bannedUsers,
        totalPendingWithdrawal,
        pendingOffers,
        economyTotal
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch overview stats' });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    const notifs = await AdminNotification.find({ adminId: req.dbUser._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, notifications: notifs });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

router.get('/notifications/counts', async (req, res) => {
  try {
    const counts = await AdminNotification.aggregate([
      { $match: { adminId: req.dbUser._id, read: false } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const countsMap = {};
    counts.forEach(c => countsMap[c._id] = c.count);

    res.json({ success: true, counts: countsMap });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to fetch counts' });
  }
});

router.post('/notifications/mark-read', async (req, res) => {
  try {
    const { category, notificationIds } = req.body;
    const query = { adminId: req.dbUser._id, read: false };

    if (category && category !== 'all') {
      query.category = category;
    } else if (notificationIds && notificationIds.length > 0) {
      query._id = { $in: notificationIds };
    }

    await AdminNotification.updateMany(query, { $set: { read: true } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to mark read' });
  }
});

// ----------------------------------------------------
// UNIFIED PROOFS HUB (Custom Offers & Wallet Transactions)
// ----------------------------------------------------

router.get('/proofs', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    // 1. Get Custom Offer Submissions that are 'pending'
    const pendingCustomOfferSubs = await CustomOfferSubmission.find({ status: 'pending' })
      .populate('userId', 'displayName email avatarUrl')
      .populate('offerId', 'title rewardAmount')
      .sort({ updatedAt: 1 })
      .lean();

    const customOfferProofs = pendingCustomOfferSubs.map(sub => ({
      _id: sub._id,
      type: 'custom_offer',
      status: sub.status,
      user: sub.userId,
      offerTitle: sub.offerId ? sub.offerId.title : 'Unknown Offer',
      rewardAmount: sub.offerId ? sub.offerId.rewardAmount : 0,
      proofText: sub.proofText,
      proofImage: sub.proofImage,
      submittedAt: sub.updatedAt,
    }));

    // 2. Get Transaction Proofs (metadata.userProof exists, status is pending)
    const pendingTxs = await Transaction.find({
      status: 'pending',
      'metadata.userProof': { $exists: true }
    })
      .populate('userId', 'displayName email avatarUrl')
      .sort({ updatedAt: 1 })
      .lean();

    const transactionProofs = pendingTxs.map(tx => ({
      _id: tx._id,
      type: 'transaction',
      status: tx.status,
      user: tx.userId,
      offerTitle: tx.description || 'General Offer',
      rewardAmount: tx.amount,
      proofText: tx.metadata.userProof.text || '',
      proofImage: tx.metadata.userProof.imageUrl || '',
      submittedAt: tx.metadata.userProof.submittedAt || tx.updatedAt,
    }));

    // 3. Combine and Sort by submission date (oldest first for fairness)
    const allProofs = [...customOfferProofs, ...transactionProofs].sort(
      (a, b) => new Date(a.submittedAt) - new Date(b.submittedAt)
    );

    res.status(200).json({ success: true, proofs: allProofs });
  } catch (error) {
    console.error('[/api/admin/proofs] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch proofs' });
  }
});

router.post('/proofs/:type/:id/:action', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const { type, id, action } = req.params;
    const { reason } = req.body; // usually for rejection

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid action' });
    }

    if (type === 'custom_offer') {
      // The logic for this is mostly existing in /custom-offers/submissions/:id/:action 
      // but we can re-implement the short version here for completeness or just update it
      const submission = await CustomOfferSubmission.findById(id).populate('offerId');
      if (!submission) return res.status(404).json({ success: false, error: 'Submission not found' });
      if (submission.status !== 'pending') return res.status(400).json({ success: false, error: 'Not in pending state' });

      if (action === 'approve') {
        submission.status = 'approved';
        // Credit user
        const user = await User.findById(submission.userId);
        if (user) {
          user.walletBalance = (user.walletBalance || 0) + submission.offerId.rewardAmount;
          user.totalEarned = (user.totalEarned || 0) + submission.offerId.rewardAmount;
          await user.save();
          emitWalletUpdate(user.firebaseUid, user.walletBalance);

          await Transaction.create({
            userId: user._id,
            amount: submission.offerId.rewardAmount,
            balanceAfter: user.walletBalance,
            transactionType: 'custom_offer_reward',
            description: `Reward for custom offer: ${submission.offerId.title}`,
            status: 'completed'
          });

          await notify(user._id, 'offer_approved', 'Offer Approved', `Your proof for "${submission.offerId.title}" was approved! +${submission.offerId.rewardAmount} coins.`);
          // Check VIP level-up
          processVipLevelUp(user, submission.offerId.rewardAmount, emitToUser);
        }
      } else {
        submission.status = 'rejected';
        submission.adminNote = reason || 'Your submission did not meet the requirements.';
        await notify(submission.userId, 'offer_rejected', 'Offer Rejected', `Your proof for "${submission.offerId.title}" was rejected. Reason: ${submission.adminNote}`);
      }

      await submission.save();
      await createLog(req.dbUser._id, `CUSTOM_OFFER_${action.toUpperCase()}`, submission.userId, {
        offerId: submission.offerId._id,
        offerTitle: submission.offerId.title,
        ...(action === 'reject' && { reason: reason?.trim() || 'No reason provided' }),
      });

      return res.json({ success: true, message: `Proof ${action}d successfully` });

    } else if (type === 'transaction') {
      const tx = await Transaction.findById(id);
      if (!tx || tx.status !== 'pending') return res.status(404).json({ success: false, error: 'Transaction not found or not pending' });

      const user = await User.findById(tx.userId);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });

      if (action === 'approve') {
        tx.status = 'completed';
        user.walletBalance = (user.walletBalance || 0) + tx.amount;
        user.totalEarned = (user.totalEarned || 0) + tx.amount;
        await user.save();
        emitWalletUpdate(user.firebaseUid, user.walletBalance);
        tx.balanceAfter = user.walletBalance;
        await tx.save();

        await notify(user._id, 'offer_approved', 'Proof Approved', `Your manual proof for "${tx.description}" was approved! +${tx.amount} coins.`);
        // Check VIP level-up
        processVipLevelUp(user, tx.amount, emitToUser);
      } else {
        tx.status = 'rejected';
        tx.metadata = tx.metadata || {};
        tx.metadata.adminNote = reason || 'Proof did not meet requirements.';
        tx.markModified('metadata');
        await tx.save();

        await notify(user._id, 'offer_rejected', 'Proof Rejected', `Your manual proof for "${tx.description}" was rejected. Reason: ${tx.metadata.adminNote}`);
      }

      await createLog(req.dbUser._id, `TRANSACTION_PROOF_${action.toUpperCase()}`, tx.userId, {
        txId: tx._id,
        description: tx.description,
        ...(action === 'reject' && { reason: reason?.trim() || 'No reason provided' }),
      });
      return res.json({ success: true, message: `Proof ${action}d successfully` });

    } else {
      return res.status(400).json({ success: false, error: 'Invalid proof type' });
    }

  } catch (error) {
    console.error('[/api/admin/proofs/:type/:id/:action] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to process proof' });
  }
});

// ==========================================
// AVATAR MANAGEMENT
// ==========================================

// Get all avatars
router.get('/avatars', requirePermission('manage_users'), async (req, res) => {
  try {
    const avatars = await Avatar.find().sort({ createdAt: -1 });
    res.json({ success: true, avatars });
  } catch (error) {
    console.error('[/api/admin/avatars GET] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch avatars' });
  }
});

// Create new avatar
router.post('/avatars', requirePermission('manage_users'), upload.single('image'), async (req, res) => {
  try {
    const { name, isPremium, price } = req.body;
    let url = req.body.url;

    if (req.file) {
      url = `/avatars/${req.file.filename}`;
    }

    if (!url) {
      return res.status(400).json({ success: false, error: 'Image file or URL is required' });
    }

    const avatar = new Avatar({
      name: name || 'Unnamed Avatar',
      url,
      isPremium: isPremium === 'true' || isPremium === true,
      price: Number(price) || 0
    });

    await avatar.save();
    res.json({ success: true, avatar });
  } catch (error) {
    console.error('[/api/admin/avatars POST] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to create avatar' });
  }
});

// Update avatar
router.put('/avatars/:id', requirePermission('manage_users'), upload.single('image'), async (req, res) => {
  try {
    const { name, isPremium, price } = req.body;
    const avatar = await Avatar.findById(req.params.id);
    
    if (!avatar) {
      return res.status(404).json({ success: false, error: 'Avatar not found' });
    }

    if (name) avatar.name = name;
    if (isPremium !== undefined) avatar.isPremium = isPremium === 'true' || isPremium === true;
    if (price !== undefined) avatar.price = Number(price);
    
    if (req.file) {
      avatar.url = `/avatars/${req.file.filename}`;
    } else if (req.body.url) {
      avatar.url = req.body.url;
    }

    await avatar.save();
    res.json({ success: true, avatar });
  } catch (error) {
    console.error('[/api/admin/avatars PUT] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to update avatar' });
  }
});

// Delete avatar
router.delete('/avatars/:id', requirePermission('manage_users'), async (req, res) => {
  try {
    const avatar = await Avatar.findByIdAndDelete(req.params.id);
    if (!avatar) {
      return res.status(404).json({ success: false, error: 'Avatar not found' });
    }
    // Optionally delete the file if it's local
    if (avatar.url.startsWith('/avatars/')) {
      const filePath = path.join(__dirname, '../../frontend/public', avatar.url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.json({ success: true, message: 'Avatar deleted successfully' });
  } catch (error) {
    console.error('[/api/admin/avatars DELETE] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete avatar' });
  }
});

module.exports = router;
