const { query } = require('../database/connection');
const logger = require('./logger');
const ServiceRepository = require('../repositories/ServiceRepository');

class StatsCollector {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.collectInterval = 5 * 60 * 1000; // 5 minutes
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Stats collector already running');
      return;
    }

    logger.info('🚀 Starting stats collector');
    this.isRunning = true;

    // Run initial collection
    await this.collectAllStats();

    // Set up periodic collection
    this.interval = setInterval(async () => {
      try {
        await this.collectAllStats();
      } catch (error) {
        logger.error('Stats collection cycle failed', { error: error.message });
      }
    }, this.collectInterval);

    logger.info(`📊 Stats collector running - collecting every ${this.collectInterval / 1000 / 60} minutes`);
  }

  async stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    logger.info('📊 Stats collector stopped');
  }

  async collectAllStats() {
    try {
      // Use centralized ServiceRepository - ensures API keys are ALWAYS included
      const services = await ServiceRepository.getServicesForAuthentication({ enabled: true });

      logger.debug(`📊 Collecting stats for ${services.length} services`);

      const promises = services.map(service => this.collectServiceStats(service));
      await Promise.allSettled(promises);

      logger.info(`📊 Stats collection complete for ${services.length} services`);
    } catch (error) {
      logger.error('Failed to collect service stats', { error: error.message });
    }
  }

  async collectServiceStats(service) {
    try {
      logger.debug(`📊 Collecting stats for service`, {
        serviceId: service.id,
        serviceName: service.name,
        serviceType: service.type,
        endpoint: `${service.host}:${service.port}`
      });
      
      // Call the actual service getStats() method - NO MOCK DATA
      let serviceModule;
      try {
        serviceModule = require(`../modules/${service.type}/service`);
      } catch (error) {
        logger.error(`❌ No service module found for ${service.type} - stats collection skipped`, {
          serviceId: service.id,
          serviceName: service.name,
          serviceType: service.type,
          error: error.message
        });
        return; // Skip this service - no mock data
      }
      
      const config = {
        host: service.host,
        port: service.port,
        api_key: service.api_key
      };
      
      const stats = await serviceModule.getStats(config);
      
      logger.debug(`📊 Generated stats for ${service.name}`, {
        serviceId: service.id,
        statsKeys: Object.keys(stats),
        sampleStats: {
          status: stats.status,
          responseTime: stats.responseTime
        }
      });
      
      await query(
        `INSERT INTO service_stats (service_id, stats, fetched_at) 
         VALUES ($1, $2, NOW())`,
        [service.id, JSON.stringify(stats)]
      );

      logger.info(`✅ Stats collected successfully for ${service.name}`, { 
        serviceId: service.id,
        serviceType: service.type,
        statsCount: Object.keys(stats).length
      });
    } catch (error) {
      logger.error(`❌ Failed to collect stats for ${service.name}`, { 
        error: error.message,
        stack: error.stack,
        serviceId: service.id,
        serviceType: service.type,
        endpoint: `${service.host}:${service.port}`
      });
    }
  }

}

module.exports = new StatsCollector();