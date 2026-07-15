const express = require('express');
const httpController = require('../controllers/http.controller');
const { asyncHandler } = require('shared-lib');

const router = express.Router();

router.get('/', asyncHandler(httpController.listProducts.bind(httpController)));
router.get('/:id', asyncHandler(httpController.getProduct.bind(httpController)));

// Admin routes
router.post('/', asyncHandler(httpController.createProduct.bind(httpController)));
router.put('/:id', asyncHandler(httpController.updateProduct.bind(httpController)));
router.delete('/:id', asyncHandler(httpController.deleteProduct.bind(httpController)));

module.exports = router;
