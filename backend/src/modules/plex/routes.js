const express = require('express');
const router = express.Router();
const plexService = require('./service');
const { query } = require('../../database/connection');

// Test Plex connection
router.post('/test', async (req, res) => {
  try {
    const { host, port, apiKey } = req.body;
    
    if (!host || !port || !apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: host, port, apiKey'
      });
    }

    const config = {
      host,
      port,
      api_key: apiKey
    };

    const result = await plexService.testConnection(config);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get stats for a specific Plex instance
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get service config from database
    const result = await query(
      'SELECT * FROM services WHERE id = $1 AND type = $2',
      [id, 'plex']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Plex service not found'
      });
    }

    const config = result.rows[0];
    const stats = await plexService.getStats(config);

    // Cache stats in database
    await query(
      'INSERT INTO service_stats (service_id, stats) VALUES ($1, $2)',
      [id, JSON.stringify(stats)]
    );

    res.json({
      success: true,
      stats,
      service: {
        id: config.id,
        name: config.name,
        host: config.host,
        port: config.port
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
