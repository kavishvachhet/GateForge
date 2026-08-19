/**
 * Defines global constants like Kafka topics used across the entire distributed system.
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER: 500,
  SERVICE_UNAVAILABLE: 503,
};

const KAFKA_TOPICS = {
  USER_REGISTERED: 'user.registered',
  USER_UPDATED: 'user.updated',
  ORDER_CREATED: 'order.created',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_FAILED: 'order.failed',
  INVENTORY_RESERVED: 'inventory.reserved',
  INVENTORY_FAILED: 'inventory.failed',
  INVENTORY_UPDATED: 'inventory.updated',
  NOTIFICATION_DLQ: 'notifications.dlq',
};

const REDIS_PREFIXES = {
  SESSION: 'session:',
  RATE_LIMIT: 'rate:',
  CACHE: 'cache:',
  TOKEN_BLACKLIST: 'blacklist:',
};

const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  MANAGER: 'manager',
};

const ORDER_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
};

const SERVICES = {
  AUTH: { name: 'auth-service', grpcPort: 50051, httpPort: 3001 },
  USER: { name: 'user-service', grpcPort: 50052, httpPort: 3002 },
  ORDER: { name: 'order-service', grpcPort: 50053, httpPort: 3003 },
  INVENTORY: { name: 'inventory-service', grpcPort: 50054, httpPort: 3004 },
  NOTIFICATION: { name: 'notification-service', grpcPort: 50055, httpPort: 3005 },
};

module.exports = {
  HTTP_STATUS,
  KAFKA_TOPICS,
  REDIS_PREFIXES,
  ROLES,
  ORDER_STATUS,
  SERVICES,
};
