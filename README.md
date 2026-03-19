# Notification Manager (DS-SES)

A production-ready notification backend built with Express, BullMQ, and Redis.

## Architecture
- **Express API**: Handles incoming notification requests.
- **BullMQ**: Manages job queues for background processing, ensuring reliable delivery with retries and backoff.
- **Redis**: Persistent storage for BullMQ and worker coordination.
- **Workers**: Asynchronously process jobs and dispatch notifications via Email, SMS, and WhatsApp.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env`:
   ```env
   PORT=3000
   REDIS_URL="your-redis-url"
   NODE_ENV=development
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

4. Build and run in production:
   ```bash
   npm run build
   npm start
   ```

## API Endpoint

### POST `/v1/notify`

**Sample Payload:**
```json
{
  "type": "EMAIL",
  "template": "WELCOME_USER",
  "to": "user@email.com",
  "data": {
    "name": "Dhana"
  }
}
```

**Types Supported:** `EMAIL`, `SMS`, `WHATSAPP`

## Implementation Details
- **Reliability**: Jobs are automatically retried up to 3 times with exponential backoff on failure.
- **Security**: Includes `helmet` and `cors` middlewares.
- **Validation**: Strict schema validation using `zod`.
- **Logging**: JSON-based logging with `winston` for better observability.
