/**
 * Express router mapping authentication endpoints to their respective controllers.
 */
const express = require('express');
const httpController = require('../controllers/http.controller');
const { asyncHandler } = require('shared-lib');

const router = express.Router();

router.post('/register', asyncHandler(httpController.register.bind(httpController)));
router.post('/login', asyncHandler(httpController.login.bind(httpController)));
router.post('/refresh', asyncHandler(httpController.refreshToken.bind(httpController)));

module.exports = router;
