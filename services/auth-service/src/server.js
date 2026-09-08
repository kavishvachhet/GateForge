/**
 * Entry point for the Auth Service. Initializes HTTP, gRPC, Kafka, and MongoDB connections.
 */
const app = require('./app');
const { config, connectDB, connectKafka, mongoose, redisClient } = require('./config');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const grpcController = require('./controllers/grpc.controller');
const { createLogger } = require('shared-lib');

const logger = createLogger('auth-server');

const PROTO_PATH = path.resolve(__dirname, '../../../packages/proto/auth.proto');

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
      ValidateToken: grpcController.validateToken.bind(grpcController),
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

async function bootstrap() {
  try {
    await connectDB();

    await connectKafka();

    await startGrpcServer();

    const server = app.listen(config.port, () => {
      logger.info(` HTTP Server listening on port ${config.port}`);
    });

    const shutdown = async () => {
      logger.info('Shutting down gracefully...');

      server.close(() => logger.info('HTTP server closed'));
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      await redisClient.quit();
      logger.info('Redis connection closed');

      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.fatal(' Failed to start Auth Service');
    logger.fatal(error);
    process.exit(1);
  }
}

bootstrap();
