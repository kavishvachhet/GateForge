const Product = require('../models/Product');
const { NotFoundError, ConflictError } = require('shared-lib');
const { createLogger } = require('shared-lib');

const logger = createLogger('inventory-service');

class InventoryService {
  
  async getProduct(id) {
    const product = await Product.findById(id);
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }

  async listProducts(page = 1, limit = 10, category = null) {
    const skip = (page - 1) * limit;
    const query = category ? { category } : {};
    
    const [products, total] = await Promise.all([
      Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Product.countDocuments(query)
    ]);

    return { products, total, page, limit };
  }

  async createProduct(data) {
    const product = new Product(data);
    return product.save();
  }

  async updateProduct(id, data) {
    const product = await Product.findByIdAndUpdate(id, data, { new: true });
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }

  async deleteProduct(id) {
    const product = await Product.findByIdAndDelete(id);
    if (!product) throw new NotFoundError('Product not found');
    return { success: true, message: 'Product deleted' };
  }

  async reserveStock(orderId, items) {
    for (const item of items) {
      const result = await Product.findOneAndUpdate(
        { _id: item.productId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );

      if (!result) {
        throw new ConflictError(`Failed to reserve stock for product ${item.productId}. Either not found or insufficient stock.`);
      }

      logger.info(`?? Reserved ${item.quantity} units of product ${item.productId} for Order ${orderId}`);
    }

    return true;
  }
}

module.exports = new InventoryService();
