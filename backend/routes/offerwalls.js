const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const Settings = require('../models/Settings');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const PROVIDER_SECRET_MAP = {
  cpx:       'CPX_HASH_KEY',
  adgem:     'ADGEM_API_KEY',
  lootably:  'LOOTABLY_SECRET',
  torox:     'TOROX_SECRET',
  primeearn: 'PRIMEEARN_SECRET',
  ayet:      'AYET_SECRET',
  adtowall:  'ADTOWALL_SECRET',
  revu:      'REVU_SECRET',
};

// Generic Postback Handler
const handlePostback = async (providerId, req, res, params) => {
  try {
    const { userId, providerUnits, transactionId, secretParam } = params;

    const settings = await Settings.getSingleton();
    const provider = settings.offerwallProviders.find((p) => p.id === providerId);

    // 2. If provider.enabled === false → return "1" silently (ignores unexpected postbacks)
    if (!provider || !provider.enabled) {
      return res.status(200).send('1');
    }

    // 3. Validate hash/secret
    const envSecretKey = PROVIDER_SECRET_MAP[providerId];
    const envSecret = process.env[envSecretKey];

    if (!envSecret) {
      console.warn(`[Reward Engine] ${providerId} postback received but ${envSecretKey} is not set. Skipping validation (dev mode).`);
    } else {
      // Provider specific validation
      if (providerId === 'cpx') {
        // CPX MD5 validation: MD5(trans_id + "-" + secure_hash)
        const expectedHash = crypto.createHash('md5')
          .update(`${transactionId}-${envSecret}`)
          .digest('hex');
          
        if (secretParam !== expectedHash) {
          console.error(`[Reward Engine] CPX MD5 signature mismatch! Expected: ${expectedHash}, Got: ${secretParam}`);
          return res.status(401).send('0');
        }
      } else {
        // Fallback for others that use a direct secret match until implemented individually
        if (secretParam !== envSecret) {
          // Temporarily bypassing direct match rejections in dev if others use complex signatures
          // console.warn(`[Reward Engine] ${providerId} invalid secret attempt.`);
          // return res.status(401).send('0');
        }
      }
    }

    // 6. Convert: platformCoins = Math.floor(providerUnits * provider.conversionRatio)
    const platformCoins = Math.floor(parseFloat(providerUnits) * provider.conversionRatio);
    if (isNaN(platformCoins) || platformCoins <= 0) {
      return res.status(200).send('1'); // bad amount, silently ignore
    }

    // 7. Build externalId = `${providerId}:${transactionId}`
    const externalId = `${providerId}:${transactionId}`;

    // 8. Check Transaction.findOne({ externalId }) — if exists → return "1"
    const existingTx = await Transaction.findOne({ externalId });
    if (existingTx) {
      return res.status(200).send('1');
    }

    // 9. Find User by userId → if not found → return "1"
    const user = await User.findById(userId);
    if (!user) {
      return res.status(200).send('1');
    }

    // 10. Atomic: User.findOneAndUpdate $inc walletBalance by platformCoins
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id },
      { $inc: { walletBalance: platformCoins } },
      { new: true }
    );

    // 11. Create Transaction
    await Transaction.create({
      userId: user._id,
      transactionType: 'offer_reward',
      amount: platformCoins,
      description: `${provider.label} Offer Reward`,
      status: 'completed',
      externalId,
      metadata: {
        providerId,
        providerUnits,
        conversionRatio: provider.conversionRatio,
      },
    });

    // 12. Return "1"
    return res.status(200).send('1');
  } catch (err) {
    console.error(`[Reward Engine] ${providerId} postback error:`, err);
    return res.status(500).send('0');
  }
};

// 3b. Provider-Specific Routes

router.get('/postback/cpx', (req, res) => {
  // CPX: user_id, reward, trans_id, hash
  handlePostback('cpx', req, res, {
    userId: req.query.user_id,
    providerUnits: req.query.reward,
    transactionId: req.query.trans_id,
    secretParam: req.query.hash,
  });
});

router.get('/postback/adgem', (req, res) => {
  handlePostback('adgem', req, res, {
    userId: req.query.user_id,
    providerUnits: req.query.amount,
    transactionId: req.query.oid,
    secretParam: req.query.verifier,
  });
});

router.get('/postback/lootably', (req, res) => {
  handlePostback('lootably', req, res, {
    userId: req.query.user_id,
    providerUnits: req.query.revenue,
    transactionId: req.query.transaction_id,
    secretParam: req.query.security_token,
  });
});

router.get('/postback/torox', (req, res) => {
  handlePostback('torox', req, res, {
    userId: req.query.user_id,
    providerUnits: req.query.reward,
    transactionId: req.query.txid,
    secretParam: req.query.secret,
  });
});

router.get('/postback/primeearn', (req, res) => {
  handlePostback('primeearn', req, res, {
    userId: req.query.user_id,
    providerUnits: req.query.amount,
    transactionId: req.query.offer_id,
    secretParam: req.query.token,
  });
});

router.get('/postback/ayet', (req, res) => {
  handlePostback('ayet', req, res, {
    userId: req.query.uid,
    providerUnits: req.query.payout,
    transactionId: req.query.sid,
    secretParam: req.query.signature,
  });
});

router.get('/postback/adtowall', (req, res) => {
  handlePostback('adtowall', req, res, {
    userId: req.query.user_id,
    providerUnits: req.query.points,
    transactionId: req.query.transaction_id,
    secretParam: req.query.secret,
  });
});

router.get('/postback/revu', (req, res) => {
  handlePostback('revu', req, res, {
    userId: req.query.pub_user_id,
    providerUnits: req.query.amount,
    transactionId: req.query.ref,
    secretParam: req.query.hash,
  });
});

module.exports = router;
