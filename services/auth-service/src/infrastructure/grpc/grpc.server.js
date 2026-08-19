/**
 * Initializes the gRPC server to handle inter-service authentication requests.
 */
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const config = require('../../config');
const authGrpcHandler = require('./auth.grpc-handler');
const { createLogger } = require('shared-lib');

const logger = createLogger('auth-grpc-server');

const PROTO_PATH = path.resolve(__dirname, '../../../../../packages/proto/auth.proto');

function startGrpcServer() {
  return new Promise((resolve, reject) => {

    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
    const authProto = protoDescriptor.auth;

    const server = new grpc.Server();

    server.addService(authProto.AuthService.service, {
      ValidateToken: authGrpcHandler.validateToken.bind(authGrpcHandler),

    });

    const address = `0.0.0.0:${config.grpcPort}`;
    server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, port) => {
      if (err) {
        logger.error(' Failed to bind gRPC server', err);
        return reject(err);
      }
      server.start();
      logger.info(` gRPC Server listening on port ${port}`);
      resolve(server);
    });
  });
}

module.exports = { startGrpcServer };
