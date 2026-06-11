const express = require('express');
const router = express.Router();
const CustomOffer = require('../models/CustomOffer');
const CustomOfferSubmission = require('../models/CustomOfferSubmission');
const { verifyToken } = require('../middlewares/authMiddleware');
const User = require('../models/User');

// GET /api/custom-offers (Public/User) - Get active custom offers
router.get('/', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    const offers = await CustomOffer.find({ isActive: true });
    
    // Attach user submission status to each offer so frontend knows if it's pending/approved/rejected
    let offersWithStatus = offers.map(o => ({ ...o.toObject(), submissionStatus: null, adminNote: null }));
    if (user) {
      const submissions = await CustomOfferSubmission.find({ userId: user._id });
      offersWithStatus = offersWithStatus.map(offer => {
        const sub = submissions.find(s => s.offerId.toString() === offer._id.toString());
        if (sub) {
          return { ...offer, submissionStatus: sub.status, adminNote: sub.adminNote };
        }
        return offer;
      });
    }

    res.status(200).json({ success: true, offers: offersWithStatus });
  } catch (error) {
    console.error('[/api/custom-offers] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch offers' });
  }
});

// POST /api/custom-offers/:id/start (User) - Start a custom offer
router.post('/:id/start', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const offer = await CustomOffer.findById(req.params.id);
    if (!offer || !offer.isActive) {
      return res.status(404).json({ success: false, error: 'Offer not found or inactive' });
    }

    const existing = await CustomOfferSubmission.findOne({ offerId: offer._id, userId: user._id });
    if (existing) {
      // If already started or pending, just return it
      return res.status(200).json({ success: true, submission: existing, message: 'Offer already started' });
    }

    // Create a 'started' submission
    const submission = await CustomOfferSubmission.create({
      offerId: offer._id,
      userId: user._id,
      status: 'started'
    });

    // Save user activity log for clicking/starting the offer
    await require('../models/UserActivityLog').create({
      userId: user._id,
      actionType: 'click_offer',
      targetId: offer._id,
      metadata: { offerTitle: offer.title, sourceType: 'featured_offer' }
    });

    res.status(201).json({ success: true, submission, message: 'Offer started successfully' });
  } catch (error) {
    console.error('[/api/custom-offers/:id/start] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to start offer' });
  }
});

// POST /api/custom-offers/:id/submit (User) - Submit proof for a custom offer
router.post('/:id/submit', verifyToken, async (req, res) => {
  try {
    const { proofText, proofImage } = req.body;
    const user = await User.findOne({ firebaseUid: req.user.uid });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const offer = await CustomOffer.findById(req.params.id);
    if (!offer || !offer.isActive) {
      return res.status(404).json({ success: false, error: 'Offer not found or inactive' });
    }

    // Check if already submitted
    const existing = await CustomOfferSubmission.findOne({ offerId: offer._id, userId: user._id });
    
    if (!existing) {
      return res.status(400).json({ success: false, error: 'You must start the offer first before submitting proof.' });
    }

    if (existing.status === 'pending' || existing.status === 'approved') {
      return res.status(400).json({ success: false, error: 'You have already submitted this offer' });
    }

    if (existing.status === 'rejected' || existing.status === 'started' || existing.status === 'chargebacked') {
      existing.proofText = proofText || '';
      existing.proofImage = proofImage || '';
      existing.status = 'pending';
      existing.adminNote = '';
      await existing.save();

      // Save user activity log for the resubmission/submission
      await require('../models/UserActivityLog').create({
        userId: user._id,
        actionType: 'proof_submit',
        targetId: offer._id,
        metadata: { offerTitle: offer.title, isResubmission: existing.status === 'rejected' }
      });

      return res.status(200).json({ success: true, submission: existing, message: 'Proof submitted successfully' });
    }
  } catch (error) {
    console.error('[/api/custom-offers/:id/submit] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit proof' });
  }
});

module.exports = router;
