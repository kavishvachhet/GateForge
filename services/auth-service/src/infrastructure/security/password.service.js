const bcrypt = require('bcrypt');

class PasswordService {
  async hash(password) {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async verify(password, hash) {
    return bcrypt.compare(password, hash);
  }
}

module.exports = new PasswordService();
