/**
 * Mongoose schema representing a product and its available stock level.
 */
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  category: { type: String },
}, { timestamps: true });

productSchema.index({ name: 'text', category: 'text' });

module.exports = mongoose.model('Product', productSchema);
