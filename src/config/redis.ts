import IORedis from 'ioredis';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  const errorMsg = 'REDIS_URL is not defined in environment variables';
  logger.error(errorMsg);
  throw new Error(errorMsg);
}

// Config for BullMQ and IORedis connection
export const redisConfig = {
  connection: new IORedis(redisUrl, {
    maxRetriesPerRequest: null, // Critical for BullMQ
  }),
};

redisConfig.connection.on('connect', () => {
  logger.info('Successfully connected to Redis');
});

redisConfig.connection.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

export default redisConfig;
