const { query } = require('../../database/connection');

class ServicesController {
  constructor() {
    // Bind methods to ensure 'this' context is preserved
    this.getAllServices = this.getAllServices.bind(this);
    this.getService = this.getService.bind(this);
    this.createService = this.createService.bind(this);
    this.updateService = this.updateService.bind(this);
    this.deleteService = this.deleteService.bind(this);
    this.testService = this.testService.bind(this);
  }

  async getAllServices(req, res) {
    try {
      const result = await query(
        'SELECT id, name, type, host, port, enabled, created_at FROM services ORDER BY name'
      );

      const servicesWithStats = await Promise.all(
        result.rows.map(async (service) => {
          const statsResult = await query(
            'SELECT stats, fetched_at FROM service_stats WHERE service_id = $1 ORDER BY fetched_at DESC LIMIT 1',
            [service.id]
          );

          return {
            ...service,
            stats: statsResult.rows[0]?.stats || {},
            lastSeen: statsResult.rows[0]?.fetched_at || null,
            status: statsResult.rows[0] ? 'online' : 'unknown'
          };
        })
      );

      res.json({
        success: true,
        services: servicesWithStats
      });
    } catch (error) {
      console.error('getAllServices error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getService(req, res) {
    try {
      const { id } = req.params;
      const result = await query(
        'SELECT * FROM services WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Service not found'
        });
      }

      res.json({
        success: true,
        service: result.rows[0]
      });
    } catch (error) {
      console.error('getService error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async createService(req, res) {
    try {
      const { name, type, host, port, apiKey } = req.body;

      if (!name || !type || !host || !port) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: name, type, host, port'
        });
      }

      const testEndpoints = {
        radarr: '/api/v3/system/status',
        sonarr: '/api/v3/system/status',
        bazarr: '/api/v1/system/status',
        lidarr: '/api/v1/system/status',
        readarr: '/api/v1/system/status',
        prowlarr: '/api/v1/system/status'
      };

      const testEndpoint = testEndpoints[type] || '/api/system/status';

      const result = await query(
        `INSERT INTO services (name, type, host, port, api_key, test_endpoint) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, name, type, host, port, enabled, created_at`,
        [name, type, host, port, apiKey, testEndpoint]
      );

      res.status(201).json({
        success: true,
        service: result.rows[0]
      });
    } catch (error) {
      console.error('createService error:', error);
      if (error.code === '23505') {
        return res.status(400).json({
          success: false,
          error: 'A service with this name already exists'
        });
      }
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async updateService(req, res) {
    try {
      const { id } = req.params;
      const { name, host, port, apiKey, enabled } = req.body;

      const result = await query(
        `UPDATE services 
         SET name = COALESCE($2, name),
             host = COALESCE($3, host),
             port = COALESCE($4, port),
             api_key = COALESCE($5, api_key),
             enabled = COALESCE($6, enabled),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, name, type, host, port, enabled, updated_at`,
        [id, name, host, port, apiKey, enabled]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Service not found'
        });
      }

      res.json({
        success: true,
        service: result.rows[0]
      });
    } catch (error) {
      console.error('updateService error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async deleteService(req, res) {
    try {
      const { id } = req.params;
      
      const result = await query(
        'DELETE FROM services WHERE id = $1 RETURNING name',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Service not found'
        });
      }

      res.json({
        success: true,
        message: `Service "${result.rows[0].name}" deleted successfully`
      });
    } catch (error) {
      console.error('deleteService error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async testService(req, res) {
    console.log('testService called with:', req.body);
    try {
      const { type, host, port, apiKey } = req.body;

      if (!type || !host || !port) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: type, host, port'
        });
      }

      let service;
      try {
        console.log(`Loading service module: ${type}`);
        service = require(`../${type}/service`);
      } catch (error) {
        console.error(`Failed to load service module ${type}:`, error);
        return res.status(400).json({
          success: false,
          error: `Unsupported service type: ${type}`
        });
      }

      const config = {
        host,
        port,
        api_key: apiKey,
        testEndpoint: this.getTestEndpoint(type)
      };

      console.log('Testing connection with config:', { ...config, api_key: '***hidden***' });
      const result = await service.testConnection(config);
      console.log('Test result:', result);
      
      res.json(result);
    } catch (error) {
      console.error('testService error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        details: error.stack
      });
    }
  }

  getTestEndpoint(type) {
    const endpoints = {
      radarr: '/api/v3/system/status',
      sonarr: '/api/v3/system/status',
      bazarr: '/api/v1/system/status',
      lidarr: '/api/v1/system/status',
      readarr: '/api/v1/system/status',
      prowlarr: '/api/v1/system/status'
    };
    return endpoints[type] || '/api/system/status';
  }
}

module.exports = new ServicesController();
