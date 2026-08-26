
const { redisClient } = require('../config');
const { createLogger } = require('shared-lib');

const logger = createLogger('rate-limiter');


const LUA_SCRIPT = `
  local prev = tonumber(redis.call('GET', KEYS[1]) or '0') or 0
  local curr = tonumber(redis.call('GET', KEYS[2]) or '0') or 0
  local limit = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local elapsed = tonumber(ARGV[3])

  local weight = math.max(0, 1 - (elapsed / window))
  local total = (prev * weight) + curr

  if total >= limit then
    return {0, math.ceil(window - elapsed)}
  end

  redis.call('INCR', KEYS[2])
  redis.call('EXPIRE', KEYS[2], window * 2)

  return {1, 0}
`;

function createRateLimiter({ windowMs, max, prefix, keyType = 'ip', message }) {
  const windowSec = windowMs / 1000;

  return async (req, res, next) => {
    try {
      const id = keyType === 'user' ? (req.headers['x-user-id'] || req.ip) : req.ip;
      const now = Date.now();
      const windowStart = Math.floor(now / windowMs) * windowMs;
      const elapsed = (now - windowStart) / 1000;

      const prevKey = `${prefix}${id}:${windowStart - windowMs}`;
      const currKey = `${prefix}${id}:${windowStart}`;

      const [allowed, retryAfter] = await redisClient.eval(
        LUA_SCRIPT, 2, prevKey, currKey, max, windowSec, elapsed
      );

      if (!allowed) {
        logger.warn(`Rate limit hit | ${prefix} | ${id}`);
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({
          success: false,
          errors: [{ message: message || 'Too many requests.', statusCode: 429 }],
        });
      }

      next();
    } catch (err) {
      logger.error('Rate limiter error:', err.message);
      next();
    }
  };
}

const globalLimiter = createRateLimiter({
  windowMs: 60 * 1000, max: 120,
  prefix: 'rl:global:', keyType: 'ip',
});

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, max: 10,
  prefix: 'rl:auth:', keyType: 'ip',
  message: 'Too many login attempts. Try again later.',
});

const orderLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, max: 30,
  prefix: 'rl:orders:', keyType: 'user',
  message: 'Order limit exceeded. Max 30 orders per hour.',
});

module.exports = { createRateLimiter, globalLimiter, authLimiter, orderLimiter };
