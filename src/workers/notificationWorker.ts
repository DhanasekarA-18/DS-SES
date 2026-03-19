import { Worker, Job } from 'bullmq';
import { redisConfig } from '../config/redis';
import { NOTIFICATION_QUEUE_NAME } from '../queues/notificationQueue';
import { NotificationPayload } from '../validators/notificationValidator';
import logger from '../utils/logger';
import { sendEmailProvider } from '../providers/emailProvider';

// Placeholder service logic (these would normally be external modules/services)
const sendEmail = async (payload: NotificationPayload) => {
  logger.info(`Sending EMAIL to: ${payload.to} (Template: ${payload.template})`);
  return await sendEmailProvider(payload.to, payload.template, payload.data);
};

const sendSms = async (payload: NotificationPayload) => {
  logger.info(`Sending SMS to: ${payload.to} (Template: ${payload.template})`);
  // Add actual provider (Twilio/MessageBird) here
  return { status: 'success' };
};

const sendWhatsapp = async (payload: NotificationPayload) => {
  logger.info(`Sending WHATSAPP to: ${payload.to} (Template: ${payload.template})`);
  // Add actual provider (Twilio/Meta API) here
  return { status: 'success' };
};

export const notificationWorker = new Worker<NotificationPayload>(
  NOTIFICATION_QUEUE_NAME,
  async (job: Job<NotificationPayload>) => {
    const { type } = job.data;
    logger.info(`Processing Job ID: ${job.id}, Type: ${type}`);

    try {
      switch (type) {
        case 'EMAIL':
          return await sendEmail(job.data);
        case 'SMS':
          return await sendSms(job.data);
        case 'WHATSAPP':
          return await sendWhatsapp(job.data);
        default:
          throw new Error(`Unsupported notification type: ${type}`);
      }
    } catch (err) {
      logger.error(`Error processing job ID ${job.id}:`, err);
      throw err; // Signal BullMQ to retry based on backoff config
    }
  },
  {
    connection: redisConfig.connection as any,
    concurrency: 5, // Adjust based on workload and service limits
  }
);

notificationWorker.on('completed', async (job) => {
  logger.info(`Job ID ${job.id} completed successfully`);
  try {
    await redisConfig.connection.incr('ses:total_delivered');
  } catch (err) {
    logger.error('Failed to increment delivered counter:', err);
  }
});

notificationWorker.on('failed', async (job, err) => {
  logger.error(`Job ID ${job?.id} failed: ${err.message}`);
  try {
    await redisConfig.connection.incr('ses:total_failed');
  } catch (err) {
    logger.error('Failed to increment failed counter:', err);
  }
});
