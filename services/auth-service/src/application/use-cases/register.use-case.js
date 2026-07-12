const userRepository = require('../../infrastructure/repositories/user.repository');
const passwordService = require('../../infrastructure/security/password.service');
const { publishEvent } = require('../../infrastructure/messaging/kafka');
const { ConflictError, KAFKA_TOPICS } = require('shared-lib');

class RegisterUseCase {
  async execute(userData) {
    // 1. Check if user already exists
    const existingUser = await userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new ConflictError('Email already in use');
    }

    // 2. Hash password
    const passwordHash = await passwordService.hash(userData.password);

    // 3. Save user to database
    const newUser = await userRepository.create({
      name: userData.name,
      email: userData.email,
      passwordHash,
      role: userData.role || 'user', // Allow passing admin role for testing
    });

    // 4. Publish event to Kafka
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
