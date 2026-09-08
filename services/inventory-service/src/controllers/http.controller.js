/**
 * Express controller handling REST API requests for product catalog and inventory management.
 */
const inventoryService = require('../services/inventory.service');
const { createSuccessResponse, createPaginationMeta, UnauthorizedError } = require('shared-lib');

const { redisClient } = require('../config');

class HttpController {

  async listProducts(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category || '';

    const cacheKey = `cache:inventory:list:${page}:${limit}:${category}`;

    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      console.log(`Cache HIT for ${cacheKey}`);
      res.setHeader('X-Cache', 'HIT');
      return res.json(JSON.parse(cachedData));
    }

    console.log(`Cache MISS for ${cacheKey} `);

    const result = await inventoryService.listProducts(page, limit, category);
    const response = createSuccessResponse(
      result.products,
      createPaginationMeta(result.page, result.limit, result.total)
    );

    await redisClient.setex(cacheKey, 60, JSON.stringify(response));

    res.setHeader('X-Cache', 'MISS');
    res.json(response);
  }

  async getProduct(req, res) {
    const product = await inventoryService.getProduct(req.params.id);
    res.json(createSuccessResponse(product));
  }

  _checkAdmin(req) {
    const role = req.headers['x-user-role'] || '';
    if (role.toLowerCase() !== 'admin') {
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
