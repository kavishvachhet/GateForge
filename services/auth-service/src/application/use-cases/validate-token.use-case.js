const jwtService = require('../../infrastructure/security/jwt.service');
const redisClient = require('../../infrastructure/cache/redis');
const { UnauthorizedError, REDIS_PREFIXES } = require('shared-lib');

class ValidateTokenUseCase {
  async execute(token) {
    if (!token) {
      throw new UnauthorizedError('Token is required');
    }

    // 1. Check if token is blacklisted in Redis (from logout/revoke)
    const isBlacklisted = await redisClient.get(`${REDIS_PREFIXES.TOKEN_BLACKLIST}${token}`);
    if (isBlacklisted) {
      throw new UnauthorizedError('Token has been revoked');
    }

    // 2. Verify signature and expiration
    const payload = jwtService.verifyAccessToken(token);

    // 3. Return the decoded payload (userId, email, role)
    return payload;
  }
}

module.exports = new ValidateTokenUseCase();
