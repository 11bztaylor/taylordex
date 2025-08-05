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
    modules: ['services', 'radarr', 'sonarr', 'plex', 'prowlarr', 'lidarr', 'unraid', 'homeassistant', 'discovery', 'logs', 'docker'] 
  });
});

// Import routes
const servicesRoutes = require('./src/modules/services/routes');
const radarrRoutes = require('./src/modules/radarr/routes');
const sonarrRoutes = require('./src/modules/sonarr/routes');
const plexRoutes = require('./src/modules/plex/routes');
const prowlarrRoutes = require('./src/modules/prowlarr/routes');
const lidarrRoutes = require('./src/modules/lidarr/routes');
const unraidRoutes = require('./src/modules/unraid/routes');
const homeAssistantRoutes = require('./src/modules/homeassistant/routes');
const discoveryRoutes = require('./src/modules/discovery/routes');
const logRoutes = require('./src/modules/logs/routes');
const dockerRoutes = require('./src/modules/docker/routes');

// Mount routes
app.use('/api/services', servicesRoutes);
app.use('/api/radarr', radarrRoutes);
app.use('/api/sonarr', sonarrRoutes);
app.use('/api/plex', plexRoutes);
app.use('/api/prowlarr', prowlarrRoutes);
app.use('/api/lidarr', lidarrRoutes);
app.use('/api/unraid', unraidRoutes);
app.use('/api/homeassistant', homeAssistantRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/docker', dockerRoutes);

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
║          plex, prowlarr, lidarr        ║
║          unraid, homeassistant         ║
║          discovery, logs, docker       ║
╚════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
