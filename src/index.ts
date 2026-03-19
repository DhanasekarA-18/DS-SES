import dotenv from 'dotenv';
import app from './app';
import logger from './utils/logger';
import './workers/notificationWorker'; // Ensure worker is initialized

dotenv.config();

const port = process.env.PORT || 3000;

app.listen(port, () => {
  logger.info(`Server is running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
  logger.info(`Notification Manager ready to accept requests at /v1/notify`);
  logger.info(`Queue administration UI is available at http://localhost:${port}/admin/queues`);
});

// Graceful shutdown logic
process.on('SIGTERM', () => {
    logger.info('Received SIGTERM signal. Shutting down...');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('Received SIGINT signal. Shutting down...');
    process.exit(0);
});
