const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const config = require('../../config');
const authGrpcHandler = require('./auth.grpc-handler');
const { createLogger } = require('shared-lib');

const logger = createLogger('auth-grpc-server');

// Path to the auth.proto file in our monorepo
const PROTO_PATH = path.resolve(__dirname, '../../../../../packages/proto/auth.proto');

function startGrpcServer() {
  return new Promise((resolve, reject) => {
    // 1. Load the proto file
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    const authProto = protoDescriptor.auth;

    // 2. Create the server
    const server = new grpc.Server();

    // 3. Map the proto service methods to our handler methods
    server.addService(authProto.AuthService.service, {
      ValidateToken: authGrpcHandler.validateToken.bind(authGrpcHandler),
      // We can map Register and Login here later if we want services to call them via gRPC
    });

    // 4. Start the server
    const address = `0.0.0.0:${config.grpcPort}`;
    server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, port) => {
      if (err) {
        logger.error('❌ Failed to bind gRPC server', err);
        return reject(err);
      }
      server.start();
      logger.info(`✅ gRPC Server listening on port ${port}`);
      resolve(server);
    });
  });
}

module.exports = { startGrpcServer };
