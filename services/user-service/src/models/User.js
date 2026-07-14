const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, default: 'user' },
  // Notice we don't store password hash here! That's owned by Auth Service.
  // The User Service just handles the public profile.
}, { timestamps: true });

// Text index for fast searching (like you did in Shopora!)
userSchema.index({ name: 'text', email: 'text' });

module.exports = mongoose.model('User', userSchema);
