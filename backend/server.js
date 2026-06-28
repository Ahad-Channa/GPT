const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config();

// Database and Firebase setups
const connectDB = require('./config/db');
require('./config/firebase'); // Initializes Firebase App

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Expose io globally so cron-called utility functions (e.g. leaderboard rewards) can broadcast events
global.__io = io;

// Pass io to request object if routes need it later
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middleware — explicit CORS so Vercel frontend is always allowed
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

// Explicitly allow Private Network Access (so Vercel deployed frontend can reach localhost backend)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Private-Network', 'true');
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-side)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o))) return callback(null, true);
    // Also allow any *.vercel.app subdomain in case preview URLs are used
    if (/\.vercel\.app$/.test(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-two-factor-token'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
// Serve uploaded avatar images statically
app.use('/avatars', express.static(path.join(__dirname, '../frontend/public/avatars')));
// Serve uploaded book images statically
app.use('/books', express.static(path.join(__dirname, '../frontend/public/books')));

// Connect to MongoDB — server only starts after a successful connection
if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('<username>')) {
  console.error('[Startup] MONGODB_URI is missing or still a placeholder. Server will not start.');
  process.exit(1);
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
const chatRoutes = require('./routes/chat');
const supportRoutes = require('./routes/support');
const vipRoutes = require('./routes/vip');
const missionRoutes = require('./routes/missions');
const booksRoutes = require('./routes/books');

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/offerwalls', offerwallRoutes);
app.use('/api/custom-offers', customOffersRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/vip', vipRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/books', booksRoutes);

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
require('./utils/earningHoldJob');

// Seed mission templates (idempotent)
const { seedMissionTemplates, notifyNewMissions, sendMissionReminders } = require('./utils/missionUtils');

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

// ─── Mission Reset Crons ─────────────────────────────────────────────────────
// Missions automatically expire at period boundaries — UserMission documents
// from old periods simply remain in DB (no claims possible, periodKey mismatch).
// We just log the rollover so it's visible in server logs.

// Reminders: 2 hours before reset (22:00 UTC)
cron.schedule('0 22 * * *', async () => {
  console.log('[CRON] Running daily mission reminders...');
  await sendMissionReminders('daily');
  
  const today = new Date();
  // Weekly reminder: if today is Sunday (day 0)
  if (today.getUTCDay() === 0) {
    console.log('[CRON] Running weekly mission reminders...');
    await sendMissionReminders('weekly');
  }
  
  // Monthly reminder: if tomorrow is the 1st
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(today.getUTCDate() + 1);
  if (tomorrow.getUTCDate() === 1) {
    console.log('[CRON] Running monthly mission reminders...');
    await sendMissionReminders('monthly');
  }
}, { timezone: 'UTC' });

// Rollovers at midnight UTC
cron.schedule('0 0 * * *', async () => {
  console.log('[CRON] Daily mission period rolled over — new periodKey active.');
  await notifyNewMissions('daily');
}, { timezone: 'UTC' });

cron.schedule('0 0 * * 1', async () => {
  console.log('[CRON] Weekly mission period rolled over — new periodKey active.');
  await notifyNewMissions('weekly');
}, { timezone: 'UTC' });

cron.schedule('0 0 1 * *', async () => {
  console.log('[CRON] Monthly mission period rolled over — new periodKey active.');
  await notifyNewMissions('monthly');
}, { timezone: 'UTC' });

// ─── Socket.io Live Chat Setup ──────────────────────────────────────────
const ChatMessage = require('./models/ChatMessage');
const User = require('./models/User');
const { registerSocket } = require('./utils/walletEvents');

// Track online socket connections
const onlineSockets = new Set();

const broadcastLiveCount = () => {
  io.emit('liveCount', { count: onlineSockets.size });
};

io.on('connection', (socket) => {
  onlineSockets.add(socket.id);
  broadcastLiveCount();
  console.log('A user connected:', socket.id, '| Online:', onlineSockets.size);

  // ── Identity registration (wallet push) ─────────────────────────────────
  // Client emits this immediately after connecting so we can target them by UID
  socket.on('identify', ({ firebaseUid }) => {
    if (firebaseUid) registerSocket(firebaseUid, socket);
  });

  // ── Global live chat ────────────────────────────────────────
  socket.on('sendMessage', async (data) => {
    try {
      if (!data.userId || !data.message) return;
      const user = await User.findById(data.userId);
      if (!user) return;
      const newMsg = new ChatMessage({
        userId: user._id,
        message: data.message.trim().slice(0, 500)
      });
      await newMsg.save();
      io.emit('newMessage', {
        _id: newMsg._id,
        message: newMsg.message,
        createdAt: newMsg.createdAt,
        user: {
          _id: user._id,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          totalEarned: user.totalEarned
        }
      });
    } catch (err) {
      console.error('Socket send message error:', err);
    }
  });

  // ── Support ticket rooms ─────────────────────────────────────
  // Client emits this to subscribe to a specific ticket's real-time feed
  socket.on('joinSupportRoom', ({ ticketId }) => {
    if (ticketId) {
      socket.join(`support:${ticketId}`);
    }
  });

  socket.on('leaveSupportRoom', ({ ticketId }) => {
    if (ticketId) {
      socket.leave(`support:${ticketId}`);
    }
  });

  // Admin joins a room to watch all ticket updates
  socket.on('joinAdminSupport', () => {
    socket.join('adminSupport');
  });

  socket.on('disconnect', () => {
    onlineSockets.delete(socket.id);
    broadcastLiveCount();
    console.log('User disconnected:', socket.id, '| Online:', onlineSockets.size);
  });
});

// Port configuration
const PORT = process.env.PORT || 5000;

// Start server AFTER MongoDB connects to prevent buffering timeouts
connectDB()
  .then(async () => {
    // Seed mission templates on startup (idempotent upsert)
    await seedMissionTemplates();

    // MIGRATION: populate commissionGenerated for existing referral rewards
    try {
      const User = require('./models/User');
      const Transaction = require('./models/Transaction');
      // Only run if we haven't migrated yet
      const alreadyMigrated = await User.findOne({ commissionGenerated: { $gt: 0 } });
      if (!alreadyMigrated) {
        console.log('[MIGRATION] Starting commissionGenerated migration...');
        const txs = await Transaction.find({ transactionType: 'referral_reward', status: { $ne: 'reversed' } });
        let count = 0;
        for (let tx of txs) {
          if (!tx.sourceId) continue;
          const sourceTx = await Transaction.findById(tx.sourceId);
          if (!sourceTx) continue;
          await User.findByIdAndUpdate(sourceTx.userId, { $inc: { commissionGenerated: tx.amount } });
          count++;
        }
        console.log(`[MIGRATION] Updated ${count} commissions.`);
      }
    } catch (e) {
      console.error('[MIGRATION] Error:', e);
    }
    server.listen(PORT, () => {
      console.log(`Server runtime initiated on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[Startup] Could not connect to MongoDB, aborting.', err.message);
    process.exit(1);
  });
