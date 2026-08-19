/**
 * Core business logic for dispatching emails and alerts based on consumed domain events.
 */
const { createLogger } = require('shared-lib');
const logger = createLogger('notification-service');

class NotificationService {
  
  async sendWelcomeEmail(email, name) {

    logger.info(` Mock sending Welcome Email to ${name} (${email})`);
    return true;
  }

  async sendOrderConfirmationEmail(userId, orderId) {

    const { userGrpcClient } = require('../config');

    return new Promise((resolve, reject) => {
      userGrpcClient.GetUser({ id: userId }, (err, user) => {
        if (err) {
          logger.error(` Failed to fetch user ${userId} via gRPC for Order #${orderId}. Email not sent.`);
          resolve(false); // don't crash the consumer
          return;
        }

        logger.info(` Mock sending Order Confirmation Email for Order #${orderId} to ${user.email} (User: ${user.name})`);
        resolve(true);
      });
    });
  }

}

module.exports = new NotificationService();
