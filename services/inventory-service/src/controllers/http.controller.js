const inventoryService = require('../services/inventory.service');
const { createSuccessResponse, createPaginationMeta, UnauthorizedError } = require('shared-lib');

const { redisClient } = require('../config');

class HttpController {

  async listProducts(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category || '';

    // Create a unique cache key based on query params
    const cacheKey = `cache:inventory:list:${page}:${limit}:${category}`;

    // 1. Check Redis Cache
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`Cache HIT for ${cacheKey}`);
      res.setHeader('X-Cache', 'HIT');
      return res.json(JSON.parse(cachedData));
    }

    console.log(`Cache MISS for ${cacheKey} `);
    // 2. Cache MISS: Fetch from MongoDB
    const result = await inventoryService.listProducts(page, limit, category);
    const response = createSuccessResponse(
      result.products,
      createPaginationMeta(result.page, result.limit, result.total)
    );

    // 3. Save to Redis for 60 seconds
    await redisClient.setex(cacheKey, 60, JSON.stringify(response));

    res.setHeader('X-Cache', 'MISS');
    res.json(response);
  }

  async getProduct(req, res) {
    const product = await inventoryService.getProduct(req.params.id);
    res.json(createSuccessResponse(product));
  }

  // --- Admin Routes below ---
  _checkAdmin(req) {
    if (req.headers['x-user-role'] !== 'admin') {
      throw new UnauthorizedError('Admin access required');
    }
  }

  async createProduct(req, res) {
    this._checkAdmin(req);
    const product = await inventoryService.createProduct(req.body);
    res.status(201).json(createSuccessResponse(product));
  }

  async updateProduct(req, res) {
    this._checkAdmin(req);
    const product = await inventoryService.updateProduct(req.params.id, req.body);
    res.json(createSuccessResponse(product));
  }

  async deleteProduct(req, res) {
    this._checkAdmin(req);
    const result = await inventoryService.deleteProduct(req.params.id);
    res.json(createSuccessResponse(result));
  }
}

module.exports = new HttpController();
