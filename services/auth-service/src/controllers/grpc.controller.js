/**
 * gRPC handler for high-speed token validation requests from the API Gateway.
 */
const grpc = require('@grpc/grpc-js');
const authService = require('../services/auth.service');
const { createLogger } = require('shared-lib');

const logger = createLogger('auth-grpc');

class GrpcController {
  async validateToken(call, callback) {
    try {
      const token = call.request.token;

      const decoded = await authService.validateToken(token);

      callback(null, {
        valid: true,
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      });
    } catch (error) {
      logger.error('gRPC validateToken failed:', error.message);

      callback({
        code: grpc.status.UNAUTHENTICATED,
        details: error.message,
      });
    }
  }
}

module.exports = new GrpcController();
