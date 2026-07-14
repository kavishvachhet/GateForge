const express = require('express');
const httpController = require('../controllers/http.controller');
const { asyncHandler } = require('shared-lib');

const router = express.Router();

router.get('/search', asyncHandler(httpController.searchUsers.bind(httpController)));
router.get('/', asyncHandler(httpController.getUsers.bind(httpController)));
router.get('/:id', asyncHandler(httpController.getUser.bind(httpController)));
router.put('/:id', asyncHandler(httpController.updateUser.bind(httpController)));
router.delete('/:id', asyncHandler(httpController.deleteUser.bind(httpController)));

module.exports = router;
