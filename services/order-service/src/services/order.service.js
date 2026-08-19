/**
 * Core business logic for validating orders via gRPC, persisting them, and managing Saga state transitions.
 */
const Order = require('../models/Order');
const { publishEvent, inventoryGrpcClient } = require('../config');
const { NotFoundError, ValidationError, KAFKA_TOPICS, createLogger } = require('shared-lib');

const logger = createLogger('order-service');

class OrderService {
  async createOrder(userId, items) {
    let totalAmount = 0;
    const validatedItems = [];

    const getProduct = (productId) => {
      return new Promise((resolve, reject) => {
        inventoryGrpcClient.GetProduct({ productId }, (err, response) => {
          if (err) reject(err);
          else resolve(response);
        });
      });
    };

    for (const item of items) {
      try {

        const product = await getProduct(item.productId);

        if (product.stock < item.quantity) {
          throw new ValidationError(
            `Insufficient stock for "${product.name}". Requested: ${item.quantity}, Available: ${product.stock}`
          );
        }

        const realPrice = product.price;       // e.g. ₹599.99
        const itemTotal = realPrice * item.quantity; // e.g. ₹599.99 * 2 = ₹1199.98
        totalAmount += itemTotal;

        validatedItems.push({
          productId: item.productId,
          productName: product.name,
          quantity: item.quantity,
          price: realPrice,       // per-unit price from DB
          itemTotal: itemTotal,   // price * quantity
        });
      } catch (error) {

        if (error.isOperational) throw error;

        if (error.code === 5) {
          throw new NotFoundError(`Product with ID "${item.productId}" does not exist in inventory.`);
        }
        throw new ValidationError(`Failed to validate product ${item.productId}: ${error.message}`);
      }
    }

    const order = new Order({ userId, items: validatedItems, totalAmount });
    await order.save();

    await publishEvent(KAFKA_TOPICS.ORDER_CREATED, order.id, {
      orderId: order.id,
      userId: order.userId,
      items: order.items,
      totalAmount: order.totalAmount,
    });

    return order;
  }

  async getOrder(id) {
    const order = await Order.findById(id);
    if (!order) throw new NotFoundError('Order not found');
    return order;
  }

  async updateOrderStatus(id, status) {
    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });
    if (!order) throw new NotFoundError('Order not found');
    return order;
  }

  async listUserOrders(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const [orders, total] = await Promise.all([
      Order.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments({ userId })
    ]);

    return { orders, total, page, limit };
  }

  async handleOrderFailed(orderId, reason) {
    try {
      const order = await Order.findByIdAndUpdate(
        orderId,
        { status: 'FAILED' },
        { new: true }
      );
      if (order) {
        logger.warn(` Order ${orderId} marked as FAILED. Reason: ${reason}`);
      } else {
        logger.error(`Order ${orderId} not found when trying to mark as FAILED`);
      }
    } catch (error) {
      logger.error(`Error handling ORDER_FAILED for ${orderId}:`, error.message);
    }
  }

  async handleInventoryReserved(orderId) {
    try {
      const order = await Order.findByIdAndUpdate(
        orderId,
        { status: 'CONFIRMED' },
        { new: true }
      );
      if (order) {
        logger.info(` Order ${orderId} marked as CONFIRMED — stock reserved successfully`);
      } else {
        logger.error(`Order ${orderId} not found when trying to mark as CONFIRMED`);
      }
    } catch (error) {
      logger.error(`Error handling INVENTORY_RESERVED for ${orderId}:`, error.message);
    }
  }
}

module.exports = new OrderService();
