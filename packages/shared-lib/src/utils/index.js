const pino = require("pino");
const { v4: uuidv4 } = require('uuid');


function generateCorrelationId(){
    return uuidv4();
}


function createLogger(serviceName){
    return pino({
    name: serviceName,
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  });
}

function sleep(ms){
    return new Promise((resolve)=> setTimeout(resolve,ms));
}

async function retry(fn, options = {}) {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000 } = options;
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) break;
      // Exponential backoff: 1s, 2s, 4s... with some randomness (jitter)
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = delay * 0.5 * Math.random();
      await sleep(delay + jitter);
    }
  }
  throw lastError;
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  generateCorrelationId,
  createLogger,
  sleep,
  retry,
  asyncHandler,
};