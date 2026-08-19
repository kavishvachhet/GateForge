/**
 * Core business logic for retrieving and updating user profiles, integrating closely with Auth Service events.
 */
const User = require('../models/User');
const { NotFoundError } = require('shared-lib');

class UserService {
  async getUser(id) {
    const user = await User.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async getUsers(page = 1, limit = 10, sortBy = 'createdAt', order = 'desc') {
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: order === 'desc' ? -1 : 1 };
    
    const [users, total] = await Promise.all([
      User.find().sort(sort).skip(skip).limit(limit),
      User.countDocuments()
    ]);

    return { users, total, page, limit };
  }

  async updateUser(id, updateData) {
    const user = await User.findByIdAndUpdate(id, updateData, { new: true });
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async deleteUser(id) {
    const user = await User.findByIdAndDelete(id);
    if (!user) throw new NotFoundError('User not found');
    return { success: true, message: 'User deleted' };
  }

  async searchUsers(query, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const searchQuery = { $text: { $search: query } };
    
    const [users, total] = await Promise.all([
      User.find(searchQuery).skip(skip).limit(limit),
      User.countDocuments(searchQuery)
    ]);

    return { users, total, page, limit };
  }
}

module.exports = new UserService();
