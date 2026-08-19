/**
 * Express controller handling REST API requests for creating and retrieving orders.
 */
const orderService = require('../services/order.service');
const { createSuccessResponse, createPaginationMeta } = require('shared-lib');

class HttpController {
  
  async createOrder(req, res) {

    const userId = req.headers['x-user-id'] || req.body.userId;
    const items = req.body.items;
    
    const order = await orderService.createOrder(userId, items);
    res.status(201).json(createSuccessResponse(order));
  }

  async getOrder(req, res) {
    const order = await orderService.getOrder(req.params.id);
    res.json(createSuccessResponse(order));
  }

  async listUserOrders(req, res) {
    const userId = req.headers['x-user-id'] || req.query.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await orderService.listUserOrders(userId, page, limit);
    
    res.json(createSuccessResponse(
      result.orders, 
      createPaginationMeta(result.page, result.limit, result.total)
    ));
  }

  async updateOrderStatus(req, res) {
    const order = await orderService.updateOrderStatus(req.params.id, req.body.status);
    res.json(createSuccessResponse(order));
  }
}

module.exports = new HttpController();
