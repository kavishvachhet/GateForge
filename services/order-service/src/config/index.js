require('dotenv').config();
const mongoose = require('mongoose');
const { Kafka, logLevel } = require('kafkajs');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { createLogger, KAFKA_TOPICS } = require('shared-lib');

const logger = createLogger('order-config');

// Load Inventory proto file
const PROTO_PATH = path.resolve(__dirname, '../../../../packages/proto/inventory.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const inventoryProto = grpc.loadPackageDefinition(packageDefinition).inventory;

const inventoryGrpcClient = new inventoryProto.InventoryService('localhost:50054', grpc.credentials.createInsecure());

const config = {
  port: process.env.ORDER_SERVICE_PORT || 3003,
  grpcPort: process.env.ORDER_GRPC_PORT || 50053,
  mongoUri: process.env.MONGO_URI_ORDER || 'mongodb://localhost:27017/order_db',
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: 'order-service',
  }
};

async function connectDB() {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('✅ MongoDB connected successfully (Order Service)');
  } catch (error) {
    logger.error('❌ MongoDB connection failed');
    process.exit(1);
  }
}

const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  logLevel: logLevel.WARN,
});
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'order-service-group' });

async function connectKafka() {
  try {
    // Connect producer (for publishing ORDER_CREATED events)
    await producer.connect();
    logger.info('✅ Kafka Producer connected successfully (Order Service)');

    // Connect consumer (for receiving compensating events from Inventory Service)
    await consumer.connect();
    await consumer.subscribe({ topic: KAFKA_TOPICS.ORDER_FAILED, fromBeginning: true });
    await consumer.subscribe({ topic: KAFKA_TOPICS.INVENTORY_RESERVED, fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const event = JSON.parse(message.value.toString());
        logger.info(`Received event from ${topic} for Order ${event.orderId}`);

        // Lazy-load to avoid circular dependency
        const orderService = require('./services/order.service');

        switch (topic) {
          case KAFKA_TOPICS.ORDER_FAILED:
            await orderService.handleOrderFailed(event.orderId, event.reason);
            break;
          case KAFKA_TOPICS.INVENTORY_RESERVED:
            await orderService.handleInventoryReserved(event.orderId);
            break;
        }
      },
    });

    logger.info('✅ Kafka Consumer connected successfully (Order Service)');
  } catch (error) {
    logger.error('❌ Kafka connection failed', error);
  }
}

async function publishEvent(topic, key, data) {
  try {
    await producer.send({
      topic,
      messages: [{ key: key.toString(), value: JSON.stringify(data) }],
    });
    logger.info(`Published event to ${topic} for key ${key}`);
  } catch (error) {
    logger.error(`Failed to publish event to ${topic}`, error);
  }
}

module.exports = { config, connectDB, connectKafka, publishEvent, inventoryGrpcClient };
