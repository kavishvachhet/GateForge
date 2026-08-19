/**
 * Entry point for the API Gateway service. Initializes the server and starts listening for requests.
 */
const app = require('./app');
const { config } = require('./config');
const { createLogger } = require('shared-lib');

const logger = createLogger('gateway-server');

async function bootstrap() {
  try {
    const server = app.listen(config.port, () => {
      logger.info(` API Gateway listening on port ${config.port}`);
      logger.info(`   Auth Service Proxy: ${config.services.auth}`);
      logger.info(`   User Service Proxy: ${config.services.user}`);
      logger.info(`   Order Service Proxy: ${config.services.order}`);
      logger.info(`   Inventory Service Proxy: ${config.services.inventory}`);
    });

    const shutdown = () => {
      logger.info('Shutting down API Gateway...');
      server.close(() => {
        logger.info('API Gateway closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.fatal(' Failed to start API Gateway', error);
    process.exit(1);
  }
}

bootstrap();
