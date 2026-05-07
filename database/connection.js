const mongoose = require('mongoose');

module.exports = async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[Vigil] Connected to MongoDB');
  } catch (err) {
    console.error('[Vigil] MongoDB connection error:', err);
    process.exit(1);
  }
};
