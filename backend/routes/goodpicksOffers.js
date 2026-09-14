const express = require('express');
const router = express.Router();
const GoodpickOffer = require('../models/GoodpickOffer');
const { verifyToken } = require('../middlewares/authMiddleware');

// GET /api/goodpicks-offers — Public/User list of active Goodpicks offers
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const offers = await GoodpickOffer.find({
      isActive: true,
      $or: [{ expirationDate: null }, { expirationDate: { $gt: now } }],
    })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, offers });
  } catch (error) {
    console.error('[/api/goodpicks-offers] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch Goodpicks offers' });
  }
});

// POST /api/goodpicks-offers/:id/click — Direct click/start offer
router.post('/:id/click', verifyToken, async (req, res) => {
  try {
    const offer = await GoodpickOffer.findById(req.params.id);
    if (!offer || !offer.isActive) {
      return res.status(404).json({ success: false, error: 'Offer not found or inactive' });
    }
    res.status(200).json({ success: true, url: offer.externalLink });
  } catch (error) {
    console.error('[/api/goodpicks-offers/:id/click] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to process offer click' });
  }
});

module.exports = router;
