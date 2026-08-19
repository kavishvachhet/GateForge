/**
 * gRPC handler implementation for high-speed token validation requests from the API Gateway.
 */
const grpc = require('@grpc/grpc-js');
const validateTokenUseCase = require('../../application/use-cases/validate-token.use-case');
const { createLogger } = require('shared-lib');

const logger = createLogger('auth-grpc');

class AuthGrpcHandler {
  async validateToken(call, callback) {
    try {
      const token = call.request.token;

      const decoded = await validateTokenUseCase.execute(token);

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

module.exports = new AuthGrpcHandler();
