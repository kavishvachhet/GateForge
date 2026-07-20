const app = require('./app');
const { config, connectKafka } = require('./config');
const { createLogger } = require('shared-lib');

const logger = createLogger('notification-server');

async function bootstrap() {
  try {
    // Start Kafka Consumer
    await connectKafka().catch(err => logger.warn('Kafka not available yet, continuing without it...'));
    
    // Start HTTP Server (just for health checks)
    app.listen(config.port, () => {
      logger.info(`✅ HTTP Server listening on port ${config.port} (Notification Service)`);
    });
  } catch (error) {
    logger.fatal('❌ Failed to start Notification Service', error);
    process.exit(1);
  }
}

bootstrap();
