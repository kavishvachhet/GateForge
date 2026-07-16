const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: { type: String, required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },       // per-unit price
  itemTotal: { type: Number, required: true, min: 0 },    // price * quantity
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  items: [orderItemSchema],
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'SHIPPED', 'DELIVERED', 'FAILED'],
    default: 'PENDING'
  },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
