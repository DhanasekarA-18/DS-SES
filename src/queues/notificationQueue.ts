import { Queue } from 'bullmq';
import { redisConfig } from '../config/redis';
import { NotificationPayload } from '../validators/notificationValidator';
import logger from '../utils/logger';

export const NOTIFICATION_QUEUE_NAME = 'notification-queue';

export const notificationQueue = new Queue<NotificationPayload>(NOTIFICATION_QUEUE_NAME, {
  connection: redisConfig.connection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: { 
      count: 1000 // Keep last 1000 completed jobs for statistics
    },
    removeOnFail: false,
  },
});

export const addNotificationToQueue = async (payload: NotificationPayload) => {
  try {
    const job = await notificationQueue.add(`send-${payload.type.toLowerCase()}` as any, payload);
    logger.info(`Notification job added: ID ${job.id}, Type: ${payload.type}`);
    return job;
  } catch (err) {
    logger.error('Error adding notification to queue:', err);
    throw err;
  }
};
