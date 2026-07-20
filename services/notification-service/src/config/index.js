require('dotenv').config();
const { Kafka, logLevel } = require('kafkajs');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { createLogger, KAFKA_TOPICS } = require('shared-lib');
const notificationService = require('../services/notification.service');

const logger = createLogger('notification-config');

// Load User proto file
const PROTO_PATH = path.resolve(__dirname, '../../../../packages/proto/user.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const userProto = grpc.loadPackageDefinition(packageDefinition).user;

const userGrpcClient = new userProto.UserService('localhost:50052', grpc.credentials.createInsecure());

const config = {
  port: process.env.NOTIFICATION_SERVICE_PORT || 3005,
  grpcPort: process.env.NOTIFICATION_GRPC_PORT || 50055,
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: 'notification-service',
  }
};

const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  logLevel: logLevel.WARN,
});
const consumer = kafka.consumer({ groupId: 'notification-service-group' });

async function connectKafka() {
  try {
    await consumer.connect();
    
    // Listen for ALL relevant events across the entire architecture
    await consumer.subscribe({ topic: KAFKA_TOPICS.USER_REGISTERED, fromBeginning: true });
    await consumer.subscribe({ topic: KAFKA_TOPICS.ORDER_CREATED, fromBeginning: true });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const event = JSON.parse(message.value.toString());
        logger.info(`Received event from ${topic}`);
        
        switch(topic) {
          case KAFKA_TOPICS.USER_REGISTERED:
            await notificationService.sendWelcomeEmail(event.email, event.name);
            break;
          case KAFKA_TOPICS.ORDER_CREATED:
            await notificationService.sendOrderConfirmationEmail(event.userId, event.orderId);
            break;
        }
      },
    });
    
    logger.info('✅ Kafka Consumer connected successfully (Notification Service)');
  } catch (error) {
    logger.error('❌ Kafka Consumer connection failed', error);
  }
}

module.exports = { config, connectKafka, userGrpcClient };
