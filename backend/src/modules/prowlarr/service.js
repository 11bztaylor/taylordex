const BaseService = require('../../utils/baseService');

class ProwlarrService extends BaseService {
  constructor() {
    super('Prowlarr');
  }

  getHeaders(config) {
    return {
      'X-Api-Key': config.api_key
    };
  }

  async getStats(config) {
    try {
      // Use the correct Prowlarr v1 endpoints
      const systemStatus = await this.apiCall(config, '/api/v1/system/status');
      const health = await this.apiCall(config, '/api/v1/health');
      
      // Try to get indexer stats if available
      let indexerCount = 0;
      let enabledCount = 0;
      
      try {
        const indexers = await this.apiCall(config, '/api/v1/indexer');
        if (Array.isArray(indexers)) {
          indexerCount = indexers.length;
          enabledCount = indexers.filter(i => i.enable).length;
        }
      } catch (e) {
        console.log('Could not fetch indexers:', e.message);
      }

      // Get health issues count
      const healthIssues = Array.isArray(health) ? health.length : 0;

      return {
        indexers: indexerCount,
        enabled: enabledCount,
        healthIssues: healthIssues,
        version: systemStatus.version || 'Unknown',
        status: 'online'
      };
    } catch (error) {
      console.error('Error fetching Prowlarr stats:', error.message);
      return {
        indexers: 0,
        enabled: 0,
        healthIssues: 0,
        version: 'Unknown',
        status: 'error',
        error: error.message
      };
    }
  }

  async testConnection(config) {
    try {
      const url = this.buildUrl(config.host, config.port, '/api/v1/system/status');
      const response = await this.axios.get(url, {
        headers: this.getHeaders(config)
      });
      
      return {
        success: true,
        version: response.data.version || 'Unknown',
        message: `Connected to Prowlarr`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error.response?.data || 'Connection failed'
      };
    }
  }
}

module.exports = new ProwlarrService();
