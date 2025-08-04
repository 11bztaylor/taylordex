const express = require('express');
const router = express.Router();
const { query } = require('../../database/connection');
const axios = require('axios');

// Debug endpoint to see raw Radarr API responses
router.get('/:id/debug', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get service config
    const result = await query(
      'SELECT * FROM services WHERE id = $1 AND type = $2',
      [id, 'radarr']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Radarr service not found' });
    }

    const config = result.rows[0];
    const baseUrl = `http${config.port === 443 ? 's' : ''}://${config.host}:${config.port}`;
    const headers = { 'X-Api-Key': config.api_key };

    // Get various endpoints
    const endpoints = {
      systemStatus: '/api/v3/system/status',
      movies: '/api/v3/movie',
      queue: '/api/v3/queue',
      calendar: '/api/v3/calendar',
      history: '/api/v3/history',
      diskspace: '/api/v3/diskspace',
      health: '/api/v3/health',
      qualityProfile: '/api/v3/qualityprofile',
      rootFolder: '/api/v3/rootfolder',
      importList: '/api/v3/importlist',
      notification: '/api/v3/notification',
      tag: '/api/v3/tag'
    };

    const results = {};
    
    // Try each endpoint
    for (const [name, endpoint] of Object.entries(endpoints)) {
      try {
        console.log(`Fetching ${name} from ${baseUrl}${endpoint}`);
        const response = await axios.get(`${baseUrl}${endpoint}`, { headers });
        
        // Limit movie data to first 5 for readability
        if (name === 'movies' && Array.isArray(response.data)) {
          results[name] = {
            total: response.data.length,
            sample: response.data.slice(0, 5),
            fields: response.data[0] ? Object.keys(response.data[0]) : []
          };
        } else {
          results[name] = response.data;
        }
      } catch (error) {
        results[name] = {
          error: error.message,
          status: error.response?.status
        };
      }
    }

    res.json({
      service: {
        name: config.name,
        host: config.host,
        port: config.port
      },
      endpoints: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
