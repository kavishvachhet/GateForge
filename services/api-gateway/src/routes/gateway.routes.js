/**
 * Central router for the API Gateway. Proxies incoming requests to the appropriate backend microservice.
 */
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { config } = require('../config');
const { requireAuth } = require('../middlewares/auth.middleware');
const { authLimiter } = require('../middlewares/rate-limiter');

const router = express.Router();

const proxy = (target) => createProxyMiddleware({
  target,
  changeOrigin: true,
  pathRewrite: (path, req) => req.originalUrl,
  onProxyReq: (proxyReq, req) => {
    if (req.headers['x-user-id']) {
      proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
      proxyReq.setHeader('x-user-role', req.headers['x-user-role']);
    }
  },
});

router.use('/auth', /* authLimiter, */ proxy(config.services.auth)); // 10 attempts per 15 min

router.use('/inventory', (req, res, next) => {
  if (req.method === 'GET') return next();
  return requireAuth(req, res, next);
}, proxy(config.services.inventory));

router.use('/users', requireAuth, proxy(config.services.user));
router.use('/orders', requireAuth, proxy(config.services.order));

module.exports = router;
