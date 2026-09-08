/**
 * Core business logic for authentication — register, login, refresh tokens, and validate tokens.
 */
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { config, redisClient, publishEvent } = require('../config');
const { UnauthorizedError, ConflictError, KAFKA_TOPICS, REDIS_PREFIXES, createLogger } = require('shared-lib');

const logger = createLogger('auth-service');

class AuthService {

  // ==========================================
  // REGISTER
  // ==========================================
  async register(userData) {
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new ConflictError('Email already in use');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(userData.password, saltRounds);

    const newUser = await User.create({
      name: userData.name,
      email: userData.email,
      passwordHash,
      role: userData.role || 'user',
    });

    await publishEvent(KAFKA_TOPICS.USER_REGISTERED, newUser.id.toString(), {
      userId: newUser.id,
      name: newUser.name,
      email: newUser.email,
    });

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    };
  }

  // ==========================================
  // LOGIN
  // ==========================================
  async login(email, password) {
    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const payload = { userId: user.id, role: user.role, email: user.email };
    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
    const refreshToken = uuidv4();

    const days = parseInt(config.jwt.refreshExpiresIn.replace('d', ''), 10) || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    await RefreshToken.create({
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

  // ==========================================
  // REFRESH TOKEN
  // ==========================================
  async refreshToken(oldRefreshToken) {
    const tokenRecord = await RefreshToken.findOne({ token: oldRefreshToken, isRevoked: false });
    if (!tokenRecord) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    if (new Date() > tokenRecord.expiresAt) {
      await RefreshToken.findOneAndUpdate({ token: oldRefreshToken }, { isRevoked: true }, { new: true });
      throw new UnauthorizedError('Refresh token expired');
    }

    const user = await User.findById(tokenRecord.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User not found or inactive');
    }

    // Revoke old token
    await RefreshToken.findOneAndUpdate({ token: oldRefreshToken }, { isRevoked: true }, { new: true });

    // Issue new tokens
    const payload = { userId: user.id, role: user.role, email: user.email };
    const newAccessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
    const newRefreshToken = uuidv4();

    const days = parseInt(config.jwt.refreshExpiresIn.replace('d', ''), 10) || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    await RefreshToken.create({
      token: newRefreshToken,
      userId: user.id,
      expiresAt,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  // ==========================================
  // VALIDATE TOKEN (used by gRPC)
  // ==========================================
  async validateToken(token) {
    if (!token) {
      throw new UnauthorizedError('Token is required');
    }

    const isBlacklisted = await redisClient.get(`${REDIS_PREFIXES.TOKEN_BLACKLIST}${token}`);
    if (isBlacklisted) {
      throw new UnauthorizedError('Token has been revoked');
    }

    try {
      const payload = jwt.verify(token, config.jwt.secret);
      return payload;
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }
}

module.exports = new AuthService();
