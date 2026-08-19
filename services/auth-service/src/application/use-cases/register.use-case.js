/**
 * Business logic for registering new users, hashing passwords, and publishing Kafka events.
 */
const userRepository = require('../../infrastructure/repositories/user.repository');
const passwordService = require('../../infrastructure/security/password.service');
const { publishEvent } = require('../../infrastructure/messaging/kafka');
const { ConflictError, KAFKA_TOPICS } = require('shared-lib');

class RegisterUseCase {
  async execute(userData) {

    const existingUser = await userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new ConflictError('Email already in use');
    }

    const passwordHash = await passwordService.hash(userData.password);

    const newUser = await userRepository.create({
      name: userData.name,
      email: userData.email,
      passwordHash,
      role: userData.role || 'user', // Allow passing admin role for testing
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
}

module.exports = new RegisterUseCase();
