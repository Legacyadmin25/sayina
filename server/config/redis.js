const Redis = require('ioredis');
require('dotenv').config();

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || '',
  db: process.env.REDIS_DB || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

// Initialize Redis client
const redisClient = new Redis(redisConfig);

// Handle Redis connection events
redisClient.on('connect', () => {
  console.log('Redis client connected');
});

redisClient.on('error', (err) => {
  console.error('Redis client error:', err);
});

// OTP Helper functions
const storeOTP = async (key, otp, expiryMinutes = 10) => {
  try {
    await redisClient.set(
      `otp:${key}`,
      otp,
      'EX',
      expiryMinutes * 60
    );
    return true;
  } catch (error) {
    console.error('Error storing OTP:', error);
    return false;
  }
};

const getOTP = async (key) => {
  try {
    const otp = await redisClient.get(`otp:${key}`);
    return otp;
  } catch (error) {
    console.error('Error retrieving OTP:', error);
    return null;
  }
};

const verifyOTP = async (key, otp) => {
  try {
    const storedOTP = await redisClient.get(`otp:${key}`);
    if (!storedOTP) {
      return false;
    }
    
    const isValid = storedOTP === otp;
    
    if (isValid) {
      // Delete OTP after successful verification
      await redisClient.del(`otp:${key}`);
    }
    
    return isValid;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return false;
  }
};

// Rate limiting helper functions
const incrementRateLimit = async (key, expirySeconds = 60) => {
  try {
    const count = await redisClient.incr(`ratelimit:${key}`);
    if (count === 1) {
      await redisClient.expire(`ratelimit:${key}`, expirySeconds);
    }
    return count;
  } catch (error) {
    console.error('Error incrementing rate limit:', error);
    return 0;
  }
};

const getRateLimit = async (key) => {
  try {
    const count = await redisClient.get(`ratelimit:${key}`);
    return parseInt(count) || 0;
  } catch (error) {
    console.error('Error getting rate limit:', error);
    return 0;
  }
};

module.exports = {
  redisClient,
  storeOTP,
  getOTP,
  verifyOTP,
  incrementRateLimit,
  getRateLimit
};
