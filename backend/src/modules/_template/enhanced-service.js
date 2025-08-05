const BaseService = require('../../utils/baseService');

class EnhancedTemplateService extends BaseService {
  constructor() {
    super('TEMPLATE'); // Change this to your service name (lowercase)
    
    // Log collection configuration for this service type
    this.logConfig = {
      endpoint: '/api/v3/log', // Adjust for your service
      pageSize: 100,
      facilityField: 'logger', // Field that contains the facility/category
      facilities: ['Api', 'General', 'Health'], // Common facilities for this service
      requiresAuth: true,
      supportedLevels: ['Info', 'Debug', 'Warn', 'Error', 'Fatal']
    };
    
    // Service detection rules for network discovery
    this.detectionRules = [
      {
        method: 'GET',
        path: '/api/v3/system/status',
        headers: {},
        expect: { 
          contains: 'templateservice', // Change to your service name
          field: 'appName'
        },
        confidence: 95
      },
      {
        method: 'GET',
        path: '/',
        headers: {},
        expect: { title: /templateservice/i }, // Change to your service name
        confidence: 85
      }
    ];
    
    // Common ports this service runs on (for detection confidence boost)
    this.commonPorts = [8080, 8989]; // Adjust for your service
    
    // Quick-add form configuration
    this.quickAddConfig = {
      name: 'Template Service', // Display name
      icon: 'template-icon', // Icon identifier
      description: 'Description of what this service does',
      defaultPort: 8080,
      defaultSsl: false,
      requiredFields: ['name', 'host', 'port', 'api_key'],
      optionalFields: ['ssl', 'path'],
      fieldLabels: {
        name: 'Service Name',
        host: 'Host/IP Address',
        port: 'Port',
        api_key: 'API Key',
        ssl: 'Use HTTPS',
        path: 'Base Path (optional)'
      },
      fieldPlaceholders: {
        name: 'My Template Service',
        host: '192.168.1.100',
        port: '8080',
        api_key: 'Your API key here',
        path: '/templateservice'
      }
    };
  }

  // Override to add service-specific headers
  getHeaders(config) {
    return {
      'X-Api-Key': config.api_key,
      'Content-Type': 'application/json'
      // Add any other headers your service needs
    };
  }

  // Get service-specific stats
  async getStats(config) {
    try {
      // Example API calls - replace with your service's endpoints
      const systemStatus = await this.apiCall(config, '/api/v3/system/status');
      const queue = await this.apiCall(config, '/api/v3/queue').catch(() => ({ totalRecords: 0 }));
      
      // Return stats in a format that makes sense for your service
      return {
        version: systemStatus.version || 'Unknown',
        status: 'online',
        uptime: systemStatus.startTime ? this.calculateUptime(systemStatus.startTime) : 'Unknown',
        
        // Service-specific stats - customize these
        queueSize: queue.totalRecords || 0,
        diskSpace: systemStatus.diskSpace || 'Unknown',
        
        // Health indicators
        health: {
          database: systemStatus.databaseStatus === 'ok',
          storage: systemStatus.storageStatus === 'ok',
          indexers: systemStatus.indexerStatus === 'ok'
        }
      };
    } catch (error) {
      console.error(`Error fetching ${this.serviceName} stats:`, error.message);
      return {
        status: 'error',
        error: error.message,
        version: 'Unknown'
      };
    }
  }

  // Test connection and validate configuration
  async testConnection(config) {
    try {
      const response = await this.apiCall(config, '/api/v3/system/status');
      
      return {
        success: true,
        message: 'Connection successful',
        version: response.version,
        appName: response.appName
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        suggestion: this.getConnectionSuggestion(error)
      };
    }
  }

  // Get connection troubleshooting suggestion
  getConnectionSuggestion(error) {
    if (error.code === 'ECONNREFUSED') {
      return 'Service appears to be offline or unreachable. Check if the service is running and the host/port are correct.';
    } else if (error.response?.status === 401) {
      return 'Authentication failed. Please verify your API key is correct.';
    } else if (error.response?.status === 404) {
      return 'API endpoint not found. This might not be the correct service type or version.';
    } else {
      return 'Please check your configuration and try again.';
    }
  }

  // Calculate uptime from start time
  calculateUptime(startTime) {
    try {
      const start = new Date(startTime);
      const now = new Date();
      const uptimeMs = now - start;
      
      const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
      
      return `${days}d ${hours}h ${minutes}m`;
    } catch (error) {
      return 'Unknown';
    }
  }

  // Log collection specific methods
  async fetchLogs(config, options = {}) {
    try {
      const params = {
        pageSize: options.pageSize || this.logConfig.pageSize,
        sortDirection: 'descending',
        sortKey: 'time'
      };
      
      if (options.facility && options.facility !== 'all') {
        params.filterKey = this.logConfig.facilityField;
        params.filterValue = options.facility;
      }
      
      if (options.level && options.level !== 'all') {
        params.level = options.level;
      }
      
      if (options.since) {
        params.since = options.since;
      }
      
      const response = await this.apiCall(config, this.logConfig.endpoint, 'GET', null, params);
      
      return {
        success: true,
        logs: response.records || [],
        totalRecords: response.totalRecords || 0
      };
    } catch (error) {
      console.error(`Error fetching ${this.serviceName} logs:`, error.message);
      return {
        success: false,
        error: error.message,
        logs: []
      };
    }
  }

  // Get available log facilities
  getLogFacilities() {
    return this.logConfig.facilities;
  }

  // Normalize log entry to standard format
  normalizeLogEntry(logEntry, serviceConfig) {
    return {
      id: logEntry.id || `${Date.now()}-${Math.random()}`,
      timestamp: new Date(logEntry.time),
      level: this.mapLogLevel(logEntry.level),
      facility: logEntry[this.logConfig.facilityField] || 'General',
      service: serviceConfig.name,
      serviceType: this.serviceName,
      serviceId: serviceConfig.id,
      message: logEntry.message || logEntry.exception || 'No message',
      exception: logEntry.exception || null,
      raw: logEntry
    };
  }

  // Map service-specific log levels to standard levels
  mapLogLevel(level) {
    const levelMap = {
      'Fatal': 'CRITICAL',
      'Error': 'ERROR', 
      'Warn': 'WARNING',
      'Info': 'INFO',
      'Debug': 'DEBUG',
      'Trace': 'TRACE'
    };
    
    return levelMap[level] || level?.toUpperCase() || 'INFO';
  }

  // Get quick-add configuration for network discovery
  getQuickAddConfig() {
    return this.quickAddConfig;
  }

  // Get detection rules for network discovery
  getDetectionRules() {
    return this.detectionRules;
  }

  // Get common ports for network discovery
  getCommonPorts() {
    return this.commonPorts;
  }

  // Add any service-specific methods here
  async getCustomData(config) {
    try {
      // Implement your custom logic
      const data = await this.apiCall(config, '/api/v3/custom-endpoint');
      return data;
    } catch (error) {
      console.error(`Error fetching custom data:`, error);
      return null;
    }
  }
}

// Export a singleton instance
module.exports = new EnhancedTemplateService();