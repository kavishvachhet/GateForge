const tokenRepository = require('../../infrastructure/repositories/token.repository');
const userRepository = require('../../infrastructure/repositories/user.repository');
const jwtService = require('../../infrastructure/security/jwt.service');
const config = require('../../config');
const { UnauthorizedError } = require('shared-lib');

class RefreshTokenUseCase {
  async execute(oldRefreshToken) {
    // 1. Find token in DB
    const tokenRecord = await tokenRepository.findByToken(oldRefreshToken);
    if (!tokenRecord) {
      throw UnauthorizedError('Invalid or expired refresh token');
    }

    // 2. Check if expired
    if (new Date() > tokenRecord.expiresAt) {
      await tokenRepository.revokeByToken(oldRefreshToken); // cleanup
      throw UnauthorizedError('Refresh token expired');
    }

    // 3. Find user
    const user = await userRepository.findById(tokenRecord.userId);
    if (!user || !user.isActive) {
      throw UnauthorizedError('User not found or inactive');
    }

    // 4. Revoke old token (token rotation for security)
    await tokenRepository.revokeByToken(oldRefreshToken);

    // 5. Generate new tokens
    const payload = { userId: user.id, role: user.role, email: user.email };
    const newAccessToken = jwtService.generateAccessToken(payload);
    const newRefreshToken = jwtService.generateRefreshToken();

    const days = parseInt(config.jwt.refreshExpiry.replace('d', ''), 10) || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    // 6. Save new refresh token
    await tokenRepository.save({
      token: newRefreshToken,
      userId: user.id,
      expiresAt,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
}

module.exports = new RefreshTokenUseCase();
