require('dotenv').config();

module.exports = {
  port: process.env.AUTH_SERVICE_PORT || 3001,
  grpcPort: process.env.AUTH_GRPC_PORT || 50051,
  mongoUri: process.env.MONGO_URI_AUTH || 'mongodb://localhost:27017/auth_db',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '',
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: 'auth-service',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'super_secret_jwt_key_change_me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_key_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  }
};
