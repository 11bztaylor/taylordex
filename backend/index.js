const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initializeDatabase } = require('./src/database/connection');

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'TaylorDex Backend',
    version: '1.0.0',
    modules: ['services', 'radarr', 'sonarr', 'plex', 'prowlarr'] 
  });
});

// Import routes
const servicesRoutes = require('./src/modules/services/routes');
const radarrRoutes = require('./src/modules/radarr/routes');
const sonarrRoutes = require('./src/modules/sonarr/routes');
const plexRoutes = require('./src/modules/plex/routes');
const prowlarrRoutes = require('./src/modules/prowlarr/routes');

// Mount routes
app.use('/api/services', servicesRoutes);
app.use('/api/radarr', radarrRoutes);
app.use('/api/sonarr', sonarrRoutes);
app.use('/api/plex', plexRoutes);
app.use('/api/prowlarr', prowlarrRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
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
    
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║       TaylorDex Backend Started        ║
╠════════════════════════════════════════╣
║ Port: ${PORT}                            ║
║ Database: Connected                    ║
║ Modules: services, radarr, sonarr      ║
║          plex, prowlarr                ║
╚════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
