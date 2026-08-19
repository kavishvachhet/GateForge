/**
 * Entry point for the Order Service. Initializes HTTP, Kafka, and Database connections.
 */
const app = require('./app');
const { config, connectDB, connectKafka } = require('./config');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const grpcController = require('./controllers/grpc.controller');
const { createLogger } = require('shared-lib');

const logger = createLogger('order-server');

const PROTO_PATH = path.resolve(__dirname, '../../../packages/proto/order.proto');

function startGrpcServer() {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
  const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
  const orderProto = protoDescriptor.order;

  const server = new grpc.Server();
  server.addService(orderProto.OrderService.service, {
    GetOrder: grpcController.getOrder.bind(grpcController),
  });

  const address = `0.0.0.0:${config.grpcPort}`;
  server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) throw err;
    server.start();
    logger.info(` gRPC Server listening on port ${port} (Order Service)`);
  });
}

async function bootstrap() {
  try {
    await connectDB();
    await connectKafka().catch(err => logger.warn('Kafka not available yet, continuing without it...'));
    
    startGrpcServer();
    
    app.listen(config.port, () => {
      logger.info(` HTTP Server listening on port ${config.port} (Order Service)`);
    });
  } catch (error) {
    logger.fatal(' Failed to start Order Service', error);
    process.exit(1);
  }
}

bootstrap();
