/**
 * Express application setup for the User Profile Service REST API.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const userRoutes = require('./routes/user.routes');
const { createLogger, AppError } = require('shared-lib');

const logger = createLogger('user-app');
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`[${req.method}] ${req.url}`);
  next();
});

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'user-service' }));
app.use('/api/v1/users', userRoutes);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal Server Error';

  if (!err.isOperational) logger.error(' Unhandled Error:', err);
  
  res.status(statusCode).json({
    success: false,
    data: null,
    meta: {},
    errors: [{ message, statusCode, details: [] }],
  });
});

module.exports = app;
