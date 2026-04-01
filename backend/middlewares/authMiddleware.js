const admin = require('../config/firebase');
const User = require('../models/User');

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
  }

  try {
    // Determine if Firebase placeholder is used in dev to bypass hard auth lock
    if (process.env.FIREBASE_PROJECT_ID === 'your-project-id') {
      req.user = { uid: 'dev-mock-uid', email: 'dev@mock.local', name: 'Dev Mock' };
      return next();
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Check if user is banned
    const userRecord = await User.findOne({ firebaseUid: decodedToken.uid });
    if (userRecord && userRecord.isBanned) {
      return res.status(403).json({ success: false, error: 'Forbidden: Account has been banned', isBanned: true });
    }

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Firebase Token Verification Error:', error.message);
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
  }
};

module.exports = { verifyToken };
