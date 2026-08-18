const express = require('express');
const router = express.Router();
const DirectOffer = require('../models/DirectOffer');
const ClickLog = require('../models/ClickLog');
const User = require('../models/User');
const { emitToUser, emitWalletUpdate } = require('../utils/walletEvents');
const { verifyToken } = require('../middlewares/authMiddleware');
const { processVipLevelUp } = require('../utils/vipUtils');
const { createDirectOfferClick } = require('../services/tracking/clickService');
const { processPostback } = require('../services/tracking/conversionService');
const { processReward } = require('../services/rewards/rewardService');
const { processReversal } = require('../services/rewards/reversalService');

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
    },
  };
};

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
  if (typeof secret !== 'string' || !secret.trim()) {
    console.warn('[Postback] Missing or malformed secret param.');
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

    if (result.ok && result.internalStatus === 'pending' && result.clickLog) {
      await ClickLog.findByIdAndUpdate(result.clickLog._id, { $set: { status: 'pending' } });
    }

    if (result.ok && result.internalStatus === 'rejected' && result.clickLog) {
      await ClickLog.findByIdAndUpdate(result.clickLog._id, {
        $set: { status: 'rejected', convertedAt: new Date() },
      });
      await DirectOffer.findByIdAndUpdate(offer._id, { $inc: { totalRejected: 1 } });
    }

    if (result.ok && result.shouldProcessFinancial && result.internalStatus === 'approved') {
      await processReward({
        conversion: result.conversion,
        hooks: {
          emitWalletUpdate,
          processVipLevelUp: (user, amount) => processVipLevelUp(user, amount, emitToUser),
        },
      });
    }

    if (result.ok && result.shouldProcessFinancial && result.internalStatus === 'reversed') {
      await processReversal({
        conversion: result.conversion,
        hooks: { emitWalletUpdate },
      });
    }

    return res.status(result.response.status).send(result.response.body);
  } catch (error) {
    console.error('[Postback] Unexpected error:', error);
    return res.status(200).send('0');
  }
});

router.__testInternals = {
  buildDirectOfferProviderConfig,
};

module.exports = router;
