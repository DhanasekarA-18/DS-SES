import { Request, Response } from 'express';
import { addNotificationToQueue } from '../queues/notificationQueue';
import { NotificationPayloadSchema } from '../validators/notificationValidator';
import logger from '../utils/logger';

export const sendNotification = async (req: Request, res: Response) => {
  try {
    const validatedData = NotificationPayloadSchema.parse(req.body);
    const job = await addNotificationToQueue(validatedData);

    logger.info(`Notification queued: ID ${job.id}`);
    res.status(202).json({
      success: true,
      message: 'Notification request accepted and queued for processing',
      jobId: job.id,
    });
  } catch (err: any) {
    if (err.errors) {
      // Zod validation errors
      logger.warn(`Validation Error: ${JSON.stringify(err.errors)}`);
      res.status(400).json({ success: false, errors: err.errors });
      return;
    }
    logger.error(`Failed to queue notification: ${err.message}`);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
