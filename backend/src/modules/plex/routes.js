const express = require('express');
const router = express.Router();
const plexService = require('./service');
const { query } = require('../../database/connection');
const { authenticateToken, requireRole } = require('../../auth/middleware');

// Apply authentication to all routes
router.use(authenticateToken);

// Test Plex connection
router.post('/test', requireRole('user'), async (req, res) => {
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
    console.error('Plex connection test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test Plex connection'
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
    console.error('Plex stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Plex stats'
    });
  }
});

// Get duplicates for a specific Plex instance
router.get('/:id/duplicates', requireRole('user'), async (req, res) => {
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
    const duplicates = await plexService.getDuplicates(config);

    res.json({
      success: true,
      ...duplicates,
      service: {
        id: config.id,
        name: config.name,
        host: config.host,
        port: config.port
      }
    });
  } catch (error) {
    console.error('Plex duplicates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Plex duplicates'
    });
  }
});

// Delete a specific duplicate item
router.delete('/:id/duplicates/:ratingKey', requireRole('admin'), async (req, res) => {
  try {
    const { id, ratingKey } = req.params;
    
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
    const deleteResult = await plexService.deleteDuplicate(config, ratingKey);

    res.json(deleteResult);
  } catch (error) {
    console.error('Plex delete duplicate error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete Plex duplicate'
    });
  }
});

module.exports = router;
