import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { checkDatabaseConnection } from './lib/db';
import { logger } from './lib/logger';
import { sendError, ErrorCodes } from './lib/response';
import conversationsRouter from './routes/conversations';
import adminRouter from './routes/admin';

export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  const corsOrigins = process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:5173',
    'http://localhost:5174',
  ];

  app.use(cors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // Structured request logging
  app.use(pinoHttp({
    logger,
    customLogLevel: (_req, res, error) => {
      if (res.statusCode >= 500 || error) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (req, res) => {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },
    customErrorMessage: (req, res) => {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },
    // Don't log health check requests to reduce noise
    autoLogging: {
      ignore: (req) => req.url === '/health/live',
    },
  }));

  // Body parsing
  app.use(express.json({ limit: '1mb' }));

  // Health check endpoints
  app.get('/health', async (_req, res) => {
    const dbConnected = await checkDatabaseConnection();

    const health = {
      status: dbConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      services: {
        database: dbConnected ? 'connected' : 'disconnected',
      },
    };

    res.status(dbConnected ? 200 : 503).json(health);
  });

  app.get('/health/live', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API info endpoint (nginx strips /api, so this becomes /v1)
  app.get('/v1', (_req, res) => {
    res.json({
      name: 'Sporttia ZERO API',
      version: '0.1.0',
      status: 'running',
    });
  });

  // API Routes
  // Note: nginx proxy strips /api prefix, so routes are mounted without it
  app.use('/conversations', conversationsRouter);
  app.use('/admin', adminRouter);

  // 404 handler for unmatched routes
  app.use('*', (_req, res) => {
    sendError(res, ErrorCodes.NOT_FOUND, 'Endpoint not found', 404);
  });

  // Global error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ error: err.message, stack: err.stack }, 'Unhandled error');
    sendError(res, ErrorCodes.INTERNAL_ERROR, 'Internal server error', 500);
  });

  return app;
}
