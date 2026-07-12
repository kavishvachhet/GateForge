const userRepository = require('../../infrastructure/repositories/user.repository');
const tokenRepository = require('../../infrastructure/repositories/token.repository');
const passwordService = require('../../infrastructure/security/password.service');
const jwtService = require('../../infrastructure/security/jwt.service');
const config = require('../../config');
const { UnauthorizedError } = require('shared-lib');

class LoginUseCase {
  async execute(email, password) {
    // 1. Find user
    const user = await userRepository.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 2. Verify password
    const isPasswordValid = await passwordService.verify(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 3. Generate tokens
    const payload = { userId: user.id, role: user.role, email: user.email };
    const accessToken = jwtService.generateAccessToken(payload);
    const refreshToken = jwtService.generateRefreshToken();

    // 4. Calculate expiration date for refresh token based on config (e.g., '7d')
    const days = parseInt(config.jwt.refreshExpiresIn.replace('d', ''), 10) || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    // 5. Save refresh token to DB
    await tokenRepository.save({
      token: refreshToken,
      userId: user.id,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}

module.exports = new LoginUseCase();
