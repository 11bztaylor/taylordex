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
      console.log(`Fetching comprehensive Prowlarr stats from ${config.host}:${config.port}`);
      
      // Fetch all needed data
      const [
        systemStatus,
        health,
        indexers,
        indexerStats,
        applications,
        downloadClients
      ] = await Promise.all([
        this.apiCall(config, '/api/v1/system/status'),
        this.apiCall(config, '/api/v1/health').catch(() => []),
        this.apiCall(config, '/api/v1/indexer').catch(() => []),
        this.apiCall(config, '/api/v1/indexerstats').catch(() => []),
        this.apiCall(config, '/api/v1/applications').catch(() => []),
        this.apiCall(config, '/api/v1/downloadclient').catch(() => [])
      ]);

      // Process indexer data
      let indexerCount = 0;
      let enabledCount = 0;
      const indexerDetails = [];
      
      if (Array.isArray(indexers)) {
        indexerCount = indexers.length;
        enabledCount = indexers.filter(i => i.enable).length;
        
        // Get detailed stats for each indexer
        for (const indexer of indexers) {
          const stats = indexerStats?.indexers?.find(s => s.indexerId === indexer.id);
          
          indexerDetails.push({
            name: indexer.name,
            enabled: indexer.enable,
            priority: indexer.priority,
            protocol: indexer.protocol,
            queries24h: stats?.numberOfQueries || 0,
            grabs24h: stats?.numberOfGrabs || 0,
            failures24h: stats?.numberOfFailedQueries || 0,
            avgResponseTime: stats?.averageResponseTime ? `${stats.averageResponseTime.toFixed(2)}s` : 'N/A'
          });
        }
      }

      // Sort indexers by usage
      indexerDetails.sort((a, b) => (b.queries24h + b.grabs24h) - (a.queries24h + a.grabs24h));

      // Get health issues
      const healthIssues = Array.isArray(health) ? health.length : 0;
      const healthWarnings = health?.map(h => ({
        source: h.source,
        type: h.type,
        message: h.message,
        wikiUrl: h.wikiUrl
      })) || [];

      // Connected apps
      const connectedApps = applications?.map(app => ({
        name: app.name,
        type: app.implementation,
        syncLevel: app.syncLevel,
        tags: app.tags || []
      })) || [];

      // Download clients
      const clients = downloadClients?.map(client => ({
        name: client.name,
        enabled: client.enable,
        priority: client.priority,
        protocol: client.protocol,
        implementation: client.implementation
      })) || [];

      // Calculate totals from stats
      const totalQueries24h = indexerStats?.indexers?.reduce((sum, i) => sum + (i.numberOfQueries || 0), 0) || 0;
      const totalGrabs24h = indexerStats?.indexers?.reduce((sum, i) => sum + (i.numberOfGrabs || 0), 0) || 0;
      const totalFailures24h = indexerStats?.indexers?.reduce((sum, i) => sum + (i.numberOfFailedQueries || 0), 0) || 0;

      return {
        // Basic stats
        indexers: indexerCount,
        enabled: enabledCount,
        healthIssues: healthIssues,
        
        // Enhanced stats
        indexerDetails: indexerDetails.slice(0, 10), // Top 10 indexers
        totalQueries24h,
        totalGrabs24h,
        totalFailures24h,
        successRate: totalQueries24h > 0 ? Math.round(((totalQueries24h - totalFailures24h) / totalQueries24h) * 100) : 100,
        
        health: {
          issues: healthIssues,
          warnings: healthWarnings
        },
        
        connectedApps,
        downloadClients: clients,
        
        // System info
        version: systemStatus.version || 'Unknown',
        authentication: systemStatus.authentication || 'Unknown',
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
