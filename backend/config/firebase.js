const admin = require('firebase-admin');
const dotenv = require('dotenv');

dotenv.config();

// Ensure private key handles literal \n correctly when parsed from .env
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_PROJECT_ID !== 'your-project-id') {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      console.log('Firebase Admin SDK Initialized Successfully.');
    } else {
      console.warn('Firebase Admin SDK skipped -> Placeholder credentials detected in .env');
    }
  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error.stack);
  }
}

module.exports = admin;
