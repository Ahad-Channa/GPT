const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('[MongoDB] Connected:', conn.connection.host);
  } catch (error) {
    console.error('[MongoDB] Connection warning (retrying in background):', error.message);
    // Don't kill process immediately so server can still serve or reconnect
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;

