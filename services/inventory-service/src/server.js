/**
 * Entry point for the Inventory Service. Initializes HTTP, gRPC, Kafka, and Database connections.
 */
const app = require('./app');
const { config, connectDB, connectKafka } = require('./config');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const grpcController = require('./controllers/grpc.controller');
const inventoryService = require('./services/inventory.service');
const { createLogger } = require('shared-lib');
const { startExpiryWorker } = require('./workers/expiry-worker');

const logger = createLogger('inventory-server');

const PROTO_PATH = path.resolve(__dirname, '../../../packages/proto/inventory.proto');

function startGrpcServer() {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
  const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
  const inventoryProto = protoDescriptor.inventory;

  const server = new grpc.Server();
  server.addService(inventoryProto.InventoryService.service, {
    GetProduct: grpcController.getProduct.bind(grpcController),
  });

  const address = `0.0.0.0:${config.grpcPort}`;
  server.bindAsync(address, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) throw err;
    server.start();
    logger.info(` gRPC Server listening on port ${port} (Inventory Service)`);
  });
}

async function bootstrap() {
  try {
    await connectDB();

    await connectKafka(inventoryService).catch(err => logger.warn('Kafka not available yet, continuing without it...'));
    
    startGrpcServer();

    startExpiryWorker();
    
    app.listen(config.port, () => {
      logger.info(` HTTP Server listening on port ${config.port} (Inventory Service)`);
    });
  } catch (error) {
    logger.fatal(' Failed to start Inventory Service', error);
    process.exit(1);
  }
}

bootstrap();
