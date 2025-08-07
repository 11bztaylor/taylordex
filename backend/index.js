const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

// Global error handlers - prevent backend crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - log and continue for stability
});

process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  // This is more serious - log and restart gracefully
  if (process.env.NODE_ENV === 'production') {
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }
});

const { initializeDatabase } = require('./src/database/connection');
const authService = require('./src/auth/authService');
const logger = require('./src/utils/logger');
const requestLogger = require('./src/middleware/requestLogger');
const statsCollector = require('./src/utils/statsCollector');
const { addResponseHelpers } = require('./src/utils/apiResponse');
const plexDuplicateScheduler = require('./src/schedulers/plexDuplicateScheduler');

const app = express();

// Async route wrapper to catch errors automatically
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// CORS configuration with specific origins
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000', 'https://localhost'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// Add response helpers for consistent API responses
app.use(addResponseHelpers);

// Add request logging middleware
app.use(requestLogger);

// Session configuration (for optional SSO)
if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required for security');
}
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Health check endpoint (use asyncHandler as example)
app.get('/api/health', asyncHandler(async (req, res) => {
  res.success({ 
    status: 'OK', 
    service: 'TaylorDx Backend',
    version: '1.0.0',
    modules: ['services', 'radarr', 'sonarr', 'plex', 'prowlarr', 'lidarr', 'unraid', 'homeassistant', 'discovery', 'logs', 'docker'] 
  }, 'System is healthy');
}));

// Export asyncHandler for use in other modules
module.exports = { asyncHandler };

// Import routes
const authRoutes = require('./src/auth/routes');
const authTestRoutes = require('./src/auth/testRoutes');
const servicesRoutes = require('./src/modules/services/routes');
const radarrRoutes = require('./src/modules/radarr/routes');
const sonarrRoutes = require('./src/modules/sonarr/routes');
const plexRoutes = require('./src/modules/plex/routes');
const prowlarrRoutes = require('./src/modules/prowlarr/routes');
const lidarrRoutes = require('./src/modules/lidarr/routes');
const unraidRoutes = require('./src/modules/unraid/routes');
const homeAssistantRoutes = require('./src/modules/homeassistant/routes');
const qbittorrentRoutes = require('./src/modules/qbittorrent/routes');
const discoveryRoutes = require('./src/modules/discovery/routes');
const logRoutes = require('./src/modules/logs/routes');
const dockerRoutes = require('./src/modules/docker/routes');
const resourceRoutes = require('./src/modules/resources/routes');
const userRoutes = require('./src/modules/users/routes');

// Mount routes
app.use('/api/auth/test', authTestRoutes); // Test routes first (unprotected)
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/radarr', radarrRoutes);
app.use('/api/sonarr', sonarrRoutes);
app.use('/api/plex', plexRoutes);
app.use('/api/prowlarr', prowlarrRoutes);
app.use('/api/lidarr', lidarrRoutes);
app.use('/api/unraid', unraidRoutes);
app.use('/api/homeassistant', homeAssistantRoutes);
app.use('/api/qbittorrent', qbittorrentRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/docker', dockerRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/users', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  // Log full error details internally
  logger.error('Express error handler', { 
    error: err.message, 
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  // Send safe error response (don't expose internals in production)
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'An error occurred' 
    : err.message;
  
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: err.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

const PORT = process.env.PORT || 5000;

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    
    // Check for first-run setup
    const isFirstRun = await authService.isFirstRun();
    const authEnabled = await authService.getAuthSetting('auth_enabled');
    
    if (isFirstRun && authEnabled === 'true') {
      logger.info('🔐 First-run detected - authentication setup required');
      logger.info('🌐 Visit http://localhost:' + PORT + '/api/auth/setup to complete setup');
    } else if (authEnabled === 'false') {
      logger.info('⚠️  Authentication disabled - single user mode');
    }
    
    app.listen(PORT, async () => {
      logger.info(`
╔════════════════════════════════════════╗
║       TaylorDex Backend Started        ║
╠════════════════════════════════════════╣
║ Port: ${PORT}                            ║
║ Database: Connected                    ║
║ Auth: ${authEnabled === 'true' ? 'Enabled' : 'Disabled'}                     ║
║ Modules: services, radarr, sonarr      ║
║          plex, prowlarr, lidarr        ║
║          unraid, homeassistant         ║
║          discovery, logs, docker, auth ║
║ Stats: Starting collector...           ║
╚════════════════════════════════════════╝
      `);
      
      // Start stats collection
      try {
        await statsCollector.start();
        logger.info('✅ Stats collector started successfully');
      } catch (error) {
        logger.error('❌ Failed to start stats collector', { error: error.message });
      }

      // Start Plex duplicate background scheduler
      try {
        plexDuplicateScheduler.start();
        logger.info('🕒 Plex duplicate scheduler started - scans daily at 3 AM');
      } catch (error) {
        logger.error('❌ Failed to start Plex duplicate scheduler', { error: error.message });
      }
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

startServer();
