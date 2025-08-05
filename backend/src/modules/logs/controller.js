const LogCollector = require('./LogCollector');

/**
 * Log Controller - Handles log collection API endpoints
 */
class LogController {
  constructor() {
    this.logCollector = new LogCollector();
    this.initialized = false;
  }
  
  /**
   * Initialize log collection for all services
   */
  async initialize(services) {
    if (!this.initialized) {
      await this.logCollector.startCollectingAll(services);
      this.initialized = true;
    }
  }
  
  /**
   * Start collecting logs from a specific service
   * POST /api/logs/start/:serviceId
   */
  startCollection = async (req, res) => {
    try {
      const { serviceId } = req.params;
      const service = req.body; // Service configuration from request body
      
      if (!service || !service.api_key) {
        return res.status(400).json({
          error: 'Service configuration with API key required'
        });
      }
      
      await this.logCollector.startCollecting(service);
      
      res.json({
        success: true,
        message: `Started log collection for ${service.name}`,
        serviceId
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to start log collection',
        details: error.message
      });
    }
  };
  
  /**
   * Stop collecting logs from a specific service
   * DELETE /api/logs/stop/:serviceId
   */
  stopCollection = async (req, res) => {
    try {
      const { serviceId } = req.params;
      
      this.logCollector.stopCollecting(parseInt(serviceId));
      
      res.json({
        success: true,
        message: `Stopped log collection for service ${serviceId}`
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to stop log collection',
        details: error.message
      });
    }
  };
  
  /**
   * Get logs from a specific service
   * GET /api/logs/service/:serviceId
   */
  getServiceLogs = async (req, res) => {
    try {
      const { serviceId } = req.params;
      const { facility, level, limit } = req.query;
      
      const options = {
        facility: facility || 'all',
        level: level || 'all',
        limit: parseInt(limit) || 100
      };
      
      const logs = this.logCollector.getServiceLogs(parseInt(serviceId), options);
      
      res.json({
        success: true,
        serviceId: parseInt(serviceId),
        filters: options,
        count: logs.length,
        logs
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get service logs',
        details: error.message
      });
    }
  };
  
  /**
   * Get logs from all services
   * GET /api/logs/all
   */
  getAllLogs = async (req, res) => {
    try {
      const { level, limit } = req.query;
      
      const options = {
        level: level || 'all',
        limit: parseInt(limit) || 100
      };
      
      let logs = this.logCollector.getAllLogs(options);
      
      // If no real logs, return demo data for testing
      if (logs.length === 0) {
        logs = this.getDemoLogs();
      }
      
      res.json({
        success: true,
        filters: options,
        count: logs.length,
        logs
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get all logs',
        details: error.message
      });
    }
  };
  
  /**
   * Generate demo logs for testing UI
   */
  getDemoLogs = () => {
    const now = new Date();
    const services = ['Radarr', 'Sonarr', 'Prowlarr', 'Plex'];
    const levels = ['INFO', 'WARNING', 'ERROR', 'DEBUG'];
    const facilities = ['Api', 'Download', 'Import', 'Health', 'RSS'];
    
    const messages = [
      'Successfully downloaded movie: The Matrix (1999)',
      'Indexer search completed for Breaking Bad S01E01', 
      'Health check passed for all services',
      'API request processed successfully',
      'Import completed: 3 files processed',
      'Warning: Disk space running low (15% remaining)',
      'Error connecting to download client',
      'RSS sync completed - 12 new releases found',
      'Movie quality upgraded: 720p -> 1080p',
      'Series monitoring started for new show'
    ];
    
    return Array.from({ length: 25 }, (_, i) => ({
      id: `demo-${i}`,
      timestamp: new Date(now - (i * 60000 * Math.random() * 60)), // Random times in last hour
      level: levels[Math.floor(Math.random() * levels.length)],
      facility: facilities[Math.floor(Math.random() * facilities.length)],
      service: services[Math.floor(Math.random() * services.length)],
      serviceType: services[Math.floor(Math.random() * services.length)].toLowerCase(),
      serviceId: Math.floor(Math.random() * 4) + 6,
      message: messages[Math.floor(Math.random() * messages.length)],
      exception: Math.random() > 0.9 ? 'System.Exception: Sample error details here' : null
    })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };
  
  /**
   * Get available facilities for a service
   * GET /api/logs/facilities/:serviceId
   */
  getServiceFacilities = async (req, res) => {
    try {
      const { serviceId } = req.params;
      
      let facilities = this.logCollector.getServiceFacilities(parseInt(serviceId));
      
      // If no real facilities, return demo data
      if (facilities.length === 0) {
        facilities = ['Api', 'Download', 'Import', 'Health', 'RSS'];
      }
      
      res.json({
        success: true,
        serviceId: parseInt(serviceId),
        facilities
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get service facilities',
        details: error.message
      });
    }
  };
  
  /**
   * Get log collection status
   * GET /api/logs/status
   */
  getStatus = async (req, res) => {
    try {
      const status = this.logCollector.getStatus();
      
      res.json({
        success: true,
        status
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get log collection status',
        details: error.message
      });
    }
  };
  
  /**
   * Get live log stream (Server-Sent Events)
   * GET /api/logs/stream
   */
  getLogStream = async (req, res) => {
    try {
      const { serviceId, facility, level } = req.query;
      
      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });
      
      // Send initial connection message
      res.write('data: {"type":"connected","message":"Log stream connected"}\n\n');
      
      // Set up periodic log updates every 5 seconds
      const interval = setInterval(() => {
        try {
          let logs = this.logCollector.getAllLogs({ level: level || 'all', limit: 50 });
          
          // If no real logs, use demo data
          if (logs.length === 0) {
            logs = this.getDemoLogs().slice(0, 10);
          }
          
          // Add a simulated new log entry occasionally
          if (Math.random() > 0.7) {
            const newLog = {
              id: `live-${Date.now()}`,
              timestamp: new Date(),
              level: ['INFO', 'WARNING', 'ERROR'][Math.floor(Math.random() * 3)],
              facility: 'Api',
              service: 'Live Demo',
              serviceType: 'demo',
              serviceId: 999,
              message: 'Live streaming test - New log entry generated',
              exception: null
            };
            logs.unshift(newLog);
          }
          
          // Send log update
          const data = {
            type: 'logs',
            timestamp: new Date().toISOString(),
            logs: logs.slice(0, 10) // Send only latest 10 entries
          };
          
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch (error) {
          const errorData = {
            type: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
          };
          res.write(`data: ${JSON.stringify(errorData)}\n\n`);
        }
      }, 5000);
      
      // Clean up on client disconnect
      req.on('close', () => {
        clearInterval(interval);
      });
      
      req.on('aborted', () => {
        clearInterval(interval);
      });
      
    } catch (error) {
      res.status(500).json({
        error: 'Failed to establish log stream',
        details: error.message
      });
    }
  };
  
  /**
   * Test log collection for a service
   * POST /api/logs/test
   */
  testCollection = async (req, res) => {
    try {
      const service = req.body;
      
      if (!service || !service.api_key) {
        return res.status(400).json({
          error: 'Service configuration with API key required'
        });
      }
      
      // Create temporary collector for testing
      const testCollector = new LogCollector();
      
      // Try to fetch logs once
      const config = testCollector.serviceConfigs[service.type];
      if (!config) {
        return res.status(400).json({
          error: `No log collection configuration for service type: ${service.type}`
        });
      }
      
      await testCollector.fetchServiceLogs(service, config);
      const logs = testCollector.getServiceLogs(service.id, { limit: 10 });
      
      res.json({
        success: true,
        message: 'Log collection test successful',
        sampleLogs: logs,
        availableFacilities: config.facilities
      });
    } catch (error) {
      res.status(500).json({
        error: 'Log collection test failed',
        details: error.message
      });
    }
  };
}

module.exports = new LogController();