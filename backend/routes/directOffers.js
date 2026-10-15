const express = require('express');
const router = express.Router();
const DirectOffer = require('../models/DirectOffer');
const ClickLog = require('../models/ClickLog');
const Conversion = require('../models/Conversion');
const User = require('../models/User');
const { emitToUser, emitWalletUpdate } = require('../utils/walletEvents');
const { verifyToken } = require('../middlewares/authMiddleware');
const { fraudCheck } = require('../middlewares/fraudCheck');
const { processVipLevelUp } = require('../utils/vipUtils');
const {
  buildRedirectUrl,
  createDirectOfferClick,
  releaseDirectOfferClickSlot,
  reserveDirectOfferClickSlot,
} = require('../services/tracking/clickService');
const { buildDirectOfferProviderConfig } = require('../services/tracking/directOfferProvider');
const {
  buildActiveGoalConversionQuery,
  groupCompletedGoalKeysByOffer,
  resolveCompletedGoalKeys,
} = require('../services/tracking/offerGoalCompletion');
const { processPostback } = require('../services/tracking/conversionService');
const { processReward } = require('../services/rewards/rewardService');
const { processReversal } = require('../services/rewards/reversalService');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/direct-offers
// Public (with token): list active direct offers with user's click status.
// ?placement=featured (default) | brandedOfferwall | all
// Both placements share the same offer records and tracking flow.
// ─────────────────────────────────────────────────────────────────────────────
const PLACEMENTS = ['featured', 'brandedOfferwall', 'all'];

const buildPlacementClause = (placement) => {
  if (placement === 'brandedOfferwall') {
    return { 'displayPlacements.brandedOfferwall': true };
  }
  if (placement === 'all') {
    return {
      $or: [
        { 'displayPlacements.featured': { $ne: false } },
        { 'displayPlacements.brandedOfferwall': true },
      ],
    };
  }
  return { 'displayPlacements.featured': { $ne: false } };
};

// Resolves the placement requested by the frontend and confirms the offer is
// actually placed there. Featured is the default for backward compatibility.
const resolveClickPlacement = (offer, requested) => {
  const placement = String(requested || '').trim() === 'brandedOfferwall' ? 'brandedOfferwall' : 'featured';
  const placements = (offer && offer.displayPlacements) || {};
  if (placement === 'brandedOfferwall' && placements.brandedOfferwall !== true) {
    return { placement, allowed: false };
  }
  if (placement === 'featured' && placements.featured === false) {
    return { placement, allowed: false };
  }
  return { placement, allowed: true };
};

router.get('/', verifyToken, async (req, res) => {
  try {
    const now = new Date();
    const placement = PLACEMENTS.includes(req.query.placement) ? req.query.placement : 'featured';
    const user = await User.findOne({ firebaseUid: req.user.uid }).select('_id').lean();

    const offers = await DirectOffer.find({
      isActive: true,
      $and: [
        { $or: [{ expirationDate: null }, { expirationDate: { $gt: now } }] },
        buildPlacementClause(placement),
      ],
    }).select('-postbackSecretKey').lean();

    if (!user) {
      return res.status(200).json({ success: true, offers: offers.map(o => ({ ...o, clickStatus: null, clickId: null, completedGoalKeys: [] })) });
    }

    // Two bulk queries for the whole list (no per-offer N+1): the user's click
    // logs and the user's credited direct-offer goal Conversions.
    const [userClicks, creditedGoalConversions] = await Promise.all([
      ClickLog.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .select('offerId status clickId')
        .lean(),
      Conversion.find(buildActiveGoalConversionQuery(user._id))
        .select('offerId campaignId goalKey')
        .lean(),
    ]);

    const clickMap = {};
    for (const c of userClicks) {
      const offId = c.offerId?.toString();
      if (offId && !clickMap[offId]) {
        clickMap[offId] = c;
      }
    }

    const completedByOffer = groupCompletedGoalKeysByOffer(creditedGoalConversions);

    const offersWithStatus = offers.map((offer) => {
      const click = clickMap[offer._id.toString()];
      return {
        ...offer,
        clickStatus: click ? click.status : null,
        clickId: click ? click.clickId : null,
        completedGoalKeys: resolveCompletedGoalKeys(offer, completedByOffer),
      };
    });

    res.status(200).json({ success: true, offers: offersWithStatus });
  } catch (error) {
    console.error('[/api/direct-offers] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch direct offers' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/direct-offers/click/:offerId
// Authenticated: log a click and return the target URL as JSON.
// Frontend uses this to open the offer in a new tab after logging the click.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/click/:offerId', verifyToken, fraudCheck('offer_click', 'full'), async (req, res) => {
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

    // Placement selected by the frontend (Featured vs Branded Offerwall). Both
    // placements use this same click/tracking endpoint and offer record.
    const { placement, allowed } = resolveClickPlacement(
      offer,
      req.body?.placement || req.query?.placement
    );
    if (!allowed) {
      return res.status(400).json({ success: false, error: 'Offer is not available in this placement' });
    }

    // Check if user already has an approved click (prevent double-earn attempt)
    const existingApproved = await ClickLog.findOne({
      offerId: offer._id, userId: user._id, status: 'approved',
    });
    if (existingApproved) {
      // Already approved — just return the URL so they can revisit
      const redirectUrl = buildRedirectUrl({
        destinationUrl: offer.advertiserUrl,
        clickId: existingApproved.clickId,
        userId: user._id,
        offerId: offer._id,
        clickIdParam: offer.postbackMapping?.clickIdParam || 'click_id',
      });
      return res.status(200).json({ success: true, url: redirectUrl, clickId: existingApproved.clickId, alreadyApproved: true });
    }

    // Atomically reserve one total-click slot. This is the ONLY place totalClicks
    // is incremented, and it prevents simultaneous requests from exceeding the
    // optional overall cap. Unlimited offers always reserve.
    const reservedOffer = await reserveDirectOfferClickSlot({ offerId: offer._id });
    if (!reservedOffer) {
      return res.status(409).json({ success: false, error: 'Offer click limit reached.', limitReached: true });
    }

    let clickResult;
    try {
      clickResult = await createDirectOfferClick({
        user,
        offer,
        req,
        trackingParams: {
          source: placement === 'brandedOfferwall' ? 'branded_offerwall' : 'featured_offers',
          placement,
        },
      });
    } catch (error) {
      // ClickLog creation failed — give the reserved slot back (no net change).
      await releaseDirectOfferClickSlot({ offerId: offer._id });
      throw error;
    }

    return res.status(200).json({ success: true, url: clickResult.redirectUrl, clickId: clickResult.clickId });
  } catch (error) {
    console.error('[POST /api/direct-offers/click/:offerId] Error:', error);
    return res.status(error.statusCode || 500).json({ success: false, error: error.statusCode ? error.message : 'Failed to process click' });
  }
});

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
  PLACEMENTS,
  buildDirectOfferProviderConfig,
  buildPlacementClause,
  resolveClickPlacement,
};

module.exports = router;
