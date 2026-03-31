const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

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

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);

// Base Route
app.get('/', (req, res) => {
  res.status(200).json({ status: 'success', message: 'GPT Platform Backend API is running' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Port configuration
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server runtime initiated on port ${PORT}`);
});
