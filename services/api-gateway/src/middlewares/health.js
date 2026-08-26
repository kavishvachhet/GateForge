/*
    This middleware is used when there are multiple instances of single service.
    The purpose of this is just whether which particular instance of service is up
*/

/**
 * TCP Health Probe using raw sockets (Layer 4).
 * Bypasses HTTP overhead to check if a backend process is actually listening.
 */
const net = require('net');
const { createLogger } = require('shared-lib');

const logger = createLogger('tcp-health-probe');

class HealthChecker {
    /**
     * @param {Array<{host: string, port: number}>} backends 
     * @param {number} intervalMs 
     */
    constructor(backends, intervalMs = 5000) {
        this.backends = backends.map(b => ({ ...b, isUp: null }));
        this.intervalMs = intervalMs;
        this.timer = null;
    }

    start() {
        this.probeAll();
        this.timer = setInterval(() => this.probeAll(), this.intervalMs);
        logger.info(`Started TCP health probes every ${this.intervalMs}ms`);
    }

    stop() {
        if (this.timer) clearInterval(this.timer);
    }

    probeAll() {
        this.backends.forEach((backend, index) => {
            this.checkTcp(backend.host, backend.port, (isUp) => {
                // Only log if the state actually changed
                if (backend.isUp !== isUp) {
                    logger.info(
                        `[Health] ${backend.host}:${backend.port} is now ${isUp ? '🟢 UP' : '🔴 DOWN'}`
                    );
                    this.backends[index].isUp = isUp;
                }
            });
        });
    }

    //Three way Handshake tcp
    checkTcp(host, port, callback) {
        const socket = new net.Socket();

        socket.setTimeout(2000);

        socket.on('connect', () => {
            socket.destroy();
            callback(true);
        });

        socket.on('timeout', () => {
            socket.destroy();
            callback(false);
        });

        socket.on('error', (err) => {
            socket.destroy();
            callback(false);
        });
        socket.connect(port, host);
    }

    getHealthyNodes() {
        return this.backends.filter(b => b.isUp);
    }
}

module.exports = HealthChecker;
