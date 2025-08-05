const axios = require('axios');

/**
 * Log Collector - Fetches logs from various services
 */
class LogCollector {
  constructor() {
    this.activeCollectors = new Map(); // serviceId -> collector instance
    this.logCache = new Map(); // serviceId -> cached logs
    this.lastFetchTimes = new Map(); // serviceId -> timestamp
    
    // Service-specific log API configurations
    this.serviceConfigs = {
      radarr: {
        endpoint: '/api/v3/log',
        pageSize: 100,
        facilityField: 'logger',
        facilities: ['Api', 'Indexer', 'Download', 'Import', 'Health', 'Auth']
      },
      sonarr: {
        endpoint: '/api/v3/log', 
        pageSize: 100,
        facilityField: 'logger',
        facilities: ['Api', 'Episode', 'Series', 'RSS', 'Download', 'Import']
      },
      prowlarr: {
        endpoint: '/api/v1/log',
        pageSize: 100,
        facilityField: 'logger', 
        facilities: ['Api', 'Indexer', 'Download', 'Health']
      },
      lidarr: {
        endpoint: '/api/v1/log',
        pageSize: 100,
        facilityField: 'logger',
        facilities: ['Api', 'Album', 'Artist', 'Download', 'Import']
      },
      bazarr: {
        endpoint: '/api/system/logs',
        pageSize: 100,
        facilityField: 'module',
        facilities: ['General', 'Subliminal', 'Sonarr', 'Radarr']
      }
    };
  }
  
  /**
   * Start collecting logs from a service
   * @param {Object} service - Service configuration
   */
  async startCollecting(service) {
    if (this.activeCollectors.has(service.id)) {
      return; // Already collecting
    }
    
    const config = this.serviceConfigs[service.type];
    if (!config) {
      console.log(`No log collection configuration for service type: ${service.type}`);
      return;
    }
    
    console.log(`Starting log collection for ${service.name} (${service.type})`);
    
    // Initial fetch
    await this.fetchServiceLogs(service, config);
    
    // TEMPORARILY DISABLED: Set up polling interval (every 60 seconds)
    // This was causing API load issues and hanging stats endpoints
    // TODO: Re-enable with proper throttling and error handling
    /*
    const interval = setInterval(async () => {
      try {
        await this.fetchServiceLogs(service, config);
      } catch (error) {
        console.error(`Log collection failed for ${service.name}:`, error.message);
      }
    }, 60000);
    */
    
    console.log(`Log collection DISABLED for ${service.name} - reducing API load`);
    
    // this.activeCollectors.set(service.id, interval); // Disabled
  }
  
  /**
   * Stop collecting logs from a service
   * @param {number} serviceId - Service ID
   */
  stopCollecting(serviceId) {
    const interval = this.activeCollectors.get(serviceId);
    if (interval) {
      clearInterval(interval);
      this.activeCollectors.delete(serviceId);
      console.log(`Stopped log collection for service ${serviceId}`);
    }
  }
  
  /**
   * Fetch logs from a specific service
   * @param {Object} service - Service configuration
   * @param {Object} config - Log API configuration
   */
  async fetchServiceLogs(service, config) {
    try {
      const protocol = service.ssl ? 'https' : 'http';
      const baseUrl = `${protocol}://${service.host}:${service.port}`;
      const url = `${baseUrl}${config.endpoint}`;
      
      // Build request parameters
      const params = {
        pageSize: config.pageSize,
        sortDirection: 'descending', // Get newest first
        sortKey: 'time'
      };
      
      // Add since parameter for incremental fetches
      const lastFetch = this.lastFetchTimes.get(service.id);
      if (lastFetch) {
        params.since = lastFetch;
      }
      
      const response = await axios.get(url, {
        params,
        headers: {
          'X-Api-Key': service.api_key
        },
        timeout: 10000
      });
      
      if (response.data && response.data.records) {
        const logs = this.normalizeLogEntries(response.data.records, service, config);
        this.updateLogCache(service.id, logs);
        this.lastFetchTimes.set(service.id, new Date().toISOString());
        
        console.log(`Fetched ${logs.length} new log entries from ${service.name}`);
      }
      
    } catch (error) {
      if (error.response?.status === 401) {
        console.error(`Authentication failed for ${service.name} - check API key`);
      } else if (error.code === 'ECONNREFUSED') {
        console.error(`Cannot connect to ${service.name} at ${service.host}:${service.port}`);
      } else {
        console.error(`Log fetch error for ${service.name}:`, error.message);
      }
    }
  }
  
  /**
   * Normalize log entries to standard format
   * @param {Array} rawLogs - Raw log entries from service
   * @param {Object} service - Service configuration
   * @param {Object} config - Log API configuration
   * @returns {Array} Normalized log entries
   */
  normalizeLogEntries(rawLogs, service, config) {
    return rawLogs.map(log => ({
      id: log.id || `${service.id}-${Date.now()}-${Math.random()}`,
      timestamp: new Date(log.time),
      level: this.mapLogLevel(log.level),
      facility: log[config.facilityField] || 'General',
      service: service.name,
      serviceType: service.type,
      serviceId: service.id,
      message: log.message || log.exception || 'No message',
      exception: log.exception || null,
      raw: log
    }));
  }
  
  /**
   * Map service-specific log levels to standard levels
   * @param {string} level - Service-specific level
   * @returns {string} Standard log level
   */
  mapLogLevel(level) {
    const levelMap = {
      'Fatal': 'CRITICAL',
      'Error': 'ERROR',
      'Warn': 'WARNING', 
      'Info': 'INFO',
      'Debug': 'DEBUG',
      'Trace': 'TRACE'
    };
    
    return levelMap[level] || level.toUpperCase();
  }
  
  /**
   * Update log cache for a service
   * @param {number} serviceId - Service ID
   * @param {Array} newLogs - New log entries
   */
  updateLogCache(serviceId, newLogs) {
    if (!this.logCache.has(serviceId)) {
      this.logCache.set(serviceId, []);
    }
    
    const existingLogs = this.logCache.get(serviceId);
    const combinedLogs = [...newLogs, ...existingLogs];
    
    // Keep only last 500 entries per service (5x buffer of what we display)
    const trimmedLogs = combinedLogs
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 500);
    
    this.logCache.set(serviceId, trimmedLogs);
  }
  
  /**
   * Get cached logs for a service
   * @param {number} serviceId - Service ID
   * @param {Object} options - Filter options
   * @returns {Array} Filtered log entries
   */
  getServiceLogs(serviceId, options = {}) {
    const logs = this.logCache.get(serviceId) || [];
    const { facility, level, limit = 100 } = options;
    
    let filteredLogs = logs;
    
    // Filter by facility
    if (facility && facility !== 'all') {
      filteredLogs = filteredLogs.filter(log => 
        log.facility.toLowerCase() === facility.toLowerCase()
      );
    }
    
    // Filter by log level
    if (level && level !== 'all') {
      filteredLogs = filteredLogs.filter(log =>
        log.level === level
      );
    }
    
    // Limit results
    return filteredLogs.slice(0, limit);
  }
  
  /**
   * Get logs from all services
   * @param {Object} options - Filter options
   * @returns {Array} Combined log entries
   */
  getAllLogs(options = {}) {
    const allLogs = [];
    
    for (const [serviceId, logs] of this.logCache.entries()) {
      allLogs.push(...logs);
    }
    
    // Sort by timestamp (newest first)
    allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    const { level, limit = 100 } = options;
    
    let filteredLogs = allLogs;
    
    // Filter by log level
    if (level && level !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    return filteredLogs.slice(0, limit);
  }
  
  /**
   * Get available facilities for a service
   * @param {number} serviceId - Service ID
   * @returns {Array} Available facilities
   */
  getServiceFacilities(serviceId) {
    const logs = this.logCache.get(serviceId) || [];
    const facilities = new Set();
    
    logs.forEach(log => facilities.add(log.facility));
    
    return Array.from(facilities).sort();
  }
  
  /**
   * Start collecting from all configured services
   * @param {Array} services - Array of service configurations
   */
  async startCollectingAll(services) {
    console.log(`Starting log collection for ${services.length} services`);
    
    for (const service of services) {
      if (service.enabled && service.api_key) {
        await this.startCollecting(service);
      }
    }
  }
  
  /**
   * Get collection status
   * @returns {Object} Collection status
   */
  getStatus() {
    const status = {
      activeCollectors: this.activeCollectors.size,
      totalCachedLogs: 0,
      serviceStatus: {}
    };
    
    for (const [serviceId, logs] of this.logCache.entries()) {
      status.totalCachedLogs += logs.length;
      status.serviceStatus[serviceId] = {
        cached: logs.length,
        lastFetch: this.lastFetchTimes.get(serviceId)
      };
    }
    
    return status;
  }
}

module.exports = LogCollector;