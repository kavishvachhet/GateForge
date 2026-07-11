const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const gatewayRoutes = require('./routes/gateway.routes');
const { globalLimiter } = require('./middlewares/rate-limiter');
const { createLogger } = require('shared-lib');

const logger = createLogger('gateway-app');
const app = express();

// Security and CORS
// Note: API Gateway usually strips helmet/cors headers if the microservices also add them.
// But it's good practice to have the Gateway be the primary defense.
app.use(helmet());
app.use(cors());

// We DO NOT use express.json() here globally because http-proxy-middleware 
// needs the raw stream to pipe to the microservices. If we parse it here, 
// the proxy will hang.

// Apply global rate limiting (120 requests per minute per IP)
// app.use(globalLimiter);

// Request Logging
app.use((req, res, next) => {
  logger.info(`[GATEWAY] ${req.method} ${req.url}`);
  next();
});

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'api-gateway' }));

// Mount gateway routes
app.use('/api/v1', gatewayRoutes);

// Global Error Handler for Gateway
app.use((err, req, res, next) => {
  logger.error('💥 Gateway Error:', err);
  res.status(500).json({
    success: false,
    errors: [{ message: 'Bad Gateway or Internal Server Error', statusCode: 500 }]
  });
});

module.exports = app;
