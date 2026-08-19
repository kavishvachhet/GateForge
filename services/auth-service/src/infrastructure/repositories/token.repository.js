/**
 * Data access layer for managing refresh tokens in the database.
 */
const RefreshToken = require('../../domain/entities/RefreshToken');

class TokenRepository {
  async save(tokenData) {
    const token = new RefreshToken(tokenData);
    return token.save();
  }

  async findByToken(token) {
    return RefreshToken.findOne({ token, isRevoked: false });
  }

  async revokeByToken(token) {
    return RefreshToken.findOneAndUpdate(
      { token },
      { isRevoked: true },
      { new: true }
    );
  }

  async revokeAllForUser(userId) {
    return RefreshToken.updateMany(
      { userId, isRevoked: false },
      { $set: { isRevoked: true } }
    );
  }
}

module.exports = new TokenRepository();
