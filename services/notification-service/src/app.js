/**
 * Express application setup for the Notification Service.
 */
const express = require('express');
const { createLogger } = require('shared-lib');

const logger = createLogger('notification-app');
const app = express();

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'notification-service' }));

module.exports = app;
