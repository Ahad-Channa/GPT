const express = require('express');
const router = express.Router();
const CustomOffer = require('../models/CustomOffer');
const CustomOfferSubmission = require('../models/CustomOfferSubmission');
const { verifyToken } = require('../middlewares/authMiddleware');
const User = require('../models/User');

// GET /api/custom-offers (Public/User) - Get active custom offers
router.get('/', verifyToken, async (req, res) => {
  try {
    const offers = await CustomOffer.find({ isActive: true });
    res.status(200).json({ success: true, offers });
  } catch (error) {
    console.error('[/api/custom-offers] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch offers' });
  }
});

// POST /api/custom-offers/:id/submit (User) - Submit proof for a custom offer
router.post('/:id/submit', verifyToken, async (req, res) => {
  try {
    const { proofText } = req.body;
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const offer = await CustomOffer.findById(req.params.id);
    if (!offer || !offer.isActive) {
      return res.status(404).json({ success: false, error: 'Offer not found or inactive' });
    }

    // Check if already submitted
    const existing = await CustomOfferSubmission.findOne({ offerId: offer._id, userId: user._id });
    if (existing) {
      return res.status(400).json({ success: false, error: 'You have already submitted this offer' });
    }

    // If trackingType is 'click', we could auto-approve or just track. For now, we do manual_approval based.
    const submission = await CustomOfferSubmission.create({
      offerId: offer._id,
      userId: user._id,
      proofText: proofText || '',
      status: offer.trackingType === 'click' ? 'approved' : 'pending' // Just a naive auto-approve for click type for now
    });

    res.status(201).json({ success: true, submission, message: 'Proof submitted successfully' });
  } catch (error) {
    console.error('[/api/custom-offers/:id/submit] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit proof' });
  }
});

module.exports = router;
