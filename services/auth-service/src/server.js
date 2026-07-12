const app = require('./app');
const config = require('./config');
const { connectDB, mongoose } = require('./infrastructure/database/mongoose');
const redisClient = require('./infrastructure/cache/redis');
const { connectKafka } = require('./infrastructure/messaging/kafka');
const { startGrpcServer } = require('./infrastructure/grpc/grpc.server');
const { createLogger } = require('shared-lib');

const logger = createLogger('auth-server');

async function bootstrap() {
  try {
    // 1. Connect to Database (MongoDB)
    await connectDB();

    // 2. Connect to Message Broker (Kafka)
    // Note: If Kafka isn't running locally yet, it might throw an error.
    // For local dev without Kafka running yet, you can comment this out temporarily.
    await connectKafka();

    // 3. Start gRPC Server (for internal microservice communication)
    await startGrpcServer();

    // 4. Start HTTP Server (Express)
    const server = app.listen(config.port, () => {
      logger.info(`✅ HTTP Server listening on port ${config.port}`);
    });

    // Graceful Shutdown Handler
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
    logger.fatal('❌ Failed to start Auth Service');
    logger.fatal(error);
    process.exit(1);
  }
}

// Start the service
bootstrap();
