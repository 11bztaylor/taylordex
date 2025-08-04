const express = require('express');
const router = express.Router();
const { query } = require('../../database/connection');
const axios = require('axios');

// Test each Radarr endpoint individually
router.get('/:id/test-endpoints', async (req, res) => {
  try {
    const { id } = req.params;
    
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

    const results = {};
    
    // Test each endpoint
    const tests = [
      { name: 'movies', url: '/api/v3/movie', desc: 'Get all movies' },
      { name: 'queue', url: '/api/v3/queue', desc: 'Download queue' },
      { name: 'calendar', url: '/api/v3/calendar', desc: 'Upcoming releases' },
      { name: 'history', url: '/api/v3/history?pageSize=10', desc: 'Recent history' },
      { name: 'health', url: '/api/v3/health', desc: 'Health checks' },
      { name: 'diskspace', url: '/api/v3/diskspace', desc: 'Disk space' },
      { name: 'systemStatus', url: '/api/v3/system/status', desc: 'System status' }
    ];

    for (const test of tests) {
      try {
        console.log(`Testing ${test.name}: ${baseUrl}${test.url}`);
        const start = Date.now();
        const response = await axios.get(`${baseUrl}${test.url}`, { 
          headers,
          timeout: 10000 
        });
        const duration = Date.now() - start;
        
        results[test.name] = {
          success: true,
          duration: `${duration}ms`,
          dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
          count: Array.isArray(response.data) ? response.data.length : null,
          sample: Array.isArray(response.data) ? response.data[0] : response.data
        };
      } catch (error) {
        results[test.name] = {
          success: false,
          error: error.message,
          status: error.response?.status,
          data: error.response?.data
        };
      }
    }

    res.json({
      service: config.name,
      baseUrl,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
