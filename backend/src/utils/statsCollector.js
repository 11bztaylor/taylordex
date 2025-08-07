const { query } = require('../database/connection');
const logger = require('./logger');

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
      const servicesResult = await query('SELECT id, name, type, host, port FROM services WHERE enabled = true');
      const services = servicesResult.rows;

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
      
      // Call the actual service getStats() method instead of generating mock data
      let serviceModule;
      try {
        serviceModule = require(`../modules/${service.type}/service`);
      } catch (error) {
        logger.warn(`No service module found for ${service.type}, using basic stats`);
        const stats = await this.generateBasicStats(service);
        return stats;
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

  async generateBasicStats(service) {
    // Generate basic stats based on service type
    const baseStats = {
      status: 'online',
      lastChecked: new Date().toISOString(),
      responseTime: Math.floor(Math.random() * 100) + 50 // Simulated response time
    };

    switch (service.type) {
      case 'plex':
        return {
          ...baseStats,
          totalMovies: Math.floor(Math.random() * 1000) + 100,
          totalTVShows: Math.floor(Math.random() * 500) + 50,
          currentStreams: Math.floor(Math.random() * 5),
          totalUsers: Math.floor(Math.random() * 20) + 1
        };

      case 'radarr':
        return {
          ...baseStats,
          movies: Math.floor(Math.random() * 800) + 200,
          missing: Math.floor(Math.random() * 50),
          queued: Math.floor(Math.random() * 10),
          diskSpace: '85%',
          diskSpaceUsedPercent: 85
        };

      case 'sonarr':
        return {
          ...baseStats,
          series: Math.floor(Math.random() * 300) + 50,
          episodes: Math.floor(Math.random() * 5000) + 1000,
          missing: Math.floor(Math.random() * 100),
          queued: Math.floor(Math.random() * 15),
          diskSpace: '78%',
          diskSpaceUsedPercent: 78
        };

      case 'lidarr':
        return {
          ...baseStats,
          artists: Math.floor(Math.random() * 200) + 30,
          albums: Math.floor(Math.random() * 1500) + 300,
          tracks: Math.floor(Math.random() * 15000) + 3000,
          missing: Math.floor(Math.random() * 80),
          diskSpace: '65%',
          diskSpaceUsedPercent: 65
        };

      case 'prowlarr':
        return {
          ...baseStats,
          indexers: Math.floor(Math.random() * 50) + 10,
          activeIndexers: Math.floor(Math.random() * 30) + 8,
          totalQueries: Math.floor(Math.random() * 10000) + 1000,
          dailyQueries: Math.floor(Math.random() * 500) + 100
        };

      case 'overseerr':
        return {
          ...baseStats,
          pendingRequests: Math.floor(Math.random() * 20),
          totalRequests: Math.floor(Math.random() * 500) + 100,
          approvedRequests: Math.floor(Math.random() * 400) + 80,
          totalUsers: Math.floor(Math.random() * 15) + 5
        };

      case 'tautulli':
        return {
          ...baseStats,
          totalStreams: Math.floor(Math.random() * 5000) + 500,
          dailyStreams: Math.floor(Math.random() * 50) + 10,
          topUser: 'User' + Math.floor(Math.random() * 10),
          bandwidth: Math.floor(Math.random() * 100) + 'Mbps'
        };

      case 'unraid':
        return {
          ...baseStats,
          uptime: Math.floor(Math.random() * 30) + ' days',
          arrayStatus: 'Started',
          diskUtilization: Math.floor(Math.random() * 40) + 60 + '%',
          temperature: Math.floor(Math.random() * 15) + 35 + '°C',
          runningContainers: Math.floor(Math.random() * 20) + 5
        };

      case 'portainer':
        return {
          ...baseStats,
          containers: Math.floor(Math.random() * 25) + 10,
          runningContainers: Math.floor(Math.random() * 20) + 8,
          images: Math.floor(Math.random() * 50) + 20,
          volumes: Math.floor(Math.random() * 30) + 10,
          networks: Math.floor(Math.random() * 10) + 3
        };

      default:
        return baseStats;
    }
  }
}

module.exports = new StatsCollector();