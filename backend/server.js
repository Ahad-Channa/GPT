const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');

// Load environment variables
dotenv.config();

// Database and Firebase setups
const connectDB = require('./config/db');
require('./config/firebase'); // Initializes Firebase App

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
// Only connect if we have a real URI, avoiding crash for empty placeholders
if (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes('<username>')) {
  connectDB();
} else {
  console.warn('MongoDB connection skipped -> Placeholder URI detected in .env');
}

// Application routes configurations
const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const adminRoutes = require('./routes/admin');
const offerwallRoutes = require('./routes/offerwalls');
const customOffersRoutes = require('./routes/customOffers');
const activityRoutes = require('./routes/activity');
const { router: leaderboardRoutes, resetLeaderboard } = require('./routes/leaderboard');
const publicRoutes = require('./routes/public');
const notificationsRoutes = require('./routes/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/offerwalls', offerwallRoutes);
app.use('/api/custom-offers', customOffersRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/notifications', notificationsRoutes);

// Base Route
app.get('/', (req, res) => {
  res.status(200).json({ status: 'success', message: 'GPT Platform Backend API is running' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// ─── Cron Jobs: Auto-reset leaderboards & Scheduled tasks ─────────────────────
// All times are UTC

require('./utils/streakWarningJob');
require('./utils/referralHoldJob');

// Daily: every day at midnight UTC
cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] Running daily leaderboard reset...');
  try {
    const result = await resetLeaderboard('daily');
    console.log('[CRON] Daily reset result:', result);
  } catch (err) {
    console.error('[CRON] Daily reset failed:', err);
  }
}, { timezone: 'UTC' });

// Weekly: every Monday at midnight UTC
cron.schedule('0 0 * * 1', async () => {
  console.log('[CRON] Running weekly leaderboard reset...');
  try {
    const result = await resetLeaderboard('weekly');
    console.log('[CRON] Weekly reset result:', result);
  } catch (err) {
    console.error('[CRON] Weekly reset failed:', err);
  }
}, { timezone: 'UTC' });

// Monthly: 1st of every month at midnight UTC
cron.schedule('0 0 1 * *', async () => {
  console.log('[CRON] Running monthly leaderboard reset...');
  try {
    const result = await resetLeaderboard('monthly');
    console.log('[CRON] Monthly reset result:', result);
  } catch (err) {
    console.error('[CRON] Monthly reset failed:', err);
  }
}, { timezone: 'UTC' });

// Port configuration
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server runtime initiated on port ${PORT}`);
});
