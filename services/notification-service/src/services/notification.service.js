const { createLogger } = require('shared-lib');
const logger = createLogger('notification-service');

class NotificationService {
  
  async sendWelcomeEmail(email, name) {
    // In a real app, you would use SendGrid, AWS SES, or NodeMailer here.
    logger.info(`📧 Mock sending Welcome Email to ${name} (${email})`);
    return true;
  }

  async sendOrderConfirmationEmail(userId, orderId) {
    // Dynamically require config to prevent circular dependency
    const { userGrpcClient } = require('../config');

    return new Promise((resolve, reject) => {
      userGrpcClient.GetUser({ id: userId }, (err, user) => {
        if (err) {
          logger.error(`❌ Failed to fetch user ${userId} via gRPC for Order #${orderId}. Email not sent.`);
          resolve(false); // don't crash the consumer
          return;
        }

        // We successfully fetched the user data synchronously via gRPC!
        logger.info(`📧 Mock sending Order Confirmation Email for Order #${orderId} to ${user.email} (User: ${user.name})`);
        resolve(true);
      });
    });
  }

}

module.exports = new NotificationService();
