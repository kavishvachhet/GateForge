/**
 * Kafka producer configuration for emitting authentication-related domain events.
 */
const { Kafka, logLevel } = require('kafkajs');
const config = require('../../config');
const { createLogger } = require('shared-lib');

const logger = createLogger('auth-kafka');

const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  logLevel: logLevel.WARN,
});

const producer = kafka.producer();

async function connectKafka() {
  try {
    await producer.connect();
    logger.info(' Kafka Producer connected successfully (Auth Service)');
  } catch (error) {
    logger.error(' Kafka connection failed');
    logger.error(error);
  }
}

async function publishEvent(topic, key, data) {
  try {
    await producer.send({
      topic,
      messages: [{ key, value: JSON.stringify(data) }],
    });
    logger.info(`Published event to ${topic}`);
  } catch (error) {
    logger.error(`Failed to publish event to ${topic}`);
    logger.error(error);
  }
}

module.exports = { connectKafka, publishEvent };
