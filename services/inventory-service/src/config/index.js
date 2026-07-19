require('dotenv').config();
const mongoose = require('mongoose');
const { Kafka, logLevel } = require('kafkajs');
const { createLogger, KAFKA_TOPICS } = require('shared-lib');
const Redis = require('ioredis');

const logger = createLogger('inventory-config');

const redisClient = new Redis(process.env.REDIS_URI || 'redis://localhost:6379');
redisClient.on('error', (err) => logger.error('Redis error:', err));

const config = {
  port: process.env.INVENTORY_SERVICE_PORT || 3004,
  grpcPort: process.env.INVENTORY_GRPC_PORT || 50054,
  mongoUri: process.env.MONGO_URI_INVENTORY || 'mongodb://localhost:27017/inventory_db',
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: 'inventory-service',
  }
};

async function connectDB() {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('✅ MongoDB connected successfully (Inventory Service)');
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
const consumer = kafka.consumer({ groupId: 'inventory-service-group' });
const producer = kafka.producer();

// Publish events to Kafka (e.g., INVENTORY_RESERVED, ORDER_FAILED)
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

async function connectKafka(inventoryService) {
  try {
    // Connect both producer and consumer
    await producer.connect();
    logger.info('✅ Kafka Producer connected successfully (Inventory Service)');

    await consumer.connect();
    // Listen for orders being created so we can reserve stock
    await consumer.subscribe({ topic: KAFKA_TOPICS.ORDER_CREATED, fromBeginning: true });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const event = JSON.parse(message.value.toString());
        logger.info(`Received event from ${topic} for Order ${event.orderId}`);
        
        if (topic === KAFKA_TOPICS.ORDER_CREATED) {
          // Tell inventory service to reserve stock
          try {
            await inventoryService.reserveStock(event.orderId, event.items);
            logger.info(`Successfully reserved stock for Order ${event.orderId}`);

            // Publish INVENTORY_RESERVED event so Order Service can update status to CONFIRMED
            await publishEvent(KAFKA_TOPICS.INVENTORY_RESERVED, event.orderId, {
              orderId: event.orderId,
              items: event.items,
            });
          } catch (error) {
            logger.error(`Failed to reserve stock for Order ${event.orderId}`, error);

            // Publish ORDER_FAILED event so Order Service can update status to FAILED
            await publishEvent(KAFKA_TOPICS.ORDER_FAILED, event.orderId, {
              orderId: event.orderId,
              reason: error.message,
            });
          }
        }
      },
    });
    
    logger.info('✅ Kafka Consumer connected successfully (Inventory Service)');
  } catch (error) {
    logger.error('❌ Kafka connection failed', error);
  }
}

module.exports = { config, connectDB, connectKafka, redisClient, publishEvent };
