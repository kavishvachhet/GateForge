const grpc = require('@grpc/grpc-js');
const validateTokenUseCase = require('../../application/use-cases/validate-token.use-case');
const { createLogger } = require('shared-lib');

const logger = createLogger('auth-grpc');

class AuthGrpcHandler {
  async validateToken(call, callback) {
    try {
      const token = call.request.token;
      
      // Execute the use case
      const decoded = await validateTokenUseCase.execute(token);
      
      // Return success response via gRPC callback
      callback(null, {
        valid: true,
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      });
    } catch (error) {
      logger.error('gRPC validateToken failed:', error.message);
      
      // Return gRPC error
      callback({
        code: grpc.status.UNAUTHENTICATED,
        details: error.message,
      });
    }
  }

  // Define other gRPC handlers like GetUserByToken here if needed
}

module.exports = new AuthGrpcHandler();
