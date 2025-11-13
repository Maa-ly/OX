import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/config.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';

// Import routes
import healthRoutes from './routes/health.js';
import oracleRoutes from './routes/oracle.js';
import metricsRoutes from './routes/metrics.js';
import walrusRoutes from './routes/walrus.js';
import contractRoutes from './routes/contract.js';

// Import services
import { OracleScheduler } from './services/scheduler.js';
import { MetricsCollectorService } from './services/metrics-collector.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/health', healthRoutes);
app.use('/api/oracle', oracleRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/walrus', walrusRoutes);
app.use('/api/contract', contractRoutes);

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
    // Initialize Metrics Collector
    metricsCollector = new MetricsCollectorService();
    
    // Set metrics collector in routes
    const { setMetricsCollector } = await import('./routes/oracle.js');
    setMetricsCollector(metricsCollector);
    
    // Initialize Oracle Scheduler
    scheduler = new OracleScheduler();
    await scheduler.initialize();

    // Start the server
    app.listen(PORT, () => {
      logger.info(`ODX Oracle Service running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Sui Network: ${config.sui.network}`);
      logger.info(`Walrus Context: ${config.walrus.context}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
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

