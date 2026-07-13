const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').RedisStore;
const { redisClient } = require('../config');

/**
 * Creates a rate limiter middleware backed by Redis.
 * Because we use Redis, the rate limit is shared across all instances of the API Gateway if scaled.
 */
const createRateLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // Default: 15 minutes
    max: options.max || 100, // Default: 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix: options.prefix || 'rl:', // Allows us to have different limits for different routes
    }),
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        errors: [{ message: 'Too many requests, please try again later.', statusCode: 429 }]
      });
    }
  });
};

// Global rate limiter (generous)
const globalLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  prefix: 'rl:global:'
});

// Strict rate limiter for auth routes
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes
  prefix: 'rl:auth:'
});

module.exports = { globalLimiter, authLimiter };
