import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/config.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { findAvailablePort } from './utils/port-finder.js';

// Import routes
import healthRoutes from './routes/health.js';
import oracleRoutes from './routes/oracle.js';
import metricsRoutes from './routes/metrics.js';
import walrusRoutes from './routes/walrus.js';
import contractRoutes from './routes/contract.js';
import nautilusRoutes from './routes/nautilus.js';

// Import services
import { OracleScheduler } from './services/scheduler.js';
import { MetricsCollectorService } from './services/metrics-collector.js';

const app = express();
const DEFAULT_PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(helmet());

// CORS configuration - allow frontend domains
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://ox-gold.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    const isAllowed = allowedOrigins.includes(origin) || 
                     origin.endsWith('.vercel.app') || // Allow all Vercel preview deployments
                     origin.endsWith('.vercel-dns.com'); // Allow Vercel custom domains
    
    // In development, allow all origins for easier testing
    if (isAllowed || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/health', healthRoutes);
app.use('/api/oracle', oracleRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/walrus', walrusRoutes);
app.use('/api/contract', contractRoutes);
app.use('/api/nautilus', nautilusRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'ODX Oracle Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      oracle: '/api/oracle',
      metrics: '/api/metrics',
      walrus: '/api/walrus',
      contract: '/api/contract',
      nautilus: '/api/nautilus',
    },
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize scheduler and metrics collector
let scheduler = null;
let metricsCollector = null;

async function startServer() {
  try {
    logger.info('Starting ODX Oracle Service...');
    
    const PORT = await findAvailablePort(DEFAULT_PORT);
    
    if (PORT !== DEFAULT_PORT) {
      logger.info(`Port ${DEFAULT_PORT} is in use, using port ${PORT} instead`);
    } else {
      logger.info(`Using port ${PORT}`);
    }
    
    // Initialize Metrics Collector
    metricsCollector = new MetricsCollectorService();
    logger.info('Metrics Collector initialized');
    
    // Set metrics collector in routes
    const { setMetricsCollector: setOracleMetricsCollector } = await import('./routes/oracle.js');
    const { setMetricsCollector: setNautilusMetricsCollector } = await import('./routes/nautilus.js');
    setOracleMetricsCollector(metricsCollector);
    setNautilusMetricsCollector(metricsCollector);
    logger.info('Routes configured');
    
    try {
      scheduler = new OracleScheduler();
      await scheduler.initialize();
      logger.info('Oracle Scheduler initialized');
    } catch (schedulerError) {
      logger.warn('Oracle Scheduler initialization failed (this is OK if smart contracts are not deployed yet):', schedulerError.message);
    }

    // Start the server on the available port
    const server = app.listen(PORT, () => {
      logger.info(`ODX Oracle Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Sui Network: ${config.sui.network}`);
      logger.info(`Walrus Context: ${config.walrus.context}`);
      logger.info('Server is ready to accept requests');
    });

    server.on('error', (error) => {
      logger.error('Server error:', error);
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    logger.error('Error stack:', error.stack);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      throw error;
    }
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  if (scheduler) {
    await scheduler.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  if (scheduler) {
    await scheduler.stop();
  }
  process.exit(0);
});

// Start the server
startServer();

