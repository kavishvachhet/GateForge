const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { config } = require('../config');
const { requireAuth } = require('../middlewares/auth.middleware');
const { authLimiter, orderLimiter } = require('../middlewares/rate-limiter');
const HealthChecker = require('../middlewares/health');

const router = express.Router();

const getTarget = (urlStr) => {
  const url = new URL(urlStr);
  return { host: url.hostname, port: parseInt(url.port || '80', 10) };
};

const authHC = new HealthChecker([getTarget(config.services.auth)], 5000);
const inventoryHC = new HealthChecker([getTarget(config.services.inventory)], 5000);
const userHC = new HealthChecker([getTarget(config.services.user)], 5000);
const orderHC = new HealthChecker([getTarget(config.services.order)], 5000);

authHC.start();
inventoryHC.start();
userHC.start();
orderHC.start();

const loadBalancedProxy = (healthChecker) => {
  let currentIndex = 0;

  return createProxyMiddleware({
    target: 'http://placeholder',
    router: (req) => {
      const healthyNodes = healthChecker.getHealthyNodes();

      if (healthyNodes.length === 0) {
        throw new Error('503 Service Unavailable: No healthy backend nodes');
      }

      const selectedNode = healthyNodes[currentIndex % healthyNodes.length];
      currentIndex = (currentIndex + 1) % healthyNodes.length;

      return `http://${selectedNode.host}:${selectedNode.port}`;
    },
    changeOrigin: true,
    pathRewrite: (path, req) => req.originalUrl,
    onProxyReq: (proxyReq, req) => {
      if (req.headers['x-user-id']) {
        proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
        proxyReq.setHeader('x-user-role', req.headers['x-user-role']);
      }
    },
  });
}
router.use('/auth', authLimiter, loadBalancedProxy(authHC));

router.use('/inventory', (req, res, next) => {
  if (req.method === 'GET') return next();
  return requireAuth(req, res, next);
}, loadBalancedProxy(inventoryHC));

router.use('/users', requireAuth, loadBalancedProxy(userHC));

router.use('/orders', requireAuth, (req, res, next) => {
  if (req.method === 'POST') return orderLimiter(req, res, next);
  return next();
}, loadBalancedProxy(orderHC));

module.exports = router;
