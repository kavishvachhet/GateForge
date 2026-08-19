/**
 * Placeholder or minimal gRPC controller for Order Service inter-service communication.
 */
const grpc = require('@grpc/grpc-js');
const orderService = require('../services/order.service');
const { createLogger } = require('shared-lib');

const logger = createLogger('order-grpc');

class GrpcController {

  async getOrder(call, callback) {
    try {
      const order = await orderService.getOrder(call.request.id);
      callback(null, {
        id: order.id,
        userId: order.userId,
        status: order.status,
        totalAmount: order.totalAmount,
        items: order.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        })),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString()
      });
    } catch (error) {
      logger.error(`gRPC getOrder failed: ${error.message}`);
      if (error.name === 'CastError' || error.name === 'NotFoundError') {
        const err = new Error('The requested order could not be found or the Order ID is invalid.');
        err.code = grpc.status.NOT_FOUND;
        return callback(err);
      }

      const err = new Error('An internal server error occurred.');
      err.code = grpc.status.INTERNAL;
      callback(err);
    }
  }
}

module.exports = new GrpcController();
