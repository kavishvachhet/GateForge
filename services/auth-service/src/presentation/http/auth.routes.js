const express = require('express');
const authController = require('./auth.controller');
const { asyncHandler } = require('shared-lib');

const router = express.Router();

router.post('/register', asyncHandler(authController.register.bind(authController)));
router.post('/login', asyncHandler(authController.login.bind(authController)));
router.post('/refresh', asyncHandler(authController.refreshToken.bind(authController)));

module.exports = router;
