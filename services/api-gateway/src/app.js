/**
 * Express application setup for the API Gateway, including middleware and global error handling.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const gatewayRoutes = require('./routes/gateway.routes');
const { globalLimiter } = require('./middlewares/rate-limiter');
const { createLogger } = require('shared-lib');
const HealthChecker = require('./middlewares/health');


const logger = createLogger('gateway-app');
const app = express();

app.use(helmet());
app.use(cors());
app.use(globalLimiter);

app.use((req, res, next) => {
  logger.info(`[GATEWAY] ${req.method} ${req.url}`);
  next();
});

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'api-gateway' }));

app.use('/api/v1', gatewayRoutes);

app.use((err, req, res, next) => {
  logger.error(' Gateway Error:', err);
  res.status(500).json({
    success: false,
    errors: [{ message: 'Bad Gateway or Internal Server Error', statusCode: 500 }]
  });
});


// const orderHealthCheck = new HealthChecker(
//   [{ host: 'localhost', port: 3003 }, { host: 'localhost', port: 9999 }], 5000
// );

// orderHealthCheck.start();

module.exports = app;
