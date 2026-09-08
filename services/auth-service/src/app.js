/**
 * Express application setup for the Auth Service REST API.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/auth.routes');
const { createLogger, AppError } = require('shared-lib');

const logger = createLogger('auth-app');
const app = express();

app.use(helmet());
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(`[${req.method}] ${req.url}`);
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'auth-service' });
});

app.use('/api/v1/auth', authRoutes);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal Server Error';

  if (!err.isOperational) {
    logger.error(' Unhandled Error:', err);
  } else {
    logger.warn(`Operational Error: ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    data: null,
    meta: {},
    errors: [{ message, statusCode, details: [] }],
  });
});

module.exports = app;
