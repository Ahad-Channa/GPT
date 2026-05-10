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
    origin: process.env.CLIENT_URL || '*', // Update in production
    methods: ['GET', 'POST']
  }
});

// Pass io to request object if routes need it later
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
// Serve uploaded avatar images statically
app.use('/avatars', express.static(path.join(__dirname, '../frontend/public/avatars')));

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
const chatRoutes = require('./routes/chat');
const supportRoutes = require('./routes/support');

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

// ─── Socket.io Live Chat Setup ──────────────────────────────────────────
const ChatMessage = require('./models/ChatMessage');
const User = require('./models/User');

// Track online socket connections
const onlineSockets = new Set();

const broadcastLiveCount = () => {
  io.emit('liveCount', { count: onlineSockets.size });
};

io.on('connection', (socket) => {
  onlineSockets.add(socket.id);
  broadcastLiveCount();
  console.log('A user connected:', socket.id, '| Online:', onlineSockets.size);

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
          role: user.role
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

server.listen(PORT, () => {
  console.log(`Server runtime initiated on port ${PORT}`);
});
