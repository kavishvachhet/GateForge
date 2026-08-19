/**
 * Background cron job that periodically scans Redis to release stuck or expired inventory reservations.
 */
const { createLogger } = require('shared-lib');
const inventoryService = require('../services/inventory.service');

const logger = createLogger('expiry-worker');

const WORKER_INTERVAL_MS = 30000; // 30 seconds

let intervalId = null;

function startExpiryWorker() {
  logger.info(` Starting Reservation Expiry Worker (runs every ${WORKER_INTERVAL_MS / 1000}s)`);

  intervalId = setInterval(async () => {
    try {
      await inventoryService.releaseExpiredReservations();
    } catch (error) {
      logger.error(' Expiry Worker error:', error.message);
    }
  }, WORKER_INTERVAL_MS);
}

function stopExpiryWorker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info(' Expiry Worker stopped');
  }
}

module.exports = { startExpiryWorker, stopExpiryWorker };
