/**
 * Core business logic for managing products, caching in Redis, and executing distributed locks for stock reservation.
 */
const Product = require('../models/Product');
const { NotFoundError, ConflictError } = require('shared-lib');
const { redisClient } = require('../config');
const { createLogger } = require('shared-lib');

const logger = createLogger('inventory-service');

const LOCK_TTL = 5; // seconds
const RESERVATION_TTL = 300; // 5 minutes

async function acquireLock(key, ttlSeconds = LOCK_TTL) {

  const result = await redisClient.set(key, Date.now().toString(), 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}

async function releaseLock(key) {
  await redisClient.del(key);
}

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

    const reservedItems = []; // Track what we've reserved for rollback on failure

    for (const item of items) {
      const lockKey = `lock:product:${item.productId}`;
      let lockAcquired = false;

      for (let attempt = 0; attempt < 3; attempt++) {
        lockAcquired = await acquireLock(lockKey);
        if (lockAcquired) break;
        await new Promise(r => setTimeout(r, 100));
      }

      if (!lockAcquired) {

        await this._rollbackReservations(reservedItems);
        throw new ConflictError(`Could not acquire lock for product ${item.productId}. System busy.`);
      }

      try {

        const result = await Product.findOneAndUpdate(
          { _id: item.productId, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { new: true }
        );

        if (!result) {
          await releaseLock(lockKey);

          await this._rollbackReservations(reservedItems);
          throw new ConflictError(`Failed to reserve stock for product ${item.productId}. Either not found or insufficient stock.`);
        }

        const reservationKey = `reservation:${orderId}:${item.productId}`;
        const reservationData = JSON.stringify({
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          reservedAt: Date.now(),
        });
        await redisClient.setex(reservationKey, RESERVATION_TTL, reservationData);

        await redisClient.sadd('reservations:active', reservationKey);

        reservedItems.push({ productId: item.productId, quantity: item.quantity });
        logger.info(` Reserved ${item.quantity} units of product ${item.productId} for Order ${orderId}`);
      } finally {
        await releaseLock(lockKey);
      }
    }

    return true;
  }

  async _rollbackReservations(reservedItems) {
    for (const item of reservedItems) {
      try {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.quantity }
        });
        logger.warn(` Rolled back ${item.quantity} units for product ${item.productId}`);
      } catch (err) {
        logger.error(` Failed to rollback stock for product ${item.productId}`, err);
      }
    }
  }

  async releaseExpiredReservations() {
    const activeKeys = await redisClient.smembers('reservations:active');
    let releasedCount = 0;

    for (const key of activeKeys) {

      const data = await redisClient.get(key);

      if (!data) {

        const parts = key.split(':');

        await redisClient.srem('reservations:active', key);
        continue;
      }

      const reservation = JSON.parse(data);
      const elapsed = Date.now() - reservation.reservedAt;

      if (elapsed > RESERVATION_TTL * 1000) {
        try {
          await Product.findByIdAndUpdate(reservation.productId, {
            $inc: { stock: reservation.quantity }
          });
          await redisClient.del(key);
          await redisClient.srem('reservations:active', key);
          releasedCount++;
          logger.info(` Expired reservation released: ${reservation.quantity} units of product ${reservation.productId} for Order ${reservation.orderId}`);
        } catch (err) {
          logger.error(` Failed to release expired reservation ${key}`, err);
        }
      }
    }

    if (releasedCount > 0) {
      logger.info(` Released ${releasedCount} expired reservations`);
    }
  }

  async commitReservation(orderId, items) {
    for (const item of items) {
      const reservationKey = `reservation:${orderId}:${item.productId}`;
      await redisClient.del(reservationKey);
      await redisClient.srem('reservations:active', reservationKey);
    }
    logger.info(` Committed reservation for Order ${orderId} — stock permanently deducted`);
  }
}

module.exports = new InventoryService();
