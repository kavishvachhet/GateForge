/**
 * MongoDB connection setup for the Auth Service database.
 */
const mongoose = require('mongoose');
const config = require('../../config');
const { createLogger } = require('shared-lib');

const logger = createLogger('auth-mongo');

async function connectDB() {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info(' MongoDB connected successfully (Auth Service)');
  } catch (error) {
    logger.error(' MongoDB connection failed');
    logger.error(error);
    process.exit(1);
  }
}

module.exports = { connectDB, mongoose };
