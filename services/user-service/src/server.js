const app = require('./app');
const { config, connectDB, connectKafka } = require('./config');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const grpcController = require('./controllers/grpc.controller');
const { createLogger } = require('shared-lib');

const logger = createLogger('user-server');

const PROTO_PATH = path.resolve(__dirname, '../../../packages/proto/user.proto');

function startGrpcServer() {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
  const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
  const userProto = protoDescriptor.user;

  const server = new grpc.Server();
  server.addService(userProto.UserService.service, {
    GetUser: grpcController.getUser.bind(grpcController),
  });

  const address = `0.0.0.0:${config.grpcPort}`;
  server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) throw err;
    server.start();
    logger.info(`✅ gRPC Server listening on port ${port} (User Service)`);
  });
}

async function bootstrap() {
  try {
    await connectDB();
    
    // Catch kafka errors but don't crash if it's not available in dev mode
    await connectKafka().catch(err => logger.warn('Kafka not available yet, continuing without it...'));
    
    startGrpcServer();
    
    app.listen(config.port, () => {
      logger.info(`✅ HTTP Server listening on port ${config.port} (User Service)`);
    });
  } catch (error) {
    logger.fatal('❌ Failed to start User Service', error);
    process.exit(1);
  }
}

bootstrap();
