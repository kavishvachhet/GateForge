/**
 * Entry point for the Notification Service.
 */
const app = require('./app');
const { config, connectKafka } = require('./config');
const { createLogger } = require('shared-lib');

const logger = createLogger('notification-server');

async function bootstrap() {
  try {

    await connectKafka().catch(err => logger.warn('Kafka not available yet, continuing without it...'));

    app.listen(config.port, () => {
      logger.info(` HTTP Server listening on port ${config.port} (Notification Service)`);
    });
  } catch (error) {
    logger.fatal(' Failed to start Notification Service', error);
    process.exit(1);
  }
}

bootstrap();
