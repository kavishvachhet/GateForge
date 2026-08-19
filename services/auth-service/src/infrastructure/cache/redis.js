/**
 * Redis client initialization for caching and token blacklisting.
 */
const Redis = require('ioredis');
const config = require('../../config');
const { createLogger } = require('shared-lib');

const logger = createLogger('auth-redis');

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

module.exports = redisClient;
