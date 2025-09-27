import { createClient } from 'redis';
import config from './index.js';
import logger from '../utils/logger.js';

let redisClient = null;

export const connectRedis = async () => {
  try {
    if (!config.redis.url) {
      logger.info('No Redis URL configured, skipping Redis connection');
      return null;
    }
    
    logger.info('Attempting to connect to Redis...');
    
    redisClient = createClient({
      url: config.redis.url,
      socket: {
        connectTimeout: 15000,
        lazyConnect: false,
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
      }
    });
    
    redisClient.on('error', (err) => {
      logger.error('Redis client error:', err);
    });
    
    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });
    
    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });
    
    redisClient.on('end', () => {
      logger.info('Redis client connection ended');
    });

    await redisClient.connect();
    
    // Test the connection
    await redisClient.ping();
    logger.info('Redis connected and responding to ping');
    
    return redisClient;
  } catch (error) {
    logger.warn('Redis connection failed, will use fallback mechanisms:', {
      message: error.message,
      code: error.code,
      errno: error.errno
    });
    redisClient = null;
    // Don't throw error, just return null and let services use fallbacks
    return null;
  }
};

export const getRedisClient = () => {
  return redisClient;
};

export const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
  }
};

export default { connectRedis, getRedisClient, closeRedis };
