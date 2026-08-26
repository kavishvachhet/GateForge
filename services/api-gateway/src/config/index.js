/**
 * Configuration settings and Redis client initialization for the API Gateway.
 */
require('dotenv').config();
const Redis = require('ioredis');
const { createLogger } = require('shared-lib');

const logger = createLogger('gateway-config');

const config = {
  port: process.env.API_GATEWAY_PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    user: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    order: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
    inventory: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3004',
  },

  grpc: {
    auth: process.env.AUTH_GRPC_URL || 'localhost:50051',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '',
  }
};

const redisClient = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
});

redisClient.on('connect', () => logger.info(' Redis connected successfully (API Gateway)'));
redisClient.on('error', (err) => logger.error(' Redis connection error', err));

module.exports = { config, redisClient };
