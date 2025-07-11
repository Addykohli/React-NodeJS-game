// server/redisHealth.js
// Helper for Redis/Bull health check
const Queue = require('bull');

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// You may want to use the same queue name as in your main app
const healthQueue = new Queue('healthz', REDIS_URL);

async function checkRedisHealth() {
  try {
    // Ping Redis via Bull
    await healthQueue.client.ping();
    return { healthy: true };
  } catch (err) {
    return { healthy: false, error: err.message };
  }
}

module.exports = { healthQueue, checkRedisHealth };
