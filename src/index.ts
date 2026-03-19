import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { sendNotification } from './controllers/notificationController';
import logger from './utils/logger';
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { notificationQueue } from './queues/notificationQueue';
import { redisConfig } from './config/redis';
import { notificationWorker } from './workers/notificationWorker';

// Load environment variables
dotenv.config();

/**
 * App Configuration & Initialization
 */
const app: Express = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const IS_VERCEL = !!process.env.VERCEL;

/**
 * Bull Board Setup (Queue Monitoring UI)
 */
const setupQueueDashboard = (app: Express) => {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullMQAdapter(notificationQueue)],
    serverAdapter,
    options: {
      uiConfig: {
        boardTitle: 'Notification Service',
        boardLogo: {
          path: 'https://cdn-icons-png.flaticon.com/512/893/893257.png',
          width: 32,
          height: 32,
        },
      },
    },
  });

  // Mount BEFORE helmet/JSON to allow bull-board styles and assets
  app.use('/admin/queues', serverAdapter.getRouter());
};

/**
 * Middleware Stack
 */
app.use(cors());
app.use(express.static('public'));
setupQueueDashboard(app);

// Security Headers (configured for Bull Board compatibility)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "img-src": ["'self'", "data:", "https://cdn-icons-png.flaticon.com"]
    }
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * API Routes
 */

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Admin redirects
app.get('/admin', (_req: Request, res: Response) => res.redirect('/'));

// Queue Stats API
app.get('/api/stats', async (_req: Request, res: Response) => {
  try {
    const [counts, totalDelivered, totalFailed] = await Promise.all([
      notificationQueue.getJobCounts('completed', 'failed', 'waiting', 'active', 'delayed'),
      redisConfig.connection.get('ses:total_delivered'),
      redisConfig.connection.get('ses:total_failed')
    ]);

    res.json({ 
      success: true, 
      counts: {
        ...counts,
        completed: parseInt(totalDelivered || '0', 10),
        failed: parseInt(totalFailed || '0', 10)
      }
    });
  } catch (error) {
    logger.error('Failed to fetch queue stats:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Main Notification Endpoint
app.post('/v1/notify', sendNotification);

/**
 * Error Handling
 */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    logger.warn(`Malformed JSON: ${err.message}`);
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON payload.'
    });
  }

  logger.error(`Unhandled Error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ 
    success: false, 
    error: IS_PROD ? 'An internal error occurred' : err.message 
  });
});

/**
 * Server Lifecycle
 */
let server: any;

if (!IS_PROD || !IS_VERCEL) {
  server = app.listen(PORT, () => {
    logger.info(`🚀 Notification Manager running on port ${PORT}`);
    logger.info(`📍 API: http://localhost:${PORT}/v1/notify`);
    logger.info(`📊 Dashboard: http://localhost:${PORT}/admin/queues`);
  });
}

// Graceful Shutdown Logic
const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Closing resources...`);
  
  if (server) {
    server.close(() => logger.info('HTTP server closed.'));
  }

  try {
    // Gracefully shut down BullMQ worker
    await notificationWorker.close();
    logger.info('BullMQ worker closed.');
    
    // Close redis connection
    await redisConfig.connection.quit();
    logger.info('Redis connection closed.');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;
