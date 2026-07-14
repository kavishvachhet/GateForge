require('dotenv').config();
const mongoose = require('mongoose');
const { Kafka, logLevel } = require('kafkajs');
const { createLogger } = require('shared-lib');

const logger = createLogger('user-config');

const config = {
  port: process.env.USER_SERVICE_PORT || 3002,
  grpcPort: process.env.USER_GRPC_PORT || 50052,
  mongoUri: process.env.MONGO_URI_USER || 'mongodb://localhost:27017/user_db',
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: 'user-service',
  }
};

// Database Connection
async function connectDB() {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('✅ MongoDB connected successfully (User Service)');
  } catch (error) {
    logger.error('❌ MongoDB connection failed');
    process.exit(1);
  }
}

// Kafka Consumer Setup
const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  logLevel: logLevel.WARN,
});
const consumer = kafka.consumer({ groupId: 'user-service-group' });

async function connectKafka() {
  try {
    await consumer.connect();
    // Subscribe to Auth Service's registration events
    await consumer.subscribe({ topic: 'user.registered', fromBeginning: true });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const event = JSON.parse(message.value.toString());
        logger.info(`Received event from ${topic}:`, event.userId);
        
        switch(topic) {
          case 'user.registered':
            // 🐛 FIX: The Auth Service registered the user, but we MUST save them in the User Service DB too!
            const User = require('../models/User');
            await User.findOneAndUpdate(
              { _id: event.userId }, // Force same ID
              { name: event.name, email: event.email },
              { upsert: true, new: true }
            );
            logger.info(`✅ Successfully saved new User ${event.userId} to User Service Database`);
            break;
        }
      },
    });

    logger.info('✅ Kafka Consumer connected successfully (User Service)');
  } catch (error) {
    logger.error('❌ Kafka connection failed', error);
  }
}

module.exports = { config, connectDB, connectKafka };
