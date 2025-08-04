const radarrService = require('./service');
const { query } = require('../../database/connection');

class RadarrController {
  // Test connection to Radarr
  async testConnection(req, res) {
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
        api_key: apiKey,
        testEndpoint: '/api/v3/system/status'
      };

      const result = await radarrService.testConnection(config);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get stats for a saved Radarr instance
  async getStats(req, res) {
    try {
      const { id } = req.params;
      
      // Get service config from database
      const result = await query(
        'SELECT * FROM services WHERE id = $1 AND type = $2',
        [id, 'radarr']
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Radarr service not found'
        });
      }

      const config = result.rows[0];
      const stats = await radarrService.getStats(config);

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
  }

  // Get recent activity
  async getActivity(req, res) {
    try {
      const { id } = req.params;
      const { limit = 10 } = req.query;

      const result = await query(
        'SELECT * FROM services WHERE id = $1 AND type = $2',
        [id, 'radarr']
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Radarr service not found'
        });
      }

      const config = result.rows[0];
      const activity = await radarrService.getRecentActivity(config, limit);

      res.json({
        success: true,
        activity
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get download queue
  async getQueue(req, res) {
    try {
      const { id } = req.params;

      const result = await query(
        'SELECT * FROM services WHERE id = $1 AND type = $2',
        [id, 'radarr']
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Radarr service not found'
        });
      }

      const config = result.rows[0];
      const queue = await radarrService.getQueue(config);

      res.json({
        success: true,
        queue
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new RadarrController();
