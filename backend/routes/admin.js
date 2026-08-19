const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const PromoCode = require('../models/PromoCode');
const AdminLog = require('../models/AdminLog');
const CustomOffer = require('../models/CustomOffer');
const CustomOfferSubmission = require('../models/CustomOfferSubmission');
const DirectOffer = require('../models/DirectOffer');
const ClickLog = require('../models/ClickLog');
const ProviderConfig = require('../models/ProviderConfig');
const Conversion = require('../models/Conversion');
const PostbackLog = require('../models/PostbackLog');
const adminFirebase = require('../config/firebase');
const { verifyToken } = require('../middlewares/authMiddleware');
const { requireAdmin, requirePrimaryAdmin, requirePermission } = require('../middlewares/adminMiddleware');
const notify = require('../utils/notify');
const { notifyAdmins } = require('../utils/adminNotify');
const { emitWalletUpdate, emitToUser } = require('../utils/walletEvents');
const { processVipLevelUp } = require('../utils/vipUtils');
const {
  normalizeDisplayPlacements,
  parseAllowedCountriesInput,
} = require('../utils/directOfferInput');
const {
  REAL_OFFER_EARNING_TYPES,
  getEarningHoldDecision,
} = require('../utils/earningTypes');
const AdminNotification = require('../models/AdminNotification');
const Avatar = require('../models/Avatar');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const PROVIDER_TYPES = ['offerwall', 'direct', 'affiliate_network', 'advertiser', 'internal'];
const SECURITY_METHODS = ['none', 'shared_secret', 'md5', 'sha1', 'sha256', 'sha512', 'hmac', 'token', 'custom_adapter'];
const INTERNAL_STATUSES = ['pending', 'approved', 'rejected', 'reversed'];
const PROCESSING_STATES = ['pending', 'claimed', 'processing', 'processed', 'failed', 'reversal_processing', 'reversed', 'reversal_failed'];
const POSTBACK_RESULTS = ['received', 'accepted', 'rejected', 'duplicate', 'ignored', 'error'];
const CLICK_STATUSES = ['clicked', 'pending', 'approved', 'rejected'];
const CAMPAIGN_TYPES = ['direct_offer', 'offerwall', 'campaign', 'generic'];
const PARAM_NAME_RE = /^[A-Za-z0-9_.:-]{1,80}$/;
const CREDENTIAL_REQUIRED_METHODS = ['shared_secret', 'token', 'md5', 'sha1', 'sha256', 'sha512', 'hmac'];
const SENSITIVE_ADMIN_KEY_PATTERN = /(authorization|bearer|api[_-]?key|secret|password|private[_-]?key|access[_-]?token|refresh[_-]?token|credential|client[_-]?secret)/i;

const validationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const clampInt = (value, fallback, min, max) => {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const getPagination = (query = {}) => {
  const page = clampInt(query.page, 1, 1, 100000);
  const limit = clampInt(query.limit, 25, 1, 100);
  return { page, limit, skip: (page - 1) * limit };
};

const cleanString = (value, max = 200) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') throw validationError('Expected a scalar string value.');
  return String(value).trim().slice(0, max);
};
const cleanProviderId = (value) => cleanString(value, 80).toLowerCase();

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

const validateParamName = (value, field, required = false) => {
  const clean = cleanString(value, 80);
  if (!clean) {
    if (required) throw new Error(`${field} is required.`);
    return '';
  }
  if (!PARAM_NAME_RE.test(clean)) throw new Error(`${field} contains invalid characters.`);
  return clean;
};

const normalizeAliases = (values, field) => {
  if (!Array.isArray(values)) throw new Error(`${field} must be an array.`);
  const aliases = [...new Set(values.map((value) => cleanString(value, 80).toLowerCase()).filter(Boolean))];
  if (aliases.length === 0) throw new Error(`${field} requires at least one alias.`);
  return aliases;
};

const validateStatusMappings = (statusMappings = {}) => {
  if (!statusMappings || typeof statusMappings !== 'object' || Array.isArray(statusMappings)) {
    throw validationError('statusMappings must be an object.');
  }
  const normalized = {
    pending: normalizeAliases(statusMappings.pending || ['pending'], 'pending aliases'),
    approved: normalizeAliases(statusMappings.approved || ['approved'], 'approved aliases'),
    rejected: normalizeAliases(statusMappings.rejected || ['rejected'], 'rejected aliases'),
    reversal: normalizeAliases(statusMappings.reversal || statusMappings.reversed || ['reversed'], 'reversal aliases'),
  };
  const seen = new Map();
  for (const [status, aliases] of Object.entries(normalized)) {
    for (const alias of aliases) {
      if (seen.has(alias) && seen.get(alias) !== status) {
        throw new Error(`Status alias "${alias}" maps to both ${seen.get(alias)} and ${status}.`);
      }
      seen.set(alias, status);
    }
  }
  return normalized;
};

const sanitizeProviderSettings = (settings = {}) => {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return {};
  return Object.fromEntries(Object.entries(settings).slice(0, 100).map(([key, value]) => {
    const cleanKey = cleanString(key, 120);
    if (SENSITIVE_ADMIN_KEY_PATTERN.test(cleanKey)) return [cleanKey, '[REDACTED]'];
    return [cleanKey, boundAdminPayload(value)];
  }));
};

const validateProviderSettings = (settings = {}) => {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return {};
  for (const key of Object.keys(settings)) {
    if (SENSITIVE_ADMIN_KEY_PATTERN.test(key)) {
      throw validationError('Sensitive provider settings must use the write-only secret field or secretEnvVar.');
    }
  }
  return boundAdminPayload(settings);
};

const normalizeExtraParameterMappings = (extra = {}) => {
  if (!extra || typeof extra !== 'object' || Array.isArray(extra)) return {};
  return Object.fromEntries(Object.entries(extra).map(([key, value]) => [
    validateParamName(key, 'extra mapping key', true),
    validateParamName(value, `extra mapping ${key}`, true),
  ]));
};

const validateParameterMappings = (parameterMappings = {}) => {
  if (!parameterMappings || typeof parameterMappings !== 'object' || Array.isArray(parameterMappings)) {
    throw validationError('parameterMappings must be an object.');
  }
  const normalized = {
    clickId: validateParamName(parameterMappings.clickId || 'click_id', 'clickId mapping', true),
    transactionId: validateParamName(parameterMappings.transactionId || 'transaction_id', 'transactionId mapping', true),
    status: validateParamName(parameterMappings.status || 'status', 'status mapping', true),
    payout: validateParamName(parameterMappings.payout || 'payout', 'payout mapping'),
    eventType: validateParamName(parameterMappings.eventType || 'event_type', 'eventType mapping'),
    providerUserId: validateParamName(parameterMappings.providerUserId || 'user_id', 'providerUserId mapping'),
    extra: normalizeExtraParameterMappings(parameterMappings.extra),
  };
  const configured = Object.entries(normalized)
    .filter(([key, value]) => key !== 'extra' && value)
    .map(([, value]) => value);
  if (new Set(configured).size !== configured.length) {
    throw new Error('Parameter mappings cannot use duplicate names.');
  }
  return normalized;
};

const validateSecurityConfig = (security = {}, existing = {}) => {
  if (!security || typeof security !== 'object' || Array.isArray(security)) {
    throw validationError('security must be an object.');
  }
  if (hasOwn(security, 'credentials')) {
    throw validationError('Credentials must be updated through the write-only secret field.');
  }
  const methodChanged = hasOwn(security, 'method') && security.method !== existing.method;
  const method = cleanString(security.method || existing.method || 'none', 40);
  if (!SECURITY_METHODS.includes(method)) throw new Error('Unsupported security method.');

  const normalized = {
    method,
    signatureParam: validateParamName(security.signatureParam ?? (methodChanged ? '' : existing.signatureParam) ?? '', 'signatureParam'),
    tokenParam: validateParamName(security.tokenParam ?? (methodChanged ? '' : existing.tokenParam) ?? '', 'tokenParam'),
    headerName: cleanString(security.headerName ?? (methodChanged ? '' : existing.headerName) ?? '', 120),
    hashAlgorithm: cleanString(security.hashAlgorithm ?? (methodChanged ? '' : existing.hashAlgorithm) ?? '', 40),
    hashTemplate: cleanString(security.hashTemplate ?? (methodChanged ? '' : existing.hashTemplate) ?? '', 500),
    caseInsensitiveSignature: Boolean(security.caseInsensitiveSignature ?? existing.caseInsensitiveSignature),
    ipAllowlistRequired: Boolean(security.ipAllowlistRequired ?? existing.ipAllowlistRequired),
    secretEnvVar: cleanString(security.secretEnvVar ?? (methodChanged ? '' : existing.secretEnvVar) ?? '', 120),
    adapterKey: cleanString(security.adapterKey ?? (methodChanged ? '' : existing.adapterKey) ?? '', 120),
    config: typeof (security.config ?? (methodChanged ? {} : existing.config)) === 'object' && !Array.isArray(security.config ?? (methodChanged ? {} : existing.config))
      ? (security.config ?? existing.config)
      : {},
  };

  if (['shared_secret', 'token'].includes(method) && !normalized.tokenParam && !normalized.headerName) {
    throw new Error('Shared secret/token security requires tokenParam or headerName.');
  }
  if (['md5', 'sha1', 'sha256', 'sha512', 'hmac'].includes(method) && !normalized.signatureParam) {
    throw new Error('Signature security requires signatureParam.');
  }
  if (['md5', 'sha1', 'sha256', 'sha512', 'hmac'].includes(method) && !normalized.hashTemplate && !normalized.adapterKey) {
    throw new Error('Signature security requires hashTemplate or adapterKey.');
  }
  return normalized;
};

const parseWriteOnlySecret = (value) => {
  if (value === undefined) return { supplied: false, value: '' };
  if (typeof value !== 'string') throw validationError('Secret must be a string.');
  const secret = value.trim();
  if (secret.length > 500) throw validationError('Secret is too long.');
  return { supplied: true, value: secret };
};

const assertProviderCredentialState = ({ security, existingCredentials, incomingSecret = '', removeSecret = false }) => {
  if (!CREDENTIAL_REQUIRED_METHODS.includes(security.method)) return;
  const hasCredential = Boolean(existingCredentials || incomingSecret || security.secretEnvVar);
  if (removeSecret && !security.secretEnvVar) {
    throw validationError('Cannot remove credential while selected security method requires one.');
  }
  if (!hasCredential) {
    throw validationError('Selected security method requires a credential or secretEnvVar.');
  }
};

const applyWriteOnlyProviderSecret = ({ nextSecurity, existingCredentials, secretInput, removeSecret }) => {
  const credentials = removeSecret
    ? undefined
    : secretInput.value
      ? { secret: secretInput.value }
      : existingCredentials;
  assertProviderCredentialState({
    security: nextSecurity,
    existingCredentials: credentials,
    removeSecret,
  });
  if (credentials) nextSecurity.credentials = credentials;
  else delete nextSecurity.credentials;
  return nextSecurity;
};

const normalizeIpAllowlist = (list) => {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map((item) => cleanString(item, 80)).filter(Boolean))].slice(0, 200);
};

const normalizeResponseConfig = (config = {}) => ({
  successStatus: clampInt(config.successStatus, 200, 100, 599),
  successBody: cleanString(config.successBody ?? '1', 500),
  duplicateStatus: clampInt(config.duplicateStatus, 200, 100, 599),
  duplicateBody: cleanString(config.duplicateBody ?? '1', 500),
  errorStatus: clampInt(config.errorStatus, 200, 100, 599),
  errorBody: cleanString(config.errorBody ?? '0', 500),
});

const serializeProviderConfig = (provider) => {
  const doc = typeof provider.toObject === 'function' ? provider.toObject() : { ...provider };
  const credentialsConfigured = Boolean(provider?.security?.credentials || doc?.security?.secretEnvVar);
  if (doc.security) {
    delete doc.security.credentials;
    doc.security.credentialsConfigured = credentialsConfigured;
  }
  doc.providerSettings = sanitizeProviderSettings(doc.providerSettings);
  return doc;
};

const sanitizeDirectOfferAdmin = (offer) => {
  const doc = typeof offer.toObject === 'function' ? offer.toObject() : { ...offer };
  doc.postbackSecretConfigured = Boolean(doc.postbackSecretKey);
  delete doc.postbackSecretKey;
  return doc;
};

const boundAdminPayload = (value, depth = 0) => {
  if (depth > 4) return '[Truncated]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return value.length > 1000 ? `${value.slice(0, 1000)}...[Truncated]` : value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => boundAdminPayload(item, depth + 1));
  return Object.fromEntries(Object.entries(value).slice(0, 100).map(([key, item]) => [
    cleanString(key, 120),
    SENSITIVE_ADMIN_KEY_PATTERN.test(key) ? '[REDACTED]' : boundAdminPayload(item, depth + 1),
  ]));
};

const serializeClickLogAdmin = (click) => ({
  _id: click._id,
  clickId: click.clickId,
  providerId: click.providerId,
  providerType: click.providerType,
  campaignType: click.campaignType,
  campaignId: click.campaignId,
  offer: click.offerId ? {
    _id: click.offerId._id || click.offerId,
    title: click.offerId.title,
    rewardAmount: click.offerId.rewardAmount,
  } : null,
  user: click.userId ? {
    _id: click.userId._id || click.userId,
    displayName: click.userId.displayName,
    email: click.userId.email,
  } : null,
  country: click.country,
  device: click.device,
  status: click.status,
  rewardAmount: click.rewardAmount,
  advertiserPayout: click.advertiserPayout,
  convertedAt: click.convertedAt,
  transactionId: click.transactionId,
  createdAt: click.createdAt,
});

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
    const { referralPercentage, referredByCode, clearReferredBy } = req.body;
    const userToUpdate = await User.findById(req.params.id);
    if (!userToUpdate) return res.status(404).json({ success: false, error: 'User not found' });

    if (userToUpdate.email === process.env.PRIMARY_ADMIN_EMAIL) {
      return res.status(403).json({ success: false, error: 'Cannot modify primary admin' });
    }

    const updateFields = {};

    // Handle referral percentage
    if (referralPercentage !== undefined) {
      let val = null;
      if (referralPercentage !== '' && referralPercentage !== null) {
        val = Number(referralPercentage);
        if (isNaN(val) || val < 0 || val > 100) {
          return res.status(400).json({ success: false, error: 'Invalid referral percentage' });
        }
      }
      updateFields.referralPercentage = val;
    }

    // Handle setting referredBy via referral code (for testing / fixing existing accounts)
    if (clearReferredBy) {
      updateFields.referredBy = null;
    } else if (referredByCode) {
      const referrer = await User.findOne({ referralCode: referredByCode.toUpperCase() });
      if (!referrer) return res.status(404).json({ success: false, error: 'Referral code not found — no user has that code.' });
      if (referrer._id.toString() === req.params.id) return res.status(400).json({ success: false, error: 'User cannot refer themselves.' });
      updateFields.referredBy = referrer._id;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateFields, { returnDocument: 'after' });
    await createLog(req.dbUser._id, 'ADJUST_REFERRAL_PCT', user._id, { referralPercentage: updateFields.referralPercentage, referredByCode });

    res.json({ success: true, user });
  } catch (error) {
    console.error('[PUT /users/:id/referral] Error:', error);
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
    const providerConfigs = await ProviderConfig.find({}).select('providerId enabled type security.method updatedAt').lean();
    const providerConfigMap = new Map(providerConfigs.map((config) => [config.providerId, config]));

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
      const providerConfig = providerConfigMap.get(pObj.id);
      pObj.providerConfig = providerConfig ? {
        configured: true,
        enabled: Boolean(providerConfig.enabled),
        type: providerConfig.type,
        securityMethod: providerConfig.security?.method || 'none',
        updatedAt: providerConfig.updatedAt,
        readiness: providerConfig.enabled ? 'generic_tracking_ready' : 'configured_paused',
      } : {
        configured: false,
        readiness: 'legacy_provider',
      };
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
    const { withdrawalFeePercent, withdrawalMethods, coinsPerUSD, rewardEngine, referralConfig, earningHoldConfig, showGlobalStats } = req.body;
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
      if (referralConfig.signupBonusCoins !== undefined) {
        settings.referralConfig.signupBonusCoins = Math.max(0, Number(referralConfig.signupBonusCoins) || 0);
      }
      settings.markModified('referralConfig');
    }

    if (earningHoldConfig !== undefined) {
      settings.set('earningHoldConfig', {
        enabled: earningHoldConfig.enabled !== undefined ? Boolean(earningHoldConfig.enabled) : (settings.earningHoldConfig?.enabled || false),
        threshold: earningHoldConfig.threshold !== undefined ? Math.max(0, Number(earningHoldConfig.threshold) || 0) : (settings.earningHoldConfig?.threshold || 5000),
        holdDays: earningHoldConfig.holdDays !== undefined ? Math.max(0, Number(earningHoldConfig.holdDays) || 0) : (settings.earningHoldConfig?.holdDays || 30)
      });
      settings.markModified('earningHoldConfig');
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

router.get('/offerwall-providers', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const settings = await Settings.getSingleton();
    const providerConfigs = await ProviderConfig.find({}).select('providerId enabled type security.method updatedAt').lean();
    const providerConfigMap = new Map(providerConfigs.map((config) => [config.providerId, config]));
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

    const providers = settings.offerwallProviders.map((provider) => {
      const pObj = provider.toObject ? provider.toObject() : { ...provider };
      const providerConfig = providerConfigMap.get(pObj.id);
      return {
        ...pObj,
        secretConfigured: !!process.env[envSecretMap[pObj.id]],
        providerConfig: providerConfig ? {
          configured: true,
          enabled: Boolean(providerConfig.enabled),
          type: providerConfig.type,
          securityMethod: providerConfig.security?.method || 'none',
          updatedAt: providerConfig.updatedAt,
          readiness: providerConfig.enabled ? 'generic_tracking_ready' : 'configured_paused',
        } : {
          configured: false,
          readiness: 'legacy_provider',
        },
      };
    });

    res.json({ success: true, providers });
  } catch (error) {
    console.error('[/api/admin/offerwall-providers GET] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch offerwall providers' });
  }
});

// GET /api/admin/provider-configs — generic tracking provider configuration
router.get('/provider-configs', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};
    const providerId = cleanProviderId(req.query.providerId);
    const type = cleanString(req.query.type, 40);
    const enabled = cleanString(req.query.enabled, 10);
    if (providerId) filter.providerId = providerId;
    if (type) {
      if (!PROVIDER_TYPES.includes(type)) return res.status(400).json({ success: false, error: 'Invalid provider type' });
      filter.type = type;
    }
    if (enabled) {
      if (!['true', 'false'].includes(enabled)) return res.status(400).json({ success: false, error: 'Invalid enabled filter' });
      filter.enabled = enabled === 'true';
    }

    const [providers, total] = await Promise.all([
      ProviderConfig.find(filter).sort({ providerId: 1 }).skip(skip).limit(limit),
      ProviderConfig.countDocuments(filter),
    ]);

    res.json({
      success: true,
      providers: providers.map(serializeProviderConfig),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[/api/admin/provider-configs GET] Error:', error);
    res.status(error.statusCode || 500).json({ success: false, error: error.statusCode ? error.message : 'Failed to fetch provider configs' });
  }
});

// GET /api/admin/provider-configs/:providerId — sanitized provider detail
router.get('/provider-configs/:providerId', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const providerId = cleanProviderId(req.params.providerId);
    const provider = await ProviderConfig.findOne({ providerId });
    if (!provider) return res.status(404).json({ success: false, error: 'Provider config not found' });
    res.json({ success: true, provider: serializeProviderConfig(provider) });
  } catch (error) {
    console.error('[/api/admin/provider-configs/:providerId GET] Error:', error);
    res.status(error.statusCode || 500).json({ success: false, error: error.statusCode ? error.message : 'Failed to fetch provider config' });
  }
});

// POST /api/admin/provider-configs — create generic provider config
router.post('/provider-configs', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const providerId = cleanProviderId(req.body.providerId);
    if (!providerId) return res.status(400).json({ success: false, error: 'providerId is required' });
    const type = cleanString(req.body.type || 'offerwall', 40);
    if (!PROVIDER_TYPES.includes(type)) return res.status(400).json({ success: false, error: 'Invalid provider type' });

    const security = validateSecurityConfig(req.body.security || {});
    const secretInput = parseWriteOnlySecret(req.body.secret);
    applyWriteOnlyProviderSecret({
      nextSecurity: security,
      existingCredentials: undefined,
      secretInput,
      removeSecret: false,
    });

    const provider = await ProviderConfig.create({
      providerId,
      name: cleanString(req.body.name, 120) || providerId,
      label: cleanString(req.body.label, 120),
      type,
      enabled: Boolean(req.body.enabled),
      parameterMappings: validateParameterMappings(req.body.parameterMappings || {}),
      statusMappings: validateStatusMappings(req.body.statusMappings || {}),
      security,
      responseConfig: normalizeResponseConfig(req.body.responseConfig || {}),
      ipAllowlist: normalizeIpAllowlist(req.body.ipAllowlist || []),
      providerSettings: validateProviderSettings(req.body.providerSettings || {}),
    });

    await createLog(req.dbUser._id, 'CREATE_PROVIDER_CONFIG', null, { providerId });
    res.status(201).json({ success: true, provider: serializeProviderConfig(provider) });
  } catch (error) {
    const message = error.code === 11000 ? 'Provider ID already exists' : (error.message || 'Failed to create provider config');
    res.status(400).json({ success: false, error: message });
  }
});

// PUT /api/admin/provider-configs/:providerId — update generic provider config
router.put('/provider-configs/:providerId', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const providerId = cleanProviderId(req.params.providerId);
    const provider = await ProviderConfig.findOne({ providerId }).select('+security.credentials');
    if (!provider) return res.status(404).json({ success: false, error: 'Provider config not found' });
    const existingCredentials = provider.security?.credentials;
    const secretInput = parseWriteOnlySecret(req.body.secret);
    const removeSecret = req.body.removeSecret === true;

    if (hasOwn(req.body, 'name')) provider.name = cleanString(req.body.name, 120) || provider.providerId;
    if (hasOwn(req.body, 'label')) provider.label = cleanString(req.body.label, 120);
    if (hasOwn(req.body, 'type')) {
      const type = cleanString(req.body.type, 40);
      if (!PROVIDER_TYPES.includes(type)) return res.status(400).json({ success: false, error: 'Invalid provider type' });
      provider.type = type;
    }
    if (hasOwn(req.body, 'enabled')) provider.enabled = Boolean(req.body.enabled);
    if (hasOwn(req.body, 'parameterMappings')) provider.parameterMappings = validateParameterMappings(req.body.parameterMappings);
    if (hasOwn(req.body, 'statusMappings')) provider.statusMappings = validateStatusMappings(req.body.statusMappings);
    const nextSecurity = validateSecurityConfig(hasOwn(req.body, 'security') ? req.body.security : {}, provider.security || {});
    provider.security = applyWriteOnlyProviderSecret({
      nextSecurity,
      existingCredentials,
      secretInput,
      removeSecret,
    });
    if (hasOwn(req.body, 'responseConfig')) provider.responseConfig = normalizeResponseConfig(req.body.responseConfig);
    if (hasOwn(req.body, 'ipAllowlist')) provider.ipAllowlist = normalizeIpAllowlist(req.body.ipAllowlist);
    if (hasOwn(req.body, 'providerSettings')) {
      provider.providerSettings = validateProviderSettings(req.body.providerSettings);
    }

    await provider.save();
    await createLog(req.dbUser._id, 'UPDATE_PROVIDER_CONFIG', null, { providerId });
    res.json({ success: true, provider: serializeProviderConfig(provider) });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message || 'Failed to update provider config' });
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
    const { code, rewardCoins, maxUses, expiresAt, minEarningsLast7Days } = req.body;

    const newCode = new PromoCode({
      code: code.trim().toUpperCase(),
      rewardCoins: Number(rewardCoins),
      maxUses: Number(maxUses) || 0,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      minEarningsLast7Days: Number(minEarningsLast7Days) || 0,
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
    const { title, description, rewardAmount, externalLink, trackingType, expirationDate, icon, coverImage, requirements, platforms } = req.body;
    const newOffer = new CustomOffer({
      title, description, rewardAmount, externalLink, trackingType,
      expirationDate: expirationDate || null,
      icon: icon || null,
      coverImage: coverImage || null,
      requirements: Array.isArray(requirements) ? requirements : [],
      platforms: platforms || { desktop: true, android: true, ios: true },
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
    console.log(`[Approval] Route hit: submissionId=${req.params.id}, status=${status}`);

    const submission = await CustomOfferSubmission.findById(req.params.id)
      .populate('userId')
      .populate('offerId');

    if (!submission) {
      console.log(`[Approval] Submission not found: ${req.params.id}`);
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }

    console.log(`[Approval] Found submission. Current status: ${submission.status}`);

    if (submission.status !== 'pending') {
      console.log(`[Approval] BLOCKED — submission already ${submission.status}`);
      return res.status(400).json({ success: false, error: `Cannot change status of a ${submission.status} submission` });
    }

    submission.status = status;
    if (adminNote) submission.adminNote = adminNote;
    await submission.save();
    console.log(`[Approval] Status saved → ${status}`);

    // Use the already-populated user document (avoids double-fetch)
    const user = submission.userId;
    console.log(`[Approval] User from submission: ${user?._id}`);
    const freshUser = await User.findById(user._id);
    console.log(`[Approval] freshUser: ${freshUser?._id}, referredBy: ${freshUser?.referredBy}`);

    if (status === 'approved') {
      const settings = await Settings.getSingleton();
      const amountNum = Number(submission.offerId.rewardAmount);
      
      let creditBalance = amountNum;
      let txStatus = 'completed';
      let holdDate = null;
      
      if (settings.earningHoldConfig?.enabled && amountNum >= settings.earningHoldConfig.threshold) {
          txStatus = 'hold';
          creditBalance = 0; // do not add to wallet yet
          holdDate = new Date();
          holdDate.setDate(holdDate.getDate() + (settings.earningHoldConfig.holdDays || 30));
      }

      freshUser.walletBalance += creditBalance;
      freshUser.totalEarned = (freshUser.totalEarned || 0) + amountNum;
      await freshUser.save();
      emitWalletUpdate(freshUser.firebaseUid, freshUser.walletBalance);

      const offerTx = await Transaction.create({
        userId: freshUser._id,
        transactionType: 'custom_offer_reward',
        amount: amountNum,
        balanceAfter: freshUser.walletBalance,
        description: `Custom Offer Reward: ${submission.offerId.title}`,
        status: txStatus,
        holdUntil: holdDate,
        sourceType: 'offer',
        sourceId: submission.offerId._id,
      });

      await createLog(req.dbUser._id, 'APPROVE_CUSTOM_OFFER', freshUser._id, { offerTitle: submission.offerId.title, submissionId: submission._id });
      
      const notifTitle = txStatus === 'hold' ? 'Offer Approved & Held' : 'Custom Offer Approved!';
      const notifMsg = txStatus === 'hold'
        ? `Your submission for '${submission.offerId.title}' was approved! +${amountNum} coins placed on hold for ${settings.earningHoldConfig.holdDays || 30} days.`
        : `Your submission for '${submission.offerId.title}' was approved! +${amountNum} coins.`;
      
      await notify(freshUser._id, 'offer_approved', notifTitle, notifMsg, { offerId: submission.offerId._id });

      // Trigger VIP level-up check (custom offer rewards are real earnings)
      processVipLevelUp(freshUser, amountNum, emitToUser);

      // ── Referral Commission ──────────────────────────────────────────────
      let commissionResult = { fired: false, reason: 'not_checked' };
      console.log(`[Referral] Checking referredBy for user ${freshUser._id}: ${freshUser.referredBy}`);
      if (freshUser.referredBy) {
        try {
          const referrer = await User.findById(freshUser.referredBy);
          console.log(`[Referral] Found referrer: ${referrer?._id}`);
          if (referrer) {
            const settings = await Settings.getSingleton();
            const holdDays = settings.referralConfig?.holdDays ?? 30;
            const globalPct = settings.referralConfig?.globalPercentage ?? 5;
            // FIX: treat 0 as "not set" — it falls back to the global platform percentage
            const pct = (freshUser.referralPercentage != null && freshUser.referralPercentage > 0)
              ? freshUser.referralPercentage
              : globalPct;
            const refAmount = Math.floor(amountNum * (pct / 100));
            console.log(`[Referral] pct=${pct} (global=${globalPct}, override=${freshUser.referralPercentage}) offerAmt=${amountNum} refAmount=${refAmount} holdDays=${holdDays}`);

            if (refAmount > 0) {
              const txStatus = holdDays === 0 ? 'completed' : 'hold';
              const holdDate = holdDays > 0 ? (() => { const d = new Date(); d.setDate(d.getDate() + holdDays); return d; })() : null;

              // Always increment lifetime referral earnings tracker
              await User.updateOne(
                { _id: referrer._id },
                { $inc: { referralEarnings: refAmount } }
              );
              await User.updateOne(
                { _id: freshUser._id },
                { $inc: { commissionGenerated: refAmount } }
              );

              // If holdDays=0, credit wallet immediately
              let balanceAfterRef = referrer.walletBalance;
              if (holdDays === 0) {
                // NOTE: walletBalance is credited but totalEarned is intentionally NOT incremented.
                // Affiliate/referral earnings must NOT count toward VIP progress or leaderboard rankings.
                const updRef = await User.findOneAndUpdate(
                  { _id: referrer._id },
                  { $inc: { walletBalance: refAmount } },
                  { new: true }
                );
                balanceAfterRef = updRef.walletBalance;
                emitWalletUpdate(referrer.firebaseUid, balanceAfterRef);
              }

              const refTx = await Transaction.create({
                userId: referrer._id,
                transactionType: 'referral_reward',
                sourceType: 'referral',
                sourceId: offerTx._id,
                linkedTransactionId: offerTx._id,
                amount: refAmount,
                balanceAfter: balanceAfterRef,
                description: `Referral Commission from Custom Offer: ${submission.offerId.title}`,
                status: txStatus,
                holdUntil: holdDate,
              });

              await notify(
                referrer._id,
                'referral_earning',
                txStatus === 'completed' ? 'Referral Bonus Credited!' : 'Referral Earning Pending!',
                txStatus === 'completed'
                  ? `+${refAmount} coins referral commission from ${freshUser.displayName || 'a referral'}'s custom offer has been credited to your wallet!`
                  : `+${refAmount} coins referral commission from ${freshUser.displayName || 'a referral'}'s custom offer is on hold for ${holdDays} day(s).`,
                { amount: refAmount, sourceUserId: freshUser._id }
              );
              console.log(`[Referral] Commission created: ${refAmount} coins, status=${txStatus}, txId=${refTx._id}`);
              commissionResult = { fired: true, amount: refAmount, pct, holdDays, status: txStatus, txId: refTx._id };
            } else {
              console.log(`[Referral] refAmount is 0 — pct=${pct}, amountNum=${amountNum} — skipping`);
              commissionResult = { fired: false, reason: 'amount_zero', pct, amountNum };
            }
          } else {
            commissionResult = { fired: false, reason: 'referrer_not_found' };
          }
        } catch (refErr) {
          console.error('[Referral] Failed to process referral commission for custom offer:', refErr);
          commissionResult = { fired: false, reason: 'error', error: refErr.message };
        }
      } else {
        console.log(`[Referral] User ${freshUser._id} has no referredBy — skipping commission`);
        commissionResult = { fired: false, reason: 'no_referrer' };
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

    res.json({ success: true, submission, commissionResult: commissionResult || null });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update submission' });
  }
});

// GET all staff (admins, chat_mods, support_agents)
router.get('/admins', requirePrimaryAdmin, async (req, res) => {
  try {
    const staffRoles = ['admin', 'chat_mod', 'support_agent', 'moderator', 'owner'];
    const admins = await User.find({ role: { $in: staffRoles } })
      .select('displayName email role adminPermissions createdAt')
      .sort({ createdAt: -1 });
    res.json({ success: true, admins });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch staff list' });
  }
});

// POST promote a user to admin role
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

// POST promote a user to chat_mod
router.post('/chat-mods', requirePrimaryAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findByIdAndUpdate(
      userId,
      { role: 'chat_mod', adminPermissions: [] },
      { returnDocument: 'after' }
    );
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    await createLog(req.dbUser._id, 'CREATE_CHAT_MOD', user._id, {});
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to promote chat mod' });
  }
});

// DELETE revoke chat_mod
router.delete('/chat-mods/:id', requirePrimaryAdmin, async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'chat_mod' },
      { role: 'user', adminPermissions: [] },
      { returnDocument: 'after' }
    );
    if (!user) return res.status(404).json({ success: false, error: 'Chat mod not found' });
    await createLog(req.dbUser._id, 'REVOKE_CHAT_MOD', user._id, {});
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to revoke chat mod' });
  }
});

// POST promote a user to support_agent
router.post('/support-agents', requirePrimaryAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findByIdAndUpdate(
      userId,
      { role: 'support_agent', adminPermissions: [] },
      { returnDocument: 'after' }
    );
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    await createLog(req.dbUser._id, 'CREATE_SUPPORT_AGENT', user._id, {});
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to promote support agent' });
  }
});

// DELETE revoke support_agent
router.delete('/support-agents/:id', requirePrimaryAdmin, async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'support_agent' },
      { role: 'user', adminPermissions: [] },
      { returnDocument: 'after' }
    );
    if (!user) return res.status(404).json({ success: false, error: 'Support agent not found' });
    await createLog(req.dbUser._id, 'REVOKE_SUPPORT_AGENT', user._id, {});
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to revoke support agent' });
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

    // Revoke regardless of which staff role they currently have (admin, moderator, etc.)
    // Just make sure we don't accidentally match a normal user.
    const protectedRoles = ['user', 'owner'];
    if (protectedRoles.includes(adminToUpdate.role)) {
      return res.status(400).json({ success: false, error: 'User is not a staff member.' });
    }

    const adminUser = await User.findByIdAndUpdate(
      req.params.id,
      { role: 'user', adminPermissions: [] },
      { new: true }
    );
    if (!adminUser) return res.status(404).json({ success: false, error: 'User not found' });
    await createLog(req.dbUser._id, 'REVOKE_ADMIN', adminUser._id, { reason: reason || 'No reason provided', previousRole: adminToUpdate.role });
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
        // Decrement commissionGenerated from the referred user (who did the offer)
        await User.findByIdAndUpdate(parentTx.userId, {
          $inc: { commissionGenerated: -linkedTx.amount }
        });
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
      if (incoming.nextConfig) {
        if (!settings.leaderboardConfig[period].nextConfig) {
          settings.leaderboardConfig[period].nextConfig = {};
        }
        if (incoming.nextConfig.isScheduled !== undefined) settings.leaderboardConfig[period].nextConfig.isScheduled = Boolean(incoming.nextConfig.isScheduled);
        if (incoming.nextConfig.visibleSlots !== undefined) settings.leaderboardConfig[period].nextConfig.visibleSlots = Math.max(5, Math.min(100, Number(incoming.nextConfig.visibleSlots) || 25));
        if (incoming.nextConfig.rewardedRanks !== undefined) settings.leaderboardConfig[period].nextConfig.rewardedRanks = Math.max(0, Math.min(100, Number(incoming.nextConfig.rewardedRanks) || 3));
        if (incoming.nextConfig.rewardTiers !== undefined && Array.isArray(incoming.nextConfig.rewardTiers)) {
          settings.leaderboardConfig[period].nextConfig.rewardTiers = incoming.nextConfig.rewardTiers.map(v => Math.max(0, Number(v) || 0));
        }
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
// POST /api/admin/referral-holds/release-now
// Manually trigger the referral hold release (same logic as the midnight cron).
// Useful for testing or forcing an instant payout of matured holds.
router.post('/referral-holds/release-now', requirePermission('manage_withdrawals'), async (req, res) => {
  try {
    const now = new Date();

    const eligibleHolds = await Transaction.find({
      transactionType: 'referral_reward',
      status: 'hold',
    });

    if (eligibleHolds.length === 0) {
      return res.json({ success: true, releasedCount: 0, message: 'No matured holds to release right now.' });
    }

    let releasedCount = 0;
    for (const tx of eligibleHolds) {
      const user = await User.findById(tx.userId);
      if (!user) continue;

      // Credit wallet
      // NOTE: walletBalance is credited but totalEarned is intentionally NOT incremented.
      // Affiliate/referral earnings must NOT count toward VIP progress or leaderboard rankings.
      user.walletBalance = Math.max(0, user.walletBalance + tx.amount);
      await user.save();

      emitWalletUpdate(user.firebaseUid, user.walletBalance);

      // Mark released
      tx.status = 'completed';
      tx.balanceAfter = user.walletBalance;
      tx.metadata = { ...tx.metadata, releasedAt: new Date().toISOString(), releasedBy: 'manual_admin' };
      await tx.save();

      // Notify user
      await notify(
        user._id,
        'referral_earning',
        'Referral Funds Released!',
        `Your held referral reward of +${tx.amount} coins is now available in your wallet!`,
        { amount: tx.amount, txId: tx._id }
      );

      releasedCount++;
    }

    await createLog(req.dbUser._id, 'MANUAL_REFERRAL_HOLD_RELEASE', null, { releasedCount });
    res.json({ success: true, releasedCount, message: `Released ${releasedCount} referral hold(s) successfully.` });
  } catch (error) {
    console.error('[Admin] Manual referral hold release failed:', error);
    res.status(500).json({ success: false, error: 'Failed to release referral holds' });
  }
});

// POST /api/admin/earnings-holds/release-now
// Force release all earnings holds (custom offers, offerwalls, etc.)
router.post('/earnings-holds/release-now', requirePermission('manage_withdrawals'), async (req, res) => {
  try {
    const eligibleHolds = await Transaction.find({
      transactionType: { $ne: 'referral_reward' },
      status: 'hold',
    });

    if (eligibleHolds.length === 0) {
      return res.json({ success: true, releasedCount: 0, message: 'No earnings holds to release right now.' });
    }

    let releasedCount = 0;
    for (const tx of eligibleHolds) {
      const user = await User.findById(tx.userId);
      if (!user) continue;

      user.walletBalance = Math.max(0, (user.walletBalance || 0) + tx.amount);
      await user.save();

      emitWalletUpdate(user.firebaseUid, user.walletBalance);

      tx.status = 'completed';
      tx.balanceAfter = user.walletBalance;
      tx.metadata = { ...tx.metadata, releasedAt: new Date().toISOString(), releasedBy: 'manual_admin' };
      await tx.save();

      // Extract offer title from tx.description
      let offerTitle = tx.description || 'an offer';
      if (tx.description) {
        if (tx.description.includes('Custom Offer Reward: ')) {
          offerTitle = tx.description.replace('Custom Offer Reward: ', '');
        } else if (tx.description.includes('Reward for custom offer: ')) {
          offerTitle = tx.description.replace('Reward for custom offer: ', '');
        } else if (tx.description.includes('Manual reward: ')) {
          offerTitle = tx.description.replace('Manual reward: ', '');
        }
      }

      await notify(
        user._id,
        'earning_released',
        'Held Earnings Released!',
        `Your held reward for "${offerTitle}" has been released! +${tx.amount} coins have been credited to your wallet.`,
        { amount: tx.amount, txId: tx._id }
      );

      releasedCount++;
    }

    await createLog(req.dbUser._id, 'MANUAL_EARNINGS_HOLD_RELEASE', null, { releasedCount });
    res.json({ success: true, releasedCount, message: `Released ${releasedCount} earnings hold(s) successfully.` });
  } catch (error) {
    console.error('[Admin] Manual earnings hold release failed:', error);
    res.status(500).json({ success: false, error: 'Failed to release earnings holds.' });
  }
});

// ----------------------------------------------------
// REFERRAL DIAGNOSTICS
// GET /api/admin/referral-debug/:userId
// Shows the full referral chain and commission history for a user.
router.get('/referral-debug/:userId', requirePermission('manage_users'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('displayName email referredBy referralCode referralEarnings referralPercentage walletBalance');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    // Get referrer info
    let referrer = null;
    if (user.referredBy) {
      referrer = await User.findById(user.referredBy).select('displayName email referralCode walletBalance referralEarnings');
    }

    // Get all referral_reward transactions for THIS user (as the referrer)
    const commissionsAsReferrer = await Transaction.find({
      userId: user._id,
      transactionType: 'referral_reward',
    }).sort({ createdAt: -1 }).limit(20).lean();

    // Get all referral_reward transactions where THIS user's offers triggered commissions (linked)
    const offersThisUserCompleted = await Transaction.find({
      userId: user._id,
      transactionType: { $in: REAL_OFFER_EARNING_TYPES },
      status: 'completed',
    }).countDocuments();

    const settings = await Settings.getSingleton();
    const globalPct = settings.referralConfig?.globalPercentage ?? 5;
    const holdDays  = settings.referralConfig?.holdDays ?? 30;
    const effectivePct = (user.referralPercentage != null) ? user.referralPercentage : globalPct;

    res.json({
      success: true,
      user: {
        _id: user._id,
        displayName: user.displayName,
        email: user.email,
        referralCode: user.referralCode,
        referredBy: user.referredBy || null,
        referralEarnings: user.referralEarnings || 0,
        walletBalance: user.walletBalance || 0,
        effectiveCommissionPct: effectivePct,
        offersCompleted: offersThisUserCompleted,
      },
      referrer: referrer ? {
        _id: referrer._id,
        displayName: referrer.displayName,
        email: referrer.email,
        referralCode: referrer.referralCode,
        walletBalance: referrer.walletBalance || 0,
        referralEarnings: referrer.referralEarnings || 0,
      } : null,
      platformSettings: { globalPct, holdDays },
      commissions: commissionsAsReferrer,
      diagnosis: {
        hasReferrer: !!user.referredBy,
        hasAnyCommissions: commissionsAsReferrer.length > 0,
        pendingCount: commissionsAsReferrer.filter(t => t.status === 'hold').length,
        completedCount: commissionsAsReferrer.filter(t => t.status === 'completed').length,
        message: !user.referredBy
          ? '⚠️ User has no referrer linked (referredBy is null). No commissions will ever fire for this user.'
          : commissionsAsReferrer.length === 0
          ? '⚠️ Referrer exists but ZERO commission transactions found. The referred user likely has not completed any offers yet.'
          : `✅ ${commissionsAsReferrer.length} commission transaction(s) found.`,
      }
    });
  } catch (error) {
    console.error('[Admin] Referral debug error:', error);
    res.status(500).json({ success: false, error: 'Failed to run referral diagnostic' });
  }
});

// POST /api/admin/referral-test-commission/:userId
// Manually fire a test referral commission: credits the user's referrer with `amount` coins (on hold by default).
// Body: { amount: number, instant: boolean }  — instant=true bypasses hold and credits wallet immediately.
router.post('/referral-test-commission/:userId', requirePermission('manage_users'), async (req, res) => {
  try {
    const { amount = 100, instant = false } = req.body;
    const amountNum = Math.max(1, Number(amount));

    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (!user.referredBy) return res.status(400).json({ success: false, error: 'This user has no referrer (referredBy is null). Link a referrer first using the Ref% button.' });

    const referrer = await User.findById(user.referredBy);
    if (!referrer) return res.status(404).json({ success: false, error: 'Referrer user not found in database.' });

    const settings = await Settings.getSingleton();
    const holdDays  = settings.referralConfig?.holdDays ?? 30;

    // Increment referralEarnings tracker
    await User.updateOne({ _id: referrer._id }, { $inc: { referralEarnings: amountNum } });
    await User.updateOne({ _id: user._id }, { $inc: { commissionGenerated: amountNum } });

    let txStatus = 'hold';
    let holdUntil = null;
    let balanceAfterReferrer = referrer.walletBalance;

    if (instant || holdDays === 0) {
      // Credit wallet immediately
      const updatedReferrer = await User.findOneAndUpdate(
        { _id: referrer._id },
        { $inc: { walletBalance: amountNum, totalEarned: amountNum } },
        { new: true }
      );
      balanceAfterReferrer = updatedReferrer.walletBalance;
      processVipLevelUp(updatedReferrer, amountNum, emitToUser);
      emitWalletUpdate(updatedReferrer.firebaseUid, updatedReferrer.walletBalance);
      txStatus = 'completed';
    } else {
      const holdDate = new Date();
      holdDate.setDate(holdDate.getDate() + holdDays);
      holdUntil = holdDate;
    }

    const tx = await Transaction.create({
      userId: referrer._id,
      transactionType: 'referral_reward',
      sourceType: 'referral',
      amount: amountNum,
      balanceAfter: balanceAfterReferrer,
      description: `[TEST] Referral Commission from ${user.displayName || user.email} — Manual Admin Test`,
      status: txStatus,
      holdUntil,
      metadata: { isTestCommission: true, triggeredBy: req.dbUser.email, forUserId: user._id.toString() },
    });

    await notify(
      referrer._id,
      'referral_earning',
      instant ? 'Referral Bonus Credited!' : 'Referral Earning Pending!',
      instant
        ? `+${amountNum} coins referral commission from ${user.displayName || 'a test'} has been credited to your wallet.`
        : `+${amountNum} coins referral commission from ${user.displayName || 'a test'} is on hold for ${holdDays} day(s).`,
      { amount: amountNum }
    );

    await createLog(req.dbUser._id, 'MANUAL_REFERRAL_COMMISSION', referrer._id, {
      forUserId: user._id, amount: amountNum, instant, txId: tx._id,
    });

    res.json({
      success: true,
      message: instant
        ? `✅ ${amountNum} coins credited instantly to ${referrer.displayName || referrer.email}'s wallet.`
        : `✅ ${amountNum} coins commission created on hold for ${holdDays} day(s) for ${referrer.displayName || referrer.email}.`,
      transaction: tx,
      referrer: { _id: referrer._id, displayName: referrer.displayName, email: referrer.email },
    });
  } catch (error) {
    console.error('[Admin] Manual test commission failed:', error);
    res.status(500).json({ success: false, error: 'Failed to create test commission' });
  }
});

// ----------------------------------------------------
// OVERVIEW & NOTIFICATIONS
// ----------------------------------------------------

router.get('/overview-stats', requirePrimaryAdmin, async (req, res) => {
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

// GET /api/admin/conversions — paginated conversion visibility
router.get('/conversions', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};
    const providerId = cleanProviderId(req.query.providerId);
    const internalStatus = cleanString(req.query.internalStatus, 40);
    const processingState = cleanString(req.query.processingState, 60);
    const clickId = cleanString(req.query.clickId, 120);
    const transactionId = cleanString(req.query.transactionId, 160);
    const user = cleanString(req.query.user, 120);

    if (providerId) filter.providerId = providerId;
    if (internalStatus) {
      if (!INTERNAL_STATUSES.includes(internalStatus)) return res.status(400).json({ success: false, error: 'Invalid internal status filter' });
      filter.internalStatus = internalStatus;
    }
    if (processingState) {
      if (!PROCESSING_STATES.includes(processingState)) return res.status(400).json({ success: false, error: 'Invalid processing state filter' });
      filter.processingState = processingState;
    }
    if (clickId) filter.clickId = clickId;
    if (transactionId) filter.providerTransactionId = transactionId;
    if (user) {
      if (!mongoose.Types.ObjectId.isValid(user)) return res.status(400).json({ success: false, error: 'Invalid user filter' });
      filter.userId = user;
    }
    const fromRaw = cleanString(req.query.from, 80);
    const toRaw = cleanString(req.query.to, 80);
    if (fromRaw || toRaw) {
      filter.createdAt = {};
      const from = fromRaw ? new Date(fromRaw) : null;
      const to = toRaw ? new Date(toRaw) : null;
      if (fromRaw && Number.isNaN(from.getTime())) return res.status(400).json({ success: false, error: 'Invalid from date' });
      if (toRaw && Number.isNaN(to.getTime())) return res.status(400).json({ success: false, error: 'Invalid to date' });
      if (from && to && from > to) return res.status(400).json({ success: false, error: 'from date must be before to date' });
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lte = to;
    }

    const [conversions, total] = await Promise.all([
      Conversion.find(filter)
        .populate('userId', 'displayName email avatarUrl')
        .populate('offerId', 'title')
        .populate('rewardTransactionId', 'amount transactionType status balanceAfter createdAt')
        .populate('reversalTransactionId', 'amount transactionType status balanceAfter createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Conversion.countDocuments(filter),
    ]);

    res.json({
      success: true,
      conversions: conversions.map((conversion) => ({
        _id: conversion._id,
        createdAt: conversion.createdAt,
        providerId: conversion.providerId,
        campaignType: conversion.campaignType,
        campaignId: conversion.campaignId,
        offer: conversion.offerId ? { _id: conversion.offerId._id, title: conversion.offerId.title } : null,
        user: conversion.userId ? {
          _id: conversion.userId._id,
          displayName: conversion.userId.displayName,
          email: conversion.userId.email,
          avatarUrl: conversion.userId.avatarUrl,
        } : null,
        clickId: conversion.clickId,
        providerTransactionId: conversion.providerTransactionId,
        eventType: conversion.eventType,
        incomingStatus: conversion.incomingStatus,
        internalStatus: conversion.internalStatus,
        payout: conversion.payout,
        rewardAmount: conversion.rewardAmount,
        processingState: conversion.processingState,
        rewardTransaction: conversion.rewardTransactionId || null,
        reversalTransaction: conversion.reversalTransactionId || null,
        rejectionReason: conversion.rejectionReason,
        errorReason: conversion.errorReason,
        security: conversion.security ? {
          checked: conversion.security.checked,
          passed: conversion.security.passed,
          method: conversion.security.method,
          reason: conversion.security.reason,
        } : null,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[/api/admin/conversions GET] Error:', error);
    res.status(error.statusCode || 500).json({ success: false, error: error.statusCode ? error.message : 'Failed to fetch conversions' });
  }
});

const serializePostbackLog = (log, includePayload = false) => {
  const doc = typeof log.toObject === 'function' ? log.toObject() : log;
  const payload = {
    _id: doc._id,
    createdAt: doc.createdAt,
    providerId: doc.providerId,
    route: doc.route,
    method: doc.method,
    mappedFields: boundAdminPayload(doc.mappedFields || {}),
    sourceIp: doc.sourceIp,
    userAgent: doc.userAgent,
    security: boundAdminPayload(doc.security || {}),
    processingResult: doc.processingResult,
    isDuplicate: doc.isDuplicate,
    rejectionReason: doc.rejectionReason,
    clickLogId: doc.clickLogId,
    conversion: doc.conversionId || null,
    user: doc.userId || null,
    transactionId: doc.transactionId,
  };
  if (includePayload) {
    payload.sanitizedQuery = boundAdminPayload(doc.sanitizedQuery || {});
    payload.sanitizedBody = boundAdminPayload(doc.sanitizedBody || {});
    payload.sanitizedHeaders = boundAdminPayload(doc.sanitizedHeaders || {});
  }
  return payload;
};

// GET /api/admin/postback-logs — paginated sanitized postback logs
router.get('/postback-logs', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};
    const providerId = cleanProviderId(req.query.providerId);
    const result = cleanString(req.query.processingResult, 40);
    const duplicate = cleanString(req.query.duplicate, 10);
    const clickId = cleanString(req.query.clickId, 120);
    const transactionId = cleanString(req.query.transactionId, 160);

    if (providerId) filter.providerId = providerId;
    if (result) {
      if (!POSTBACK_RESULTS.includes(result)) return res.status(400).json({ success: false, error: 'Invalid processing result filter' });
      filter.processingResult = result;
    }
    if (duplicate) {
      if (!['true', 'false'].includes(duplicate)) return res.status(400).json({ success: false, error: 'Invalid duplicate filter' });
      filter.isDuplicate = duplicate === 'true';
    }
    if (clickId) filter['mappedFields.clickId'] = clickId;
    if (transactionId) filter['mappedFields.transactionId'] = transactionId;

    const [logs, total] = await Promise.all([
      PostbackLog.find(filter)
        .populate('userId', 'displayName email')
        .populate('conversionId', 'internalStatus processingState rewardAmount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PostbackLog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      logs: logs.map((log) => serializePostbackLog(log)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[/api/admin/postback-logs GET] Error:', error);
    res.status(error.statusCode || 500).json({ success: false, error: error.statusCode ? error.message : 'Failed to fetch postback logs' });
  }
});

// GET /api/admin/postback-logs/:id — sanitized detail view
router.get('/postback-logs/:id', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, error: 'Postback log not found' });
    }
    const log = await PostbackLog.findById(req.params.id)
      .populate('userId', 'displayName email')
      .populate('conversionId', 'internalStatus processingState rewardAmount rewardTransactionId reversalTransactionId')
      .lean();
    if (!log) return res.status(404).json({ success: false, error: 'Postback log not found' });
    res.json({ success: true, log: serializePostbackLog(log, true) });
  } catch (error) {
    console.error('[/api/admin/postback-logs/:id GET] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch postback log' });
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
      proofImages: sub.proofImages,
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

router.get('/proofs/history', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const { page = 1, limit = 5 } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 5;
    const skipNum = (pageNum - 1) * limitNum;
    const fetchAmount = skipNum + limitNum + 1; // +1 to check if there is a next page
    
    // 1. Get Processed Custom Offer Submissions
    const processedSubs = await CustomOfferSubmission.find({ status: { $in: ['approved', 'rejected', 'chargebacked'] } })
      .populate('userId', 'displayName email avatarUrl')
      .populate('offerId', 'title rewardAmount')
      .sort({ updatedAt: -1 })
      .limit(fetchAmount)
      .lean();

    const customOfferProofs = processedSubs.map(sub => ({
      _id: sub._id,
      type: 'custom_offer',
      status: sub.status,
      user: sub.userId,
      offerTitle: sub.offerId ? sub.offerId.title : 'Unknown Offer',
      rewardAmount: sub.offerId ? sub.offerId.rewardAmount : 0,
      proofText: sub.proofText,
      proofImage: sub.proofImage,
      proofImages: sub.proofImages,
      submittedAt: sub.updatedAt,
      adminNote: sub.adminNote
    }));

    // 2. Get Processed Transaction Proofs
    const processedTxs = await Transaction.find({
      status: { $in: ['completed', 'rejected', 'hold', 'reversed'] },
      'metadata.userProof': { $exists: true }
    })
      .populate('userId', 'displayName email avatarUrl')
      .sort({ updatedAt: -1 })
      .limit(fetchAmount)
      .lean();

    const transactionProofs = processedTxs.map(tx => ({
      _id: tx._id,
      type: 'transaction',
      status: tx.status,
      user: tx.userId,
      offerTitle: tx.description || 'General Offer',
      rewardAmount: tx.amount,
      proofText: tx.metadata?.userProof?.text || '',
      proofImage: tx.metadata?.userProof?.imageUrl || '',
      submittedAt: tx.updatedAt,
      adminNote: tx.metadata?.adminNote
    }));

    // Combine and Sort by updated date (newest first)
    const combinedProofs = [...customOfferProofs, ...transactionProofs].sort(
      (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)
    );

    const hasMore = combinedProofs.length > (skipNum + limitNum);
    const paginatedProofs = combinedProofs.slice(skipNum, skipNum + limitNum);

    res.status(200).json({ 
      success: true, 
      proofs: paginatedProofs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        hasMore
      }
    });
  } catch (error) {
    console.error('[/api/admin/proofs/history] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch proof history' });
  }
});

router.post('/proofs/:type/:id/chargeback', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const { type, id } = req.params;

    let targetUserId = null;
    let targetAmount = 0;
    let targetTxId = null;

    if (type === 'custom_offer') {
      const submission = await CustomOfferSubmission.findById(id).populate('offerId');
      if (!submission) return res.status(404).json({ success: false, error: 'Submission not found' });
      if (submission.status !== 'approved') return res.status(400).json({ success: false, error: 'Only approved proofs can be charged back' });

      targetUserId = submission.userId;
      targetAmount = submission.offerId ? submission.offerId.rewardAmount : 0;

      // Find the associated transaction
      let query = {
        userId: targetUserId,
        transactionType: 'custom_offer_reward',
        status: { $in: ['completed', 'hold'] }
      };
      if (submission.offerId && submission.offerId._id) {
        query.sourceId = submission.offerId._id;
      }
      
      const offerTx = await Transaction.findOne(query).sort({ createdAt: -1 });

      if (offerTx) {
        targetTxId = offerTx._id;
      } else {
        return res.status(400).json({ success: false, error: 'Original transaction not found, cannot charge back.' });
      }

      submission.status = 'chargebacked';
      await submission.save();

    } else if (type === 'transaction') {
      const tx = await Transaction.findById(id);
      if (!tx || !['completed', 'hold'].includes(tx.status)) {
        return res.status(400).json({ success: false, error: 'Proof cannot be charged back. Must be completed or hold.' });
      }

      targetUserId = tx.userId;
      targetAmount = tx.amount;
      targetTxId = tx._id;
    } else {
      return res.status(400).json({ success: false, error: 'Invalid type' });
    }

    // Process the chargeback logic
    if (targetTxId) {
      const parentTx = await Transaction.findById(targetTxId);
      if (parentTx && parentTx.status !== 'reversed') {
        const user = await User.findById(targetUserId);
        if (user) {
          if (parentTx.status === 'completed') {
             user.walletBalance = user.walletBalance - Math.abs(parentTx.amount);
          }
          user.totalEarned = Math.max(0, (user.totalEarned || 0) - Math.abs(parentTx.amount));
          await user.save();
          emitWalletUpdate(user.firebaseUid, user.walletBalance);
        }

        parentTx.status = 'reversed';
        await parentTx.save();

        const cbTx = new Transaction({
          userId: targetUserId,
          transactionType: 'chargeback',
          amount: -Math.abs(parentTx.amount),
          balanceAfter: user ? user.walletBalance : 0,
          sourceType: 'chargeback',
          linkedTransactionId: parentTx._id,
          description: `Chargeback for: ${parentTx.description || 'Offer Completion'}`,
          status: 'completed',
          metadata: { adminNote: 'Proof chargebacked' }
        });
        await cbTx.save();

        await createLog(req.dbUser._id, 'PROCESS_PROOF_CHARGEBACK', targetUserId, {
          txId: parentTx._id,
          amount: -Math.abs(parentTx.amount),
        });

        await notify(targetUserId, 'chargeback', 'Offer Chargeback', `A previously approved offer reward was charged back and -${Math.abs(parentTx.amount)} coins were deducted.`, { txId: parentTx._id, amount: -Math.abs(parentTx.amount) });

        // Cascade to linked transactions (e.g. referrals)
        const linkedTxs = await Transaction.find({ 
          linkedTransactionId: parentTx._id, 
          status: { $ne: 'reversed' },
          transactionType: { $ne: 'chargeback' }
        });
        for (const linkedTx of linkedTxs) {
          let updatedRefUser = null;
          if (linkedTx.transactionType === 'referral_reward') {
            if (linkedTx.status === 'hold') {
              updatedRefUser = await User.findByIdAndUpdate(linkedTx.userId, { $inc: { referralEarnings: -linkedTx.amount } }, { new: true });
            } else {
              updatedRefUser = await User.findByIdAndUpdate(linkedTx.userId, { $inc: { walletBalance: -linkedTx.amount, referralEarnings: -linkedTx.amount } }, { new: true });
            }
            await User.findByIdAndUpdate(targetUserId, { $inc: { commissionGenerated: -linkedTx.amount } });
          } else {
            updatedRefUser = await User.findByIdAndUpdate(linkedTx.userId, { $inc: { walletBalance: -linkedTx.amount } }, { new: true });
          }
          linkedTx.status = 'reversed';
          await linkedTx.save();
          
          if (updatedRefUser) {
            const refCbTx = new Transaction({
              userId: linkedTx.userId,
              transactionType: 'chargeback',
              amount: -Math.abs(linkedTx.amount),
              balanceAfter: updatedRefUser.walletBalance,
              sourceType: 'chargeback',
              linkedTransactionId: linkedTx._id,
              description: `Reversal of: ${linkedTx.description || 'Commission'}`,
              status: 'completed',
              metadata: { adminNote: 'Original offer chargebacked' }
            });
            await refCbTx.save();
            emitWalletUpdate(updatedRefUser.firebaseUid, updatedRefUser.walletBalance);
          }
        }
      }
    }

    res.json({ success: true, message: 'Chargeback processed successfully' });

  } catch (error) {
    console.error('[/api/admin/proofs/chargeback] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to process chargeback' });
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
          const offerAmount = submission.offerId.rewardAmount;
          
          const settings = await Settings.getSingleton();
          let txStatus = 'completed';
          let creditBalance = offerAmount;
          let holdDate = null;

          if (settings.earningHoldConfig?.enabled && offerAmount >= settings.earningHoldConfig.threshold) {
            txStatus = 'hold';
            creditBalance = 0; // do not add to wallet yet
            holdDate = new Date();
            holdDate.setDate(holdDate.getDate() + (settings.earningHoldConfig.holdDays || 30));
          }

          user.walletBalance = (user.walletBalance || 0) + creditBalance;
          user.totalEarned = (user.totalEarned || 0) + offerAmount;
          await user.save();
          emitWalletUpdate(user.firebaseUid, user.walletBalance);

          const offerTx = await Transaction.create({
            userId: user._id,
            amount: offerAmount,
            balanceAfter: user.walletBalance,
            transactionType: 'custom_offer_reward',
            description: `Reward for custom offer: ${submission.offerId.title}`,
            status: txStatus,
            holdUntil: holdDate,
            sourceType: 'offer',
            sourceId: submission.offerId._id,
          });

          await notify(user._id, 'offer_approved', 'Offer Approved', `Your proof for "${submission.offerId.title}" was approved! +${offerAmount} coins.`);
          // Check VIP level-up
          processVipLevelUp(user, offerAmount, emitToUser);

          // ── Referral Commission ──────────────────────────────────────────────
          console.log(`[Referral/ProofsHub] Checking referredBy for user ${user._id}: ${user.referredBy}`);
          if (user.referredBy) {
            try {
              const referrer = await User.findById(user.referredBy);
              if (referrer) {
                const settings = await Settings.getSingleton();
                const holdDays  = settings.referralConfig?.holdDays ?? 30;
                const globalPct = settings.referralConfig?.globalPercentage ?? 5;
                // FIX: treat 0 as "not set" so it falls back to globalPct
                const pct = (user.referralPercentage != null && user.referralPercentage > 0)
                  ? user.referralPercentage
                  : globalPct;
                const refAmount = Math.floor(offerAmount * (pct / 100));
                console.log(`[Referral/ProofsHub] pct=${pct} offerAmt=${offerAmount} refAmount=${refAmount} holdDays=${holdDays}`);

                if (refAmount > 0) {
                  const txStatus = holdDays === 0 ? 'completed' : 'hold';
                  const holdDate = holdDays > 0
                    ? (() => { const d = new Date(); d.setDate(d.getDate() + holdDays); return d; })()
                    : null;

                  // Always increment lifetime referral earnings tracker
                  await User.updateOne({ _id: referrer._id }, { $inc: { referralEarnings: refAmount } });
                  await User.updateOne({ _id: user._id }, { $inc: { commissionGenerated: refAmount } });

                  // If holdDays=0, credit wallet immediately
                  // NOTE: walletBalance is credited but totalEarned is intentionally NOT incremented.
                  // Affiliate/referral earnings must NOT count toward VIP progress or leaderboard rankings.
                  let balanceAfterRef = referrer.walletBalance;
                  if (holdDays === 0) {
                    const updRef = await User.findOneAndUpdate(
                      { _id: referrer._id },
                      { $inc: { walletBalance: refAmount } },
                      { new: true }
                    );
                    balanceAfterRef = updRef.walletBalance;
                    emitWalletUpdate(referrer.firebaseUid, balanceAfterRef);
                  }

                  await Transaction.create({
                    userId: referrer._id,
                    transactionType: 'referral_reward',
                    sourceType: 'referral',
                    sourceId: offerTx._id,
                    linkedTransactionId: offerTx._id,
                    amount: refAmount,
                    balanceAfter: balanceAfterRef,
                    description: `Referral Commission from Custom Offer: ${submission.offerId.title}`,
                    status: txStatus,
                    holdUntil: holdDate,
                  });

                  await notify(
                    referrer._id,
                    'referral_earning',
                    txStatus === 'completed' ? 'Referral Bonus Credited!' : 'Referral Earning Pending!',
                    txStatus === 'completed'
                      ? `+${refAmount} coins referral commission from ${user.displayName || 'a referral'}'s custom offer has been credited to your wallet!`
                      : `+${refAmount} coins referral commission from ${user.displayName || 'a referral'}'s custom offer is on hold for ${holdDays} day(s).`,
                    { amount: refAmount, sourceUserId: user._id }
                  );
                  console.log(`[Referral/ProofsHub] Commission created: ${refAmount} coins, status=${txStatus}`);
                } else {
                  console.log(`[Referral/ProofsHub] refAmount is 0 (pct=${pct}, offerAmt=${offerAmount}) — skipped`);
                }
              }
            } catch (refErr) {
              console.error('[Referral/ProofsHub] Commission error:', refErr);
            }
          }
          // ─────────────────────────────────────────────────────────────────────
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
        const settings = await Settings.getSingleton();
        let txStatus = 'completed';
        let creditBalance = tx.amount;
        let holdDate = null;

        if (settings.earningHoldConfig?.enabled && tx.amount >= settings.earningHoldConfig.threshold) {
          txStatus = 'hold';
          creditBalance = 0;
          holdDate = new Date();
          holdDate.setDate(holdDate.getDate() + (settings.earningHoldConfig.holdDays || 30));
        }

        tx.status = txStatus;
        if (holdDate) tx.holdUntil = holdDate;

        user.walletBalance = (user.walletBalance || 0) + creditBalance;
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
    
    // Calculate total coins earned from avatar purchases
    const earningsAggr = await Transaction.aggregate([
      { $match: { transactionType: 'admin_adjustment', description: { $regex: /^Avatar Purchase:/ } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalCoinsEarned = earningsAggr.length > 0 ? Math.abs(earningsAggr[0].total) : 0;

    res.json({ success: true, avatars, totalCoinsEarned });
  } catch (error) {
    console.error('[/api/admin/avatars GET] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch avatars' });
  }
});

// Create new avatar
router.post('/avatars', requirePermission('manage_users'), upload.single('image'), async (req, res) => {
  try {
    const { name, isPremium, price, quantity, description, rarity } = req.body;
    let url = req.body.url;

    if (req.file) {
      url = `/avatars/${req.file.filename}`;
    }

    if (!url) {
      return res.status(400).json({ success: false, error: 'Image file or URL is required' });
    }

    let parsedQuantity = null;
    if (quantity !== undefined && quantity !== null && quantity !== '' && quantity !== 'null') {
      parsedQuantity = Number(quantity);
    }

    const avatar = new Avatar({
      name: name || 'Unnamed Avatar',
      url,
      isPremium: isPremium === 'true' || isPremium === true,
      price: Number(price) || 0,
      quantity: parsedQuantity,
      description: description || '',
      rarity: rarity || ''
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
    const { name, isPremium, price, quantity, description, rarity } = req.body;
    const avatar = await Avatar.findById(req.params.id);
    
    if (!avatar) {
      return res.status(404).json({ success: false, error: 'Avatar not found' });
    }

    if (name) avatar.name = name;
    if (isPremium !== undefined) avatar.isPremium = isPremium === 'true' || isPremium === true;
    if (price !== undefined) avatar.price = Number(price);
    if (description !== undefined) avatar.description = description;
    if (rarity !== undefined) avatar.rarity = rarity;
    
    if (quantity !== undefined) {
      if (quantity === null || quantity === '' || quantity === 'null') {
        avatar.quantity = null;
      } else {
        avatar.quantity = Number(quantity);
      }
    }
    
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
// ─────────────────────────────────────────────────────────────────────────────
// DIRECT OFFERS (S2S Postback System)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/direct-offers — List all direct offers
router.get('/direct-offers', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const offers = await DirectOffer.find().sort({ createdAt: -1 });
    res.json({ success: true, offers: offers.map(sanitizeDirectOfferAdmin) });
  } catch (error) {
    console.error('[/api/admin/direct-offers GET] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch direct offers' });
  }
});

// POST /api/admin/direct-offers — Create a new direct offer
router.post('/direct-offers', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const {
      title, description, rewardAmount, advertiserPayoutAmount,
      advertiserUrl, isActive, expirationDate, icon, coverImage,
      platforms, requirements, postbackMapping, allowedCountries, displayPlacements,
    } = req.body;

    if (!title || !description || !rewardAmount || !advertiserUrl) {
      return res.status(400).json({ success: false, error: 'title, description, rewardAmount, and advertiserUrl are required' });
    }

    const offer = await DirectOffer.create({
      title,
      description,
      rewardAmount: Number(rewardAmount),
      advertiserPayoutAmount: Number(advertiserPayoutAmount) || 0,
      advertiserUrl,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      expirationDate: expirationDate || null,
      icon: icon || null,
      coverImage: coverImage || null,
      displayPlacements: normalizeDisplayPlacements(displayPlacements),
      allowedCountries: parseAllowedCountriesInput(allowedCountries),
      platforms: platforms || { desktop: true, android: true, ios: true },
      requirements: requirements || [],
      postbackMapping: postbackMapping || {},
      // postbackSecretKey is auto-generated by the model default
    });

    await createLog(req.user._id, 'create_direct_offer', null, { offerId: offer._id, title });
    res.status(201).json({ success: true, offer: sanitizeDirectOfferAdmin(offer) });
  } catch (error) {
    console.error('[/api/admin/direct-offers POST] Error:', error);
    res.status(error.statusCode || 500).json({ success: false, error: error.statusCode ? error.message : 'Failed to create direct offer' });
  }
});

// PUT /api/admin/direct-offers/:id — Edit a direct offer
router.put('/direct-offers/:id', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const {
      title, description, rewardAmount, advertiserPayoutAmount,
      advertiserUrl, isActive, expirationDate, icon, coverImage,
      platforms, requirements, postbackMapping, allowedCountries, displayPlacements,
    } = req.body;

    const offer = await DirectOffer.findByIdAndUpdate(
      req.params.id,
      {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(rewardAmount !== undefined && { rewardAmount: Number(rewardAmount) }),
        ...(advertiserPayoutAmount !== undefined && { advertiserPayoutAmount: Number(advertiserPayoutAmount) }),
        ...(advertiserUrl !== undefined && { advertiserUrl }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(expirationDate !== undefined && { expirationDate: expirationDate || null }),
        ...(icon !== undefined && { icon }),
        ...(coverImage !== undefined && { coverImage }),
        ...(displayPlacements !== undefined && { displayPlacements: normalizeDisplayPlacements(displayPlacements) }),
        ...(allowedCountries !== undefined && { allowedCountries: parseAllowedCountriesInput(allowedCountries) }),
        ...(platforms !== undefined && { platforms }),
        ...(requirements !== undefined && { requirements }),
        ...(postbackMapping !== undefined && { postbackMapping }),
      },
      { new: true }
    );

    if (!offer) return res.status(404).json({ success: false, error: 'Direct offer not found' });

    await createLog(req.user._id, 'update_direct_offer', null, { offerId: offer._id, title: offer.title });
    res.json({ success: true, offer: sanitizeDirectOfferAdmin(offer) });
  } catch (error) {
    console.error('[/api/admin/direct-offers PUT] Error:', error);
    res.status(error.statusCode || 500).json({ success: false, error: error.statusCode ? error.message : 'Failed to update direct offer' });
  }
});

// DELETE /api/admin/direct-offers/:id — Deactivate (soft delete) a direct offer
router.delete('/direct-offers/:id', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const offer = await DirectOffer.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!offer) return res.status(404).json({ success: false, error: 'Direct offer not found' });

    await createLog(req.user._id, 'deactivate_direct_offer', null, { offerId: offer._id, title: offer.title });
    res.json({ success: true, message: 'Direct offer deactivated', offer: sanitizeDirectOfferAdmin(offer) });
  } catch (error) {
    console.error('[/api/admin/direct-offers DELETE] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to deactivate direct offer' });
  }
});

// GET /api/admin/direct-offers/:id/clicks — View click logs for a specific offer
router.get('/direct-offers/:id/clicks', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const status = cleanString(req.query.status, 40);
    const query = { offerId: req.params.id };
    if (status) {
      if (!CLICK_STATUSES.includes(status)) return res.status(400).json({ success: false, error: 'Invalid click status filter' });
      query.status = status;
    }

    const clicks = await ClickLog.find(query)
      .populate('userId', 'displayName email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await ClickLog.countDocuments(query);
    res.json({ success: true, clicks: clicks.map(serializeClickLogAdmin), total, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('[/api/admin/direct-offers/:id/clicks GET] Error:', error);
    res.status(error.statusCode || 500).json({ success: false, error: error.statusCode ? error.message : 'Failed to fetch click logs' });
  }
});

// GET /api/admin/click-logs — View all click logs (global, with filters)
router.get('/click-logs', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const status = cleanString(req.query.status, 40);
    const userId = cleanString(req.query.userId, 120);
    const offerId = cleanString(req.query.offerId, 120);
    const providerId = cleanString(req.query.providerId, 80);
    const providerType = cleanString(req.query.providerType, 60);
    const campaignType = cleanString(req.query.campaignType, 60);
    const clickId = cleanString(req.query.clickId, 120);
    const query = {};
    if (status) {
      if (!CLICK_STATUSES.includes(status)) return res.status(400).json({ success: false, error: 'Invalid click status filter' });
      query.status = status;
    }
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ success: false, error: 'Invalid user filter' });
      query.userId = userId;
    }
    if (offerId) {
      if (!mongoose.Types.ObjectId.isValid(offerId)) return res.status(400).json({ success: false, error: 'Invalid offer filter' });
      query.offerId = offerId;
    }
    if (providerId) query.providerId = cleanProviderId(providerId);
    if (providerType) {
      if (!PROVIDER_TYPES.includes(providerType)) return res.status(400).json({ success: false, error: 'Invalid provider type filter' });
      query.providerType = providerType;
    }
    if (campaignType) {
      if (!CAMPAIGN_TYPES.includes(campaignType)) return res.status(400).json({ success: false, error: 'Invalid campaign type filter' });
      query.campaignType = campaignType;
    }
    if (clickId) query.clickId = clickId;

    const clicks = await ClickLog.find(query)
      .populate('userId', 'displayName email')
      .populate('offerId', 'title rewardAmount')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await ClickLog.countDocuments(query);
    res.json({
      success: true,
      clicks: clicks.map(serializeClickLogAdmin),
      total,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[/api/admin/click-logs GET] Error:', error);
    res.status(error.statusCode || 500).json({ success: false, error: error.statusCode ? error.message : 'Failed to fetch click logs' });
  }
});

// POST /api/admin/click-logs/:clickId/approve — Manual override: approve a click
router.post('/click-logs/:clickId/approve', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const clickLog = await ClickLog.findOne({ clickId: req.params.clickId }).populate('offerId');
    if (!clickLog) return res.status(404).json({ success: false, error: 'Click log not found' });
    if (clickLog.status === 'approved') {
      return res.status(400).json({ success: false, error: 'Click already approved' });
    }

    const offer = clickLog.offerId;
    const user = await User.findById(clickLog.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const coinsToCredit = clickLog.rewardAmount;
    const settings = await Settings.getSingleton();
    const holdDecision = getEarningHoldDecision(settings, coinsToCredit);
    const newBalance = user.walletBalance + holdDecision.walletCredit;

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $inc: { walletBalance: holdDecision.walletCredit, totalEarned: coinsToCredit } },
      { new: true }
    );

    const tx = await Transaction.create({
      userId: user._id,
      transactionType: 'direct_offer_reward',
      amount: coinsToCredit,
      balanceAfter: newBalance,
      description: `Direct offer reward (manual): ${offer ? offer.title : 'Unknown Offer'}`,
      status: holdDecision.status,
      holdUntil: holdDecision.holdUntil,
      sourceType: 'direct_offer',
      sourceId: clickLog.offerId._id,
      metadata: {
        clickId: req.params.clickId,
        manualApproval: true,
        adminId: req.user._id,
        walletApplied: holdDecision.walletCredit > 0,
        holdApplied: holdDecision.status === 'hold',
        holdDays: holdDecision.holdDays,
      },
      externalId: `direct:${req.params.clickId}`,
    });

    clickLog.status = 'approved';
    clickLog.convertedAt = new Date();
    clickLog.transactionId = tx._id;
    await clickLog.save();

    if (offer) {
      await DirectOffer.findByIdAndUpdate(offer._id, { $inc: { totalApproved: 1 } });
    }

    await notify(
      user._id,
      'direct_offer_reward',
      holdDecision.status === 'hold' ? 'Offer Reward on Hold' : '🎉 Offer Completed!',
      holdDecision.status === 'hold'
        ? `Your reward of ${coinsToCredit.toLocaleString()} coins from "${offer ? offer.title : 'Direct Offer'}" is on hold.`
        : `You earned ${coinsToCredit.toLocaleString()} coins from "${offer ? offer.title : 'Direct Offer'}".`,
      { txId: tx._id, amount: coinsToCredit }
    );

    if (holdDecision.walletCredit > 0) {
      emitWalletUpdate(user.firebaseUid, newBalance);
    }

    try { await processVipLevelUp(updatedUser || user, coinsToCredit, emitToUser); } catch (e) { /* non-fatal */ }

    await createLog(req.user._id, 'manual_approve_click', user._id, { clickId: req.params.clickId, coins: coinsToCredit });
    res.json({ success: true, message: `Approved. Credited ${coinsToCredit} coins to ${user.displayName || user.email}` });
  } catch (error) {
    console.error('[/api/admin/click-logs/:clickId/approve] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve click' });
  }
});

// POST /api/admin/click-logs/:clickId/reject — Manual override: reject a click
router.post('/click-logs/:clickId/reject', requirePermission('manage_offerwalls'), async (req, res) => {
  try {
    const clickLog = await ClickLog.findOne({ clickId: req.params.clickId });
    if (!clickLog) return res.status(404).json({ success: false, error: 'Click log not found' });
    if (clickLog.status === 'approved') {
      return res.status(400).json({ success: false, error: 'Cannot reject an already approved click' });
    }
    if (clickLog.status === 'rejected') {
      return res.status(400).json({ success: false, error: 'Click already rejected' });
    }

    clickLog.status = 'rejected';
    clickLog.convertedAt = new Date();
    await clickLog.save();

    if (clickLog.offerId) {
      await DirectOffer.findByIdAndUpdate(clickLog.offerId, { $inc: { totalRejected: 1 } });
    }

    await createLog(req.user._id, 'manual_reject_click', clickLog.userId, { clickId: req.params.clickId });
    res.json({ success: true, message: 'Click rejected' });
  } catch (error) {
    console.error('[/api/admin/click-logs/:clickId/reject] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject click' });
  }
});

router._phase8AdminHelpers = {
  getPagination,
  normalizeResponseConfig,
  parseWriteOnlySecret,
  serializeProviderConfig,
  serializeClickLogAdmin,
  sanitizeDirectOfferAdmin,
  serializePostbackLog,
  applyWriteOnlyProviderSecret,
  boundAdminPayload,
  cleanString,
  validateProviderSettings,
  validateParameterMappings,
  validateSecurityConfig,
  validateStatusMappings,
};

module.exports = router;
