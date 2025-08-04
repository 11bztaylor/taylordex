const BaseService = require('../../utils/baseService');

class TemplateService extends BaseService {
  constructor() {
    super('TEMPLATE'); // Change this to your service name
  }

  // Override to add service-specific headers
  getHeaders(config) {
    return {
      'X-Api-Key': config.api_key
      // Add any other headers your service needs
    };
  }

  // Get service-specific stats
  async getStats(config) {
    try {
      // Example API calls - replace with your service's endpoints
      const systemStatus = await this.apiCall(config, '/api/v1/system/status');
      
      // Return stats in a format that makes sense for your service
      return {
        version: systemStatus.version,
        status: 'online',
        // Add your service-specific stats here
        customStat1: 0,
        customStat2: 'N/A'
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

  // Add any service-specific methods here
  async getCustomData(config) {
    try {
      // Implement your custom logic
      const data = await this.apiCall(config, '/api/v1/custom-endpoint');
      return data;
    } catch (error) {
      console.error(`Error fetching custom data:`, error);
      return null;
    }
  }
}

// Export a singleton instance
module.exports = new TemplateService();
