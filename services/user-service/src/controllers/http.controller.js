/**
 * Express controller handling REST API requests for managing user profiles.
 */
const userService = require('../services/user.service');
const { createSuccessResponse, createPaginationMeta, ValidationError } = require('shared-lib');

class HttpController {
  
  async getUser(req, res) {
    const user = await userService.getUser(req.params.id);
    res.json(createSuccessResponse(user));
  }

  async getUsers(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await userService.getUsers(page, limit, req.query.sortBy, req.query.order);
    
    res.json(createSuccessResponse(
      result.users, 
      createPaginationMeta(result.page, result.limit, result.total)
    ));
  }

  async updateUser(req, res) {

    const updateData = {
      name: req.body.name,
      email: req.body.email
    };
    
    const user = await userService.updateUser(req.params.id, updateData);
    res.json(createSuccessResponse(user));
  }

  async deleteUser(req, res) {
    const result = await userService.deleteUser(req.params.id);
    res.json(createSuccessResponse(result));
  }

  async searchUsers(req, res) {
    if (!req.query.q) {
      throw new ValidationError('Search query (q) is required');
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const result = await userService.searchUsers(req.query.q, page, limit);
    
    res.json(createSuccessResponse(
      result.users, 
      createPaginationMeta(result.page, result.limit, result.total)
    ));
  }
}

module.exports = new HttpController();
