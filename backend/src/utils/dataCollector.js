// Centralized data collection utility for all services
// This makes it easy to add new data points and maintain consistency

class DataCollector {
  constructor() {
    this.collectors = {
      radarr: this.collectRadarrData,
      sonarr: this.collectSonarrData,
      plex: this.collectPlexData,
      prowlarr: this.collectProwlarrData,
      lidarr: this.collectLidarrData,
      bazarr: this.collectBazarrData,
      readarr: this.collectReadarrData
    };
  }

  async collectServiceData(service) {
    const collector = this.collectors[service.type];
    if (!collector) {
      console.warn(`No data collector for service type: ${service.type}`);
      return null;
    }

    try {
      const serviceModule = require(`../modules/${service.type}/service`);
      const data = await serviceModule.getStats(service);
      
      // Add metadata
      return {
        serviceId: service.id,
        serviceName: service.name,
        serviceType: service.type,
        collectedAt: new Date().toISOString(),
        data,
        errors: data.error ? [data.error] : []
      };
    } catch (error) {
      console.error(`Error collecting data for ${service.name}:`, error);
      return {
        serviceId: service.id,
        serviceName: service.name,
        serviceType: service.type,
        collectedAt: new Date().toISOString(),
        data: null,
        errors: [error.message]
      };
    }
  }

  async collectAllServicesData(services) {
    const results = await Promise.allSettled(
      services.map(service => this.collectServiceData(service))
    );

    return results
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value)
      .filter(data => data !== null);
  }

  // Aggregate data across all services for dashboard views
  aggregateData(collectedData) {
    const aggregated = {
      overview: {
        totalServices: 0,
        servicesOnline: 0,
        servicesOffline: 0,
        totalMedia: 0,
        totalMissing: 0,
        activeActivity: 0,
        totalStorage: 0
      },
      byService: {},
      alerts: [],
      trends: {
        recentAdditions: [],
        downloads: [],
        streams: []
      }
    };

    collectedData.forEach(serviceData => {
      if (!serviceData.data) return;

      aggregated.overview.totalServices++;
      
      if (serviceData.data.status === 'online') {
        aggregated.overview.servicesOnline++;
      } else {
        aggregated.overview.servicesOffline++;
      }

      // Service-specific aggregation
      aggregated.byService[serviceData.serviceName] = {
        type: serviceData.serviceType,
        status: serviceData.data.status,
        key_metrics: this.extractKeyMetrics(serviceData.serviceType, serviceData.data)
      };

      // Collect alerts
      if (serviceData.data.health?.warnings) {
        serviceData.data.health.warnings.forEach(warning => {
          aggregated.alerts.push({
            service: serviceData.serviceName,
            type: 'warning',
            message: warning,
            timestamp: new Date().toISOString()
          });
        });
      }
    });

    return aggregated;
  }

  extractKeyMetrics(serviceType, data) {
    switch (serviceType) {
      case 'radarr':
        return {
          movies: data.movies,
          missing: data.missing,
          downloading: data.queue?.downloading || 0,
          diskUsage: data.diskSpace
        };
      case 'sonarr':
        return {
          series: data.series,
          episodes: data.episodes,
          missing: data.missing,
          airingToday: data.airingToday || 0
        };
      case 'plex':
        return {
          libraries: data.libraries,
          activeStreams: data.activeStreams,
          bandwidth: data.performance?.bandwidth || '0 Mbps'
        };
      case 'prowlarr':
        return {
          indexers: data.enabled + '/' + data.indexers,
          successRate: data.successRate + '%',
          queries24h: data.totalQueries24h
        };
      default:
        return {};
    }
  }
}

module.exports = new DataCollector();
