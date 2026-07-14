const grpc = require('@grpc/grpc-js');
const userService = require('../services/user.service');
const { createLogger } = require('shared-lib');

const logger = createLogger('user-grpc');

class GrpcController {
  
  async getUser(call, callback) {
    try {
      const user = await userService.getUser(call.request.id);
      callback(null, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      });
    } catch (error) {
      logger.error('gRPC getUser failed:', error.message);
      callback({
        code: error.name === 'NotFoundError' ? grpc.status.NOT_FOUND : grpc.status.INTERNAL,
        details: error.message,
      });
    }
  }

  // We could implement GetUsers, UpdateUser, etc here. 
  // For the sake of MVP and speed, we will just implement the most important one.
}

module.exports = new GrpcController();
