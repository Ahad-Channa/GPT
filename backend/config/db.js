const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  mongoose.connection.on('connected', () =>
    console.log('[MongoDB] Connected:', mongoose.connection.host)
  );
  mongoose.connection.on('error', (err) =>
    console.error('[MongoDB] Connection error:', err.message)
  );
  mongoose.connection.on('disconnected', () =>
    console.warn('[MongoDB] Disconnected — retrying...')
  );

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // fail fast if Atlas unreachable
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
  } catch (error) {
    console.error('[MongoDB] Failed to connect:', error.message);

    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.error('[MongoDB] DNS resolution failed — check your internet connection.');
    } else if (error.message.includes('Authentication failed')) {
      console.error('[MongoDB] Wrong username/password in MONGODB_URI.');
    } else if (error.message.includes('timed out') || error.name === 'MongoServerSelectionError') {
      console.error('[MongoDB] Atlas unreachable — most likely your IP is NOT whitelisted.');
      console.error('[MongoDB] Fix: Go to Atlas → Network Access → Add IP (or 0.0.0.0/0 for dev).');
    }

    process.exit(1);
  }
};

module.exports = connectDB;
