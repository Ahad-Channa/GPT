const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const DirectOffer = require('../models/DirectOffer');
const ClickLog = require('../models/ClickLog');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const notify = require('../utils/notify');
const { emitWalletUpdate } = require('../utils/walletEvents');
const { verifyToken } = require('../middlewares/authMiddleware');
const { processVipLevelUp } = require('../utils/vipUtils');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Detect device type from User-Agent string
// ─────────────────────────────────────────────────────────────────────────────
const detectDevice = (ua = '') => {
  const s = ua.toLowerCase();
  if (/tablet|ipad|playbook|silk/.test(s)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/.test(s)) return 'mobile';
  return 'desktop';
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Extract IP from request (works behind proxies)
// ─────────────────────────────────────────────────────────────────────────────
const getIp = (req) =>
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.socket?.remoteAddress ||
  '';

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

    // Generate a unique clickId
    const clickId = uuidv4();
    const ip = getIp(req);
    const userAgent = req.headers['user-agent'] || '';
    const device = detectDevice(userAgent);

    await ClickLog.create({
      clickId,
      offerId: offer._id,
      userId: user._id,
      ip,
      userAgent,
      device,
      country: '',
      status: 'clicked',
      rewardAmount: offer.rewardAmount,
    });

    // Increment offer click counter
    await DirectOffer.findByIdAndUpdate(offer._id, { $inc: { totalClicks: 1 } });

    // Build target URL with click_id appended
    let targetUrl = offer.advertiserUrl;
    try {
      const url = new URL(targetUrl);
      url.searchParams.set('click_id', clickId);
      targetUrl = url.toString();
    } catch {
      const separator = targetUrl.includes('?') ? '&' : '?';
      targetUrl = `${targetUrl}${separator}click_id=${clickId}`;
    }

    return res.status(200).json({ success: true, url: targetUrl, clickId });
  } catch (error) {
    console.error('[POST /api/direct-offers/click/:offerId] Error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process click' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/direct-offers/postback
// PUBLIC (no auth) — Called by advertiser's server to confirm a conversion
//
// Expected query params:
//   click_id  — The UUID we generated when the user clicked
//   status    — "approved" | "rejected"
//   secret    — The offer's postbackSecretKey (set in admin)
//   payout    — (optional) USD amount advertiser is paying you
//
// Returns "1" on success (industry standard), "0" on failure
// ─────────────────────────────────────────────────────────────────────────────
router.get('/postback', async (req, res) => {
  const { click_id, status, secret, payout } = req.query;

  // Basic param validation
  if (!click_id || !status || !secret) {
    console.warn('[Postback] Missing required params:', req.query);
    return res.status(200).send('0'); // Return 0 but 200 status so advertiser doesn't retry forever
  }

  const normalizedStatus = status.toLowerCase();
  if (!['approved', 'rejected'].includes(normalizedStatus)) {
    console.warn('[Postback] Invalid status value:', status);
    return res.status(200).send('0');
  }

  try {
    // Find the click log
    const clickLog = await ClickLog.findOne({ clickId: click_id }).populate('offerId');
    if (!clickLog) {
      console.warn('[Postback] ClickLog not found for click_id:', click_id);
      return res.status(200).send('1'); // Silently OK — may have been already processed
    }

    const offer = clickLog.offerId;
    if (!offer) {
      console.warn('[Postback] Offer not found for clickLog:', click_id);
      return res.status(200).send('1');
    }

    // Validate the secret
    if (offer.postbackSecretKey !== secret) {
      console.error('[Postback] Secret mismatch for offer:', offer._id, '| click_id:', click_id);
      return res.status(200).send('0');
    }

    // Idempotency: if already processed, silently return success
    if (clickLog.status === 'approved' || clickLog.status === 'rejected') {
      console.log('[Postback] Already processed click_id:', click_id, '| Status:', clickLog.status);
      return res.status(200).send('1');
    }

    if (normalizedStatus === 'rejected') {
      // Mark as rejected
      clickLog.status = 'rejected';
      clickLog.convertedAt = new Date();
      await clickLog.save();

      await DirectOffer.findByIdAndUpdate(offer._id, { $inc: { totalRejected: 1 } });
      console.log('[Postback] Click rejected. click_id:', click_id);
      return res.status(200).send('1');
    }

    // ── APPROVAL FLOW ──────────────────────────────────────────────────────
    const user = await User.findById(clickLog.userId);
    if (!user) {
      console.warn('[Postback] User not found for click_id:', click_id);
      return res.status(200).send('1');
    }

    if (user.isBanned) {
      clickLog.status = 'rejected';
      clickLog.convertedAt = new Date();
      await clickLog.save();
      console.warn('[Postback] Banned user attempted postback. userId:', user._id);
      return res.status(200).send('1');
    }

    const coinsToCredit = clickLog.rewardAmount;
    const payoutAmount = payout ? parseFloat(payout) || 0 : offer.advertiserPayoutAmount || 0;

    // Credit user wallet
    const newBalance = user.walletBalance + coinsToCredit;
    const newTotalEarned = user.totalEarned + coinsToCredit;

    await User.findByIdAndUpdate(user._id, {
      $inc: { walletBalance: coinsToCredit, totalEarned: coinsToCredit },
    });

    // Create transaction
    const tx = await Transaction.create({
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
        clickId: click_id,
        advertiserPayout: payoutAmount,
      },
      externalId: `direct:${click_id}`, // Prevents duplicate crediting
    });

    // Update click log
    clickLog.status = 'approved';
    clickLog.convertedAt = new Date();
    clickLog.advertiserPayout = payoutAmount;
    clickLog.transactionId = tx._id;
    await clickLog.save();

    // Update offer stats
    await DirectOffer.findByIdAndUpdate(offer._id, { $inc: { totalApproved: 1 } });

    // Send notification
    await notify(
      user._id,
      'direct_offer_reward',
      '🎉 Offer Completed!',
      `You earned ${coinsToCredit.toLocaleString()} coins from "${offer.title}".`,
      { txId: tx._id, amount: coinsToCredit, offerTitle: offer.title }
    );

    // Emit real-time wallet update via socket
    emitWalletUpdate(user.firebaseUid, newBalance);

    // Process VIP level up if applicable
    try {
      await processVipLevelUp(user._id);
    } catch (vipErr) {
      console.error('[Postback] VIP level up check failed:', vipErr.message);
    }

    console.log(`[Postback] ✅ Approved. User: ${user._id} | Offer: ${offer.title} | Coins: +${coinsToCredit}`);
    return res.status(200).send('1');
  } catch (error) {
    console.error('[Postback] Unexpected error:', error);
    return res.status(200).send('0');
  }
});

module.exports = router;
