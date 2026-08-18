const express = require('express');
const router = express.Router();
const DirectOffer = require('../models/DirectOffer');
const ClickLog = require('../models/ClickLog');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Conversion = require('../models/Conversion');
const notify = require('../utils/notify');
const { emitWalletUpdate } = require('../utils/walletEvents');
const { verifyToken } = require('../middlewares/authMiddleware');
const { processVipLevelUp } = require('../utils/vipUtils');
const { createDirectOfferClick } = require('../services/tracking/clickService');
const { processPostback } = require('../services/tracking/conversionService');

const PHASE4_BRIDGE_CLAIM_LIMIT = 500;

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/direct-offers
// Public (with token): list active direct offers with user's click status
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const now = new Date();
    const user = await User.findOne({ firebaseUid: req.user.uid });

    const offers = await DirectOffer.find({
      isActive: true,
      'displayPlacements.featured': { $ne: false },
      $or: [{ expirationDate: null }, { expirationDate: { $gt: now } }],
    }).select('-postbackSecretKey'); // Never expose the secret to frontend

    if (!user) {
      return res.status(200).json({ success: true, offers: offers.map(o => ({ ...o.toObject(), clickStatus: null })) });
    }

    // Attach the user's latest click status for each offer
    const offersWithStatus = await Promise.all(
      offers.map(async (offer) => {
        const latestClick = await ClickLog.findOne({ offerId: offer._id, userId: user._id })
          .sort({ createdAt: -1 });
        return {
          ...offer.toObject(),
          clickStatus: latestClick ? latestClick.status : null,
          clickId: latestClick ? latestClick.clickId : null,
        };
      })
    );

    res.status(200).json({ success: true, offers: offersWithStatus });
  } catch (error) {
    console.error('[GET /api/direct-offers] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch direct offers' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/direct-offers/click/:offerId
// Authenticated: log a click and return the target URL as JSON.
// Frontend uses this to open the offer in a new tab after logging the click.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/click/:offerId', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    if (user.isBanned) return res.status(403).json({ success: false, error: 'Account suspended' });

    const offer = await DirectOffer.findById(req.params.offerId);
    if (!offer || !offer.isActive) {
      return res.status(404).json({ success: false, error: 'Offer not found or inactive' });
    }
    if (offer.expirationDate && new Date(offer.expirationDate) < new Date()) {
      return res.status(400).json({ success: false, error: 'Offer has expired' });
    }

    // Check if user already has an approved click (prevent double-earn attempt)
    const existingApproved = await ClickLog.findOne({
      offerId: offer._id, userId: user._id, status: 'approved',
    });
    if (existingApproved) {
      // Already approved — just return the URL so they can revisit
      return res.status(200).json({ success: true, url: offer.advertiserUrl, alreadyApproved: true });
    }

    const { clickId, redirectUrl } = await createDirectOfferClick({
      user,
      offer,
      req,
      trackingParams: {
        source: 'featured_offers',
        placement: 'featured',
      },
    });

    // Increment offer click counter
    await DirectOffer.findByIdAndUpdate(offer._id, { $inc: { totalClicks: 1 } });

    return res.status(200).json({ success: true, url: redirectUrl, clickId });
  } catch (error) {
    console.error('[POST /api/direct-offers/click/:offerId] Error:', error);
    return res.status(error.statusCode || 500).json({ success: false, error: error.statusCode ? error.message : 'Failed to process click' });
  }
});

const buildDirectOfferProviderConfig = (offer) => {
  const mapping = offer.postbackMapping || {};
  return {
    providerId: 'direct',
    name: 'Direct Offers',
    type: 'direct',
    enabled: Boolean(offer.isActive),
    parameterMappings: {
      clickId: mapping.clickIdParam || 'click_id',
      transactionId: mapping.transactionIdParam || 'txn_id',
      status: mapping.statusParam || 'status',
      payout: mapping.payoutParam || 'payout',
      eventType: mapping.eventTypeParam || 'event_type',
    },
    statusMappings: {
      pending: [mapping.pendingValue || 'pending'],
      approved: [mapping.approvedValue || 'approved'],
      rejected: [mapping.rejectedValue || 'rejected'],
      reversed: [mapping.reversedValue || 'reversed', 'chargeback'],
    },
    security: {
      method: 'shared_secret',
      tokenParam: 'secret',
      secretValue: offer.postbackSecretKey,
    },
    responseConfig: {
      successStatus: 200,
      successBody: '1',
      duplicateStatus: 200,
      duplicateBody: '1',
      errorStatus: 200,
      errorBody: '0',
    },
    ipAllowlist: [],
    providerSettings: {
      requiredFields: ['clickId', 'transactionId', 'status'],
      temporaryRewardBridge: 'direct_offer_legacy_reward_bridge_phase6_removal',
    },
  };
};

// Temporary Phase 4 bridge: keeps existing direct-offer wallet behavior only after
// shared mapping, security, ClickLog resolution, status mapping, and Conversion
// idempotency accept the postback. Phase 6 should replace this with the final
// atomic reward/reversal service.
const applyValidatedDirectOfferRewardBridge = async ({ offer, result }) => {
  if (!result?.ok || !result.shouldProcessRewardBridge) return;

  const clickLog = result.clickLog;
  const conversion = result.conversion;
  const clickIdValue = result.mapped.clickId;
  const payoutAmount = result.mapped.payout ? parseFloat(result.mapped.payout) || 0 : offer.advertiserPayoutAmount || 0;

  if (result.internalStatus === 'pending') {
    clickLog.status = 'pending';
    await clickLog.save();
    return;
  }

  if (result.internalStatus === 'reversed') {
    return;
  }

  if (result.internalStatus !== 'approved' && result.internalStatus !== 'rejected') {
    return;
  }

  if (result.internalStatus === 'rejected') {
    if (clickLog.status === 'rejected' || clickLog.status === 'approved') return;
    clickLog.status = 'rejected';
    clickLog.convertedAt = new Date();
    await clickLog.save();

    await DirectOffer.findByIdAndUpdate(offer._id, { $inc: { totalRejected: 1 } });
    console.log('[Postback] Click rejected. click_id:', clickIdValue);
    return;
  }

  if (clickLog.status === 'approved') {
    return;
  }

  const claimedConversion = conversion?._id
    ? await Conversion.findOneAndUpdate(
      {
        _id: conversion._id,
        internalStatus: 'approved',
        processingState: { $in: ['claimed', 'failed'] },
        rewardTransactionId: null,
      },
      {
        $set: {
          processingState: 'processing',
          errorReason: '',
        },
      },
      { new: true }
    )
    : null;

  if (conversion?._id && !claimedConversion) {
    return;
  }

  try {
    const user = await User.findById(clickLog.userId);
    if (!user) {
      console.warn('[Postback] User not found for click_id:', clickIdValue);
      throw new Error('User not found for direct-offer reward bridge.');
    }

    if (user.isBanned) {
      clickLog.status = 'rejected';
      clickLog.convertedAt = new Date();
      await clickLog.save();
      console.warn('[Postback] Banned user attempted postback. userId:', user._id);
      throw new Error('Banned user rejected by direct-offer reward bridge.');
    }

    const coinsToCredit = clickLog.rewardAmount;
    const walletClaimId = conversion?._id;
    const updatedUser = walletClaimId
      ? await User.findOneAndUpdate(
        {
          _id: user._id,
          phase4RewardBridgeClaims: { $ne: walletClaimId },
        },
        {
          $inc: { walletBalance: coinsToCredit, totalEarned: coinsToCredit },
          $addToSet: { phase4RewardBridgeClaims: walletClaimId },
        },
        { new: true }
      )
      : await User.findByIdAndUpdate(
        user._id,
        { $inc: { walletBalance: coinsToCredit, totalEarned: coinsToCredit } },
        { new: true }
      );

    const effectiveUser = updatedUser || await User.findById(user._id);
    const newBalance = effectiveUser.walletBalance;
    const externalId = `direct:${clickIdValue}`;
    let tx = await Transaction.findOne({ externalId });

    if (!tx) {
      tx = await Transaction.create({
        userId: user._id,
        transactionType: 'direct_offer_reward',
        amount: coinsToCredit,
        balanceAfter: newBalance,
        description: `Direct offer reward: ${offer.title}`,
        status: 'completed',
        sourceType: 'offer',
        sourceId: offer._id,
        metadata: {
          offerId: offer._id,
          offerTitle: offer.title,
          clickId: clickIdValue,
          advertiserTransactionId: result.mapped.transactionId,
          advertiserPayout: payoutAmount,
          walletApplied: Boolean(updatedUser),
        },
        externalId,
        conversionId: conversion?._id || null,
      });
    }

    clickLog.status = 'approved';
    clickLog.convertedAt = new Date();
    clickLog.advertiserPayout = payoutAmount;
    clickLog.transactionId = tx._id;
    await clickLog.save();

    if (conversion?._id) {
      const claimUser = await User.findById(user._id).select('phase4RewardBridgeClaims');
      if (claimUser?.phase4RewardBridgeClaims?.length > PHASE4_BRIDGE_CLAIM_LIMIT) {
        claimUser.phase4RewardBridgeClaims = claimUser.phase4RewardBridgeClaims.slice(-PHASE4_BRIDGE_CLAIM_LIMIT);
        await claimUser.save();
      }
      await Conversion.findByIdAndUpdate(conversion._id, {
        $set: {
          processingState: 'processed',
          rewardTransactionId: tx._id,
          errorReason: '',
        },
      });
    }

    await DirectOffer.findByIdAndUpdate(offer._id, { $inc: { totalApproved: 1 } });

    await notify(
      user._id,
      'direct_offer_reward',
      '🎉 Offer Completed!',
      `You earned ${coinsToCredit.toLocaleString()} coins from "${offer.title}".`,
      { txId: tx._id, amount: coinsToCredit, offerTitle: offer.title }
    );

    emitWalletUpdate(user.firebaseUid, newBalance);

    try {
      await processVipLevelUp(user._id);
    } catch (vipErr) {
      console.error('[Postback] VIP level up check failed:', vipErr.message);
    }

    console.log(`[Postback] ✅ Approved. User: ${user._id} | Offer: ${offer.title} | Coins: +${coinsToCredit}`);
  } catch (error) {
    if (conversion?._id) {
      await Conversion.findByIdAndUpdate(conversion._id, {
        $set: {
          processingState: 'failed',
          errorReason: error.message || 'Direct-offer reward bridge failed.',
        },
      });
    }
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/direct-offers/postback
// PUBLIC (no auth) — Called by advertiser's server to confirm a conversion
//
// Each offer has its own postbackMapping that defines which query-param names
// the advertiser uses.  The only fixed param is "secret" (authentication).
//
// Flow: secret → find offer → read dynamic params → find clickLog → process
//
// Returns "1" on success (industry standard), "0" on failure
// ─────────────────────────────────────────────────────────────────────────────
router.get('/postback', async (req, res) => {
  const { secret } = req.query;

  // Secret is always required — it's our auth mechanism
  if (!secret) {
    console.warn('[Postback] Missing secret param:', req.query);
    return res.status(200).send('0');
  }

  try {
    // ── Step 1: Find the offer by its unique secret key ───────────────────
    const offer = await DirectOffer.findOne({ postbackSecretKey: secret });
    if (!offer) {
      console.error('[Postback] No offer found for secret:', secret.slice(0, 8) + '...');
      return res.status(200).send('0');
    }

    const result = await processPostback({
      providerConfig: buildDirectOfferProviderConfig(offer),
      req,
      route: '/api/direct-offers/postback',
      expectedOfferId: offer._id,
      expectedCampaignId: offer._id,
    });

    if (result.ok && result.shouldProcessRewardBridge) {
      await applyValidatedDirectOfferRewardBridge({ offer, result });
    }

    return res.status(result.response.status).send(result.response.body);
  } catch (error) {
    console.error('[Postback] Unexpected error:', error);
    return res.status(200).send('0');
  }
});

module.exports = router;
