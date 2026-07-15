const grpc = require('@grpc/grpc-js');
const inventoryService = require('../services/inventory.service');
const { createLogger } = require('shared-lib');

const logger = createLogger('inventory-grpc');

class GrpcController {
  
  async getProduct(call, callback) {
    try {
      const product = await inventoryService.getProduct(call.request.productId);
      callback(null, {
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        category: product.category,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString()
      });
    } catch (error) {
      logger.error('gRPC getProduct failed:', error.message);
      callback({
        code: error.name === 'NotFoundError' ? grpc.status.NOT_FOUND : grpc.status.INTERNAL,
        details: error.message,
      });
    }
  }
}

module.exports = new GrpcController();
