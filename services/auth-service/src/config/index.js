/**
 * Environment configuration, MongoDB connection, Redis client, and Kafka producer setup for Auth Service.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { Kafka, logLevel } = require('kafkajs');
const { createLogger } = require('shared-lib');

const logger = createLogger('auth-config');

const config = {
  port: process.env.AUTH_SERVICE_PORT || 3001,
  grpcPort: process.env.AUTH_GRPC_PORT || 50051,
  mongoUri: process.env.MONGO_URI_AUTH || 'mongodb://localhost:27017/auth_db',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '',
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: 'auth-service',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'super_secret_jwt_key_change_me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  }
};

// ==========================================
// MongoDB
// ==========================================
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

// ==========================================
// Redis
// ==========================================
const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,

  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisClient.on('connect', () => {
  logger.info(' Redis connected successfully (Auth Service)');
});

redisClient.on('error', (err) => {
  logger.error(' Redis connection error');
  logger.error(err);
});

// ==========================================
// Kafka Producer
// ==========================================
const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  logLevel: logLevel.WARN,
});

const producer = kafka.producer();

async function connectKafka() {
  try {
    await producer.connect();
    logger.info(' Kafka Producer connected successfully (Auth Service)');
  } catch (error) {
    logger.error(' Kafka connection failed');
    logger.error(error);
  }
}

async function publishEvent(topic, key, data) {
  try {
    await producer.send({
      topic,
      messages: [{ key, value: JSON.stringify(data) }],
    });
    logger.info(`Published event to ${topic}`);
  } catch (error) {
    logger.error(`Failed to publish event to ${topic}`);
    logger.error(error);
  }
}

module.exports = { config, connectDB, connectKafka, publishEvent, redisClient, mongoose };
