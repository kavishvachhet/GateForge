/**
 * Express application setup for the API Gateway, including middleware and global error handling.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const gatewayRoutes = require('./routes/gateway.routes');
const { globalLimiter } = require('./middlewares/rate-limiter');
const { createLogger } = require('shared-lib');

const logger = createLogger('gateway-app');
const app = express();

app.use(helmet());
app.use(cors());

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

module.exports = app;
