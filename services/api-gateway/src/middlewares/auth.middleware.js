const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { config } = require('../config');
const { UnauthorizedError, createLogger } = require('shared-lib');

const logger = createLogger('gateway-auth-middleware');

// Load proto file
const PROTO_PATH = path.resolve(__dirname, '../../../../packages/proto/auth.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const authProto = grpc.loadPackageDefinition(packageDefinition).auth;

// Create gRPC client to talk to Auth Service
const authClient = new authProto.AuthService(config.grpc.auth, grpc.credentials.createInsecure());

/**
 * Express middleware that calls Auth Service via gRPC to validate the token.
 * This is lightning fast compared to making an HTTP request.
 */
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, errors: [{ message: 'Missing or invalid authorization header', statusCode: 401 }] });
  }

  const token = authHeader.split(' ')[1];

  authClient.ValidateToken({ token }, (err, response) => {
    if (err || !response.valid) {
      logger.warn('Token validation failed via gRPC');
      return res.status(401).json({ success: false, errors: [{ message: err ? err.details : 'Invalid token', statusCode: 401 }] });
    }

    // Attach decoded user info to the request for downstream services
    req.user = {
      id: response.userId,
      email: response.email,
      role: response.role,
    };
    
    // Pass the userId in the headers so the proxied microservices can read it easily
    req.headers['x-user-id'] = response.userId;
    req.headers['x-user-role'] = response.role;

    next();
  });
};

module.exports = { requireAuth };
