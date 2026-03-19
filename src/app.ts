import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { sendNotification } from './controllers/notificationController';
import logger from './utils/logger';
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { notificationQueue } from './queues/notificationQueue';
import { redisConfig } from './config/redis';
const app = express();

app.use(cors());

// Setup Bull-Board for queue UI
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [new BullMQAdapter(notificationQueue)],
  serverAdapter: serverAdapter,
  options: {
    uiConfig: {
      boardTitle: 'Notification Service',
      boardLogo: {
        path: 'https://cdn-icons-png.flaticon.com/512/893/893257.png', // Temporary professional icon
        width: 32,
        height: 32,
      },
    },
  },
});

// Serve frontend static files
app.use(express.static('public'));

// Mount bull-board early to bypass helmet's strict CSP restrictions for this route
app.use('/admin/queues', serverAdapter.getRouter());

// Stats API for custom dashboard
app.get('/api/stats', async (req, res) => {
  try {
    const counts = await notificationQueue.getJobCounts('completed', 'failed', 'waiting', 'active', 'delayed');
    const totalDelivered = await redisConfig.connection.get('ses:total_delivered') || '0';
    const totalFailed = await redisConfig.connection.get('ses:total_failed') || '0';

    res.json({ 
      success: true, 
      counts: {
        ...counts,
        completed: parseInt(totalDelivered),
        failed: parseInt(totalFailed)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch queue stats' });
  }
});

app.get('/admin', (req, res) => res.redirect('/'));

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Notification endpoint
app.post('/v1/notify', sendNotification);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    logger.warn(`Malformed JSON received: ${err.message}`);
    res.status(400).json({
      success: false,
      error: 'Invalid JSON payload received. Make sure you are not sending the curl command text as the request body.'
    });
    return;
  }

  logger.error(`Error processing request: ${err.message}`);
  res.status(500).json({ success: false, error: 'Something went wrong' });
});

export default app;
