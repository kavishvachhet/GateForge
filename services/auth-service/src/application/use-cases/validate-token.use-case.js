/**
 * Business logic for validating JWT signatures and verifying user roles.
 */
const jwtService = require('../../infrastructure/security/jwt.service');
const redisClient = require('../../infrastructure/cache/redis');
const { UnauthorizedError, REDIS_PREFIXES } = require('shared-lib');

class ValidateTokenUseCase {
  async execute(token) {
    if (!token) {
      throw new UnauthorizedError('Token is required');
    }

    const isBlacklisted = await redisClient.get(`${REDIS_PREFIXES.TOKEN_BLACKLIST}${token}`);
    if (isBlacklisted) {
      throw new UnauthorizedError('Token has been revoked');
    }

    const payload = jwtService.verifyAccessToken(token);

    return payload;
  }
}

module.exports = new ValidateTokenUseCase();
