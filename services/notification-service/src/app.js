const express = require('express');
const { createLogger } = require('shared-lib');

const logger = createLogger('notification-app');
const app = express();

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'notification-service' }));

// We don't really need routes for this service since it's event-driven,
// but it's good to have a basic express server for health checks in Kubernetes/Docker.

module.exports = app;
