const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const inventoryRoutes = require('./routes/inventory.routes');
const { createLogger } = require('shared-lib');

const logger = createLogger('inventory-app');
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`[${req.method}] ${req.url}`);
  next();
});

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'inventory-service' }));
app.use('/api/v1/inventory', inventoryRoutes);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal Server Error';

  if (!err.isOperational) logger.error('Unhandled Error:', err);
  
  res.status(statusCode).json({
    success: false,
    data: null,
    meta: {},
    errors: [{ message, statusCode, details: [] }],
  });
});

module.exports = app;
