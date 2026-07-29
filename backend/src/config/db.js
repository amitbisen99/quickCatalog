const mongoose = require('mongoose');

/**
 * Connects to MongoDB once at boot. Fails fast (exits the process) if the
 * initial connection can't be established, per docs/ARCHITECTURE.md — a
 * server that "starts" without a database is worse than one that refuses to.
 */
async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = connectDB;
