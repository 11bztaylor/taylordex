const { query } = require('../../database/connection');
const authService = require('../../auth/authService');
const logger = require('../../utils/logger');
const { ApiResponse } = require('../../utils/apiResponse');

class ServicesController {
  constructor() {
    // Bind methods to ensure 'this' context is preserved
    this.getAllServices = this.getAllServices.bind(this);
    this.getService = this.getService.bind(this);
    this.getServiceStats = this.getServiceStats.bind(this);
    this.createService = this.createService.bind(this);
    this.updateService = this.updateService.bind(this);
    this.deleteService = this.deleteService.bind(this);
    this.testService = this.testService.bind(this);
  }

  async getAllServices(req, res) {
    try {
      // Simplified logging
      logger.info(`Fetching services for user: ${req.user?.username || 'anonymous'}`);
      
      // Get all services with metadata and group info
      const result = await query(
        'SELECT id, name, type, host, port, enabled, created_at, metadata, group_name FROM services ORDER BY name'
      );

      logger.debug(`Found ${result.rows.length} services`, {
        user: req.user?.username,
        role: req.user?.role
      });

      // Simplified RBAC - for now, admin sees all, others see enabled services only
      let filteredServices = result.rows;
      
      if (req.user?.role !== 'admin') {
        // Non-admin users only see enabled services
        filteredServices = result.rows.filter(service => service.enabled !== false);
        logger.debug(`Filtered to ${filteredServices.length} enabled services for non-admin user`);
      }

      const servicesWithStats = await this.addStatsToServices(filteredServices);
      
      return res.success(
        { services: servicesWithStats },
        `Found ${servicesWithStats.length} services`,
        { count: servicesWithStats.length, role: req.user?.role || 'anonymous' }
      );
    } catch (error) {
      logger.error('Failed to get services', { 
        error: error.message,
        user: req.user?.username 
      });
      return res.error('Failed to fetch services', 'DATABASE_ERROR', 500);
    }
  }

  // Helper method to add stats to services
  async addStatsToServices(services) {
    return await Promise.all(
      services.map(async (service) => {
        const statsResult = await query(
          'SELECT stats, fetched_at FROM service_stats WHERE service_id = $1 ORDER BY fetched_at DESC LIMIT 1',
          [service.id]
        );

        return {
          ...service,
          stats: statsResult.rows[0]?.stats || {},
          lastSeen: statsResult.rows[0]?.fetched_at || null,
          status: statsResult.rows[0] ? 'online' : 'unknown',
          // Include metadata and group for frontend
          group: service.group_name,
          tags: service.metadata?.tags || []
        };
      })
    );
  }

  async getService(req, res) {
    try {
      const { id } = req.params;
      const result = await query(
        'SELECT * FROM services WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.notFound('Service');
      }

      return res.success(result.rows[0], 'Service retrieved successfully');
    } catch (error) {
      logger.error('getService error', { error: error.message });
      return res.error('Failed to retrieve service', 'DATABASE_ERROR', 500);
    }
  }

  async getServiceStats(req, res) {
    try {
      const { id } = req.params;
      
      // Check if user has permission to view this service
      const serviceResult = await query('SELECT * FROM services WHERE id = $1', [id]);
      
      if (serviceResult.rows.length === 0) {
        return res.notFound('Service');
      }

      const service = serviceResult.rows[0];

      // Simplified RBAC: Non-admin users only see enabled services
      if (req.user?.role !== 'admin' && service.enabled === false) {
        return res.forbidden('Access denied to disabled service');
      }

      // Get latest stats from service_stats table
      const statsResult = await query(
        'SELECT stats, fetched_at FROM service_stats WHERE service_id = $1 ORDER BY fetched_at DESC LIMIT 1',
        [id]
      );

      const stats = statsResult.rows[0] || { stats: {}, fetched_at: null };

      return res.success({
        service: {
          id: service.id,
          name: service.name,
          type: service.type,
          status: statsResult.rows.length > 0 ? 'online' : 'unknown'
        },
        stats: stats.stats,
        lastUpdated: stats.fetched_at
      }, 'Service stats retrieved successfully');
    } catch (error) {
      logger.error('getServiceStats error', { error: error.message });
      return res.error('Failed to retrieve service stats', 'DATABASE_ERROR', 500);
    }
  }

  async createService(req, res) {
    try {
      const { name, type, host, port, apiKey } = req.body;
      
      logger.info('📝 Creating new service', {
        user: req.user?.username,
        serviceName: name,
        serviceType: type,
        host: host,
        port: port,
        hasApiKey: !!apiKey,
        requestBody: { name, type, host, port, apiKey: apiKey ? '[REDACTED]' : null }
      });

      if (!name || !type || !host || !port) {
        logger.warn('❌ Service creation failed - missing required fields', {
          user: req.user?.username,
          providedFields: { name: !!name, type: !!type, host: !!host, port: !!port }
        });
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
        prowlarr: '/api/v1/system/status',
        plex: '/identity',
        unraid: '/graphql'
      };

      const testEndpoint = testEndpoints[type] || '/api/system/status';
      
      logger.debug('📝 Service creation - determining test endpoint', {
        serviceType: type,
        testEndpoint: testEndpoint,
        knownType: !!testEndpoints[type]
      });

      logger.debug('📝 Service creation - inserting into database', {
        user: req.user?.username,
        serviceName: name,
        serviceType: type,
        endpoint: `${host}:${port}`,
        testEndpoint: testEndpoint
      });

      const result = await query(
        `INSERT INTO services (name, type, host, port, api_key, test_endpoint) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, name, type, host, port, enabled, created_at`,
        [name, type, host, port, apiKey, testEndpoint]
      );
      
      logger.info('✅ Service created successfully', {
        user: req.user?.username,
        serviceId: result.rows[0].id,
        serviceName: result.rows[0].name,
        serviceType: result.rows[0].type,
        enabled: result.rows[0].enabled
      });

      res.status(201).json({
        success: true,
        service: result.rows[0]
      });
    } catch (error) {
      logger.error('createService error', { error: error.message, stack: error.stack });
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
      logger.error('updateService error', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async deleteService(req, res) {
    try {
      const { id } = req.params;
      
      // First check if service exists and get ownership info
      const serviceCheck = await query('SELECT name FROM services WHERE id = $1', [id]);
      if (serviceCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Service not found'
        });
      }
      
      const serviceName = serviceCheck.rows[0].name;
      
      // RBAC: Check if user can delete this service
      // Get resource info to check ownership
      const resourceCheck = await query('SELECT created_by FROM resources WHERE legacy_service_id = $1', [id]);
      
      if (resourceCheck.rows.length > 0 && req.user?.role !== 'admin') {
        // Non-admin users can only delete services they created
        if (resourceCheck.rows[0].created_by !== req.user?.id) {
          logger.warn(`🔐 Service deletion denied`, { 
            serviceId: id, 
            serviceName: serviceName,
            user: req.user?.username,
            owner: resourceCheck.rows[0].created_by,
            reason: 'insufficient_permissions'
          });
          return res.status(403).json({
            success: false,
            error: 'You can only delete services you created, or contact an admin'
          });
        }
      }
      
      // Delete related resources first to avoid foreign key constraint violation
      await query('DELETE FROM resources WHERE legacy_service_id = $1', [id]);
      
      // Delete related service_stats
      await query('DELETE FROM service_stats WHERE service_id = $1', [id]);
      
      // Finally delete the service
      await query('DELETE FROM services WHERE id = $1', [id]);

      logger.info(`✅ Service deleted successfully`, { 
        serviceId: id, 
        serviceName: serviceName,
        user: req.user?.username 
      });

      res.json({
        success: true,
        message: `Service "${serviceName}" deleted successfully`
      });
    } catch (error) {
      logger.error('deleteService error', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async testService(req, res) {
    logger.debug('testService called', { body: req.body });
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
        logger.debug(`Loading service module: ${type}`);
        service = require(`../${type}/service`);
      } catch (error) {
        logger.error(`Failed to load service module ${type}`, { error: error.message });
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

      logger.debug('Testing connection with config', { ...config, api_key: '***hidden***' });
      const result = await service.testConnection(config);
      logger.debug('Test result', { result });
      
      res.json(result);
    } catch (error) {
      logger.error('testService error', { error: error.message, stack: error.stack });
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
      prowlarr: '/api/v1/system/status',
      plex: '/identity',
      unraid: '/graphql'
    };
    return endpoints[type] || '/api/system/status';
  }
}

module.exports = new ServicesController();
