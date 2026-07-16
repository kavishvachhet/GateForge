const Order = require('../models/Order');
const { inventoryGrpcClient } = require('../config');
const { NotFoundError, ValidationError, createLogger } = require('shared-lib');

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

        const realPrice = product.price;
        const itemTotal = realPrice * item.quantity;
        totalAmount += itemTotal;

        validatedItems.push({
          productId: item.productId,
          productName: product.name,
          quantity: item.quantity,
          price: realPrice,
          itemTotal: itemTotal,
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
}

module.exports = new OrderService();
