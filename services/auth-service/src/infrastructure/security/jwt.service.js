const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config');
const { UnauthorizedError } = require('shared-lib');

class JwtService {
  generateAccessToken(payload) {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });
  }

  generateRefreshToken() {
    return uuidv4();
  }

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  decodeToken(token) {
    return jwt.decode(token);
  }
}

module.exports = new JwtService();
