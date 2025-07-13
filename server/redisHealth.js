const Queue = require('bull');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const healthQueue = new Queue('healthz', REDIS_URL);

async function checkRedisHealth() {
  try {
    await healthQueue.client.ping();
    return { healthy: true };
  } catch (err) {
    return { healthy: false, error: err.message };
  }
}

module.exports = { healthQueue, checkRedisHealth };
