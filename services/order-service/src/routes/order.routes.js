const express = require('express');
const httpController = require('../controllers/http.controller');
const { asyncHandler } = require('shared-lib');

const router = express.Router();

router.post('/', asyncHandler(httpController.createOrder.bind(httpController)));
router.get('/', asyncHandler(httpController.listUserOrders.bind(httpController)));
router.get('/:id', asyncHandler(httpController.getOrder.bind(httpController)));
router.patch('/:id/status', asyncHandler(httpController.updateOrderStatus.bind(httpController)));

module.exports = router;
