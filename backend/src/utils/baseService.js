const axios = require('axios');

class BaseService {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.axios = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  buildUrl(host, port, path) {
    const protocol = port === 443 ? 'https' : 'http';
    return `${protocol}://${host}:${port}${path}`;
  }

  async testConnection(config) {
    try {
      const url = this.buildUrl(config.host, config.port, config.testEndpoint);
      const response = await this.axios.get(url, {
        headers: this.getHeaders(config)
      });
      
      return {
        success: true,
        version: response.data.version || 'Unknown',
        message: `Connected to ${this.serviceName}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error.response?.data || 'Connection failed'
      };
    }
  }

  async getStats(config) {
    throw new Error(`getStats must be implemented by ${this.serviceName}`);
  }

  getHeaders(config) {
    return {};
  }

  async apiCall(config, endpoint, method = 'GET', data = null) {
    try {
      const url = this.buildUrl(config.host, config.port, endpoint);
      const options = {
        method,
        url,
        headers: this.getHeaders(config)
      };

      if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
        options.data = data;
      }

      const response = await this.axios(options);
      return response.data;
    } catch (error) {
      console.error(`${this.serviceName} API Error:`, error.message);
      throw error;
    }
  }
}

module.exports = BaseService;
