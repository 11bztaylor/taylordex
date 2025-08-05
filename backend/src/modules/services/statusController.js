// statusController.js - Comprehensive status aggregation with enhanced error handling and logging
const { query } = require('../../database/connection');
const dataCollector = require('../../utils/dataCollector');

class StatusController {
  constructor() {
    this.getComprehensiveStatus = this.getComprehensiveStatus.bind(this);
    this.getServiceHealth = this.getServiceHealth.bind(this);
    this.getActivityFeed = this.getActivityFeed.bind(this);
    this.getServiceHistory = this.getServiceHistory.bind(this);
  }

  async getComprehensiveStatus(req, res) {
    const startTime = Date.now();
    
    try {
      console.log('[StatusController] Starting comprehensive status fetch...');
      
      // Get all enabled services with error handling for each step
      let services = [];
      try {
        const servicesResult = await query(
          'SELECT * FROM services WHERE enabled = true ORDER BY name'
        );
        services = servicesResult.rows;
        console.log(`[StatusController] Found ${services.length} enabled services`);
      } catch (dbError) {
        console.error('[StatusController] Database error:', dbError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch services from database',
          details: dbError.message
        });
      }
      
      // Get services with their existing stats instead of re-collecting
      const servicesWithStats = await Promise.all(
        services.map(async (service) => {
          const statsResult = await query(
            'SELECT stats, fetched_at FROM service_stats WHERE service_id = $1 ORDER BY fetched_at DESC LIMIT 1',
            [service.id]
          );
          
          return {
            serviceId: service.id,
            serviceName: service.name,
            serviceType: service.type,
            collectedAt: new Date().toISOString(),
            data: statsResult.rows[0]?.stats || null,
            errors: []
          };
        })
      );
      
      console.log(`[StatusController] Retrieved data from ${servicesWithStats.length} services`);
      
      // Aggregate the data with enhanced processing
      const aggregatedData = this.enhanceAggregatedData(
        dataCollector.aggregateData(servicesWithStats),
        servicesWithStats
      );
      
      // Add performance metrics
      aggregatedData.performance = {
        responseTime: Date.now() - startTime,
        servicesChecked: services.length,
        servicesResponded: servicesWithStats.filter(d => d.data && !d.errors.length).length,
        lastUpdate: new Date().toISOString()
      };
      
      // Add raw service data for detailed views
      aggregatedData.services = servicesWithStats;
      
      console.log(`[StatusController] Request completed in ${aggregatedData.performance.responseTime}ms`);
      
      res.json({
        success: true,
        data: aggregatedData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[StatusController] Unexpected error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async getServiceHealth(req, res) {
    try {
      console.log('[StatusController] Fetching service health...');
      
      const servicesResult = await query(`
        SELECT 
          s.id, s.name, s.type, s.enabled,
          ss.stats->>'status' as status,
          ss.fetched_at,
          EXTRACT(EPOCH FROM (NOW() - ss.fetched_at)) as seconds_since_update
        FROM services s
        LEFT JOIN LATERAL (
          SELECT stats, fetched_at 
          FROM service_stats 
          WHERE service_id = s.id 
          ORDER BY fetched_at DESC 
          LIMIT 1
        ) ss ON true
        ORDER BY s.name
      `);
      
      const health = servicesResult.rows.map(service => ({
        id: service.id,
        name: service.name,
        type: service.type,
        enabled: service.enabled,
        status: service.status || 'unknown',
        lastSeen: service.fetched_at,
        isStale: service.seconds_since_update > 300, // Data older than 5 minutes
        isDown: !service.status || service.status === 'error' || service.status === 'offline'
      }));
      
      res.json({
        success: true,
        health,
        summary: {
          total: health.length,
          enabled: health.filter(h => h.enabled).length,
          online: health.filter(h => h.status === 'online').length,
          offline: health.filter(h => h.isDown).length,
          stale: health.filter(h => h.isStale).length
        }
      });
    } catch (error) {
      console.error('[StatusController] Error getting service health:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getActivityFeed(req, res) {
    try {
      const { limit = 50 } = req.query;
      console.log(`[StatusController] Fetching activity feed (limit: ${limit})...`);
      
      // Get recent service stats updates
      const activityResult = await query(`
        SELECT 
          s.name,
          s.type,
          ss.stats,
          ss.fetched_at
        FROM service_stats ss
        JOIN services s ON s.id = ss.service_id
        WHERE ss.fetched_at > NOW() - INTERVAL '24 hours'
        ORDER BY ss.fetched_at DESC
        LIMIT $1
      `, [parseInt(limit)]);
      
      // Process activities based on service type
      const activities = [];
      
      activityResult.rows.forEach(row => {
        const stats = row.stats;
        
        // Extract relevant activities based on service type
        switch (row.type) {
          case 'radarr':
            if (stats.recentAdditions?.length > 0) {
              stats.recentAdditions.forEach(movie => {
                activities.push({
                  service: row.name,
                  type: 'movie_added',
                  title: movie.title,
                  timestamp: movie.added,
                  details: { quality: movie.quality, size: movie.size }
                });
              });
            }
            break;
            
          case 'sonarr':
            if (stats.recentEpisodes?.length > 0) {
              stats.recentEpisodes.forEach(ep => {
                activities.push({
                  service: row.name,
                  type: 'episode_added',
                  title: `${ep.series} - ${ep.episode}: ${ep.title}`,
                  timestamp: ep.downloaded,
                  details: { quality: ep.quality }
                });
              });
            }
            break;
            
          case 'plex':
            if (stats.currentStreams?.length > 0) {
              stats.currentStreams.forEach(stream => {
                activities.push({
                  service: row.name,
                  type: 'stream_active',
                  title: `${stream.user} watching ${stream.media}`,
                  timestamp: new Date().toISOString(),
                  details: { quality: stream.quality, bandwidth: stream.bandwidth }
                });
              });
            }
            break;
        }
      });
      
      // Sort by timestamp and limit
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      res.json({
        success: true,
        activities: activities.slice(0, limit),
        total: activities.length
      });
    } catch (error) {
      console.error('[StatusController] Error getting activity feed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getServiceHistory(req, res) {
    try {
      const { serviceId } = req.params;
      const { hours = 24 } = req.query;
      
      console.log(`[StatusController] Fetching ${hours}h history for service ${serviceId}`);
      
      const result = await query(
        `SELECT stats, fetched_at 
         FROM service_stats 
         WHERE service_id = $1 
           AND fetched_at > NOW() - INTERVAL '${hours} hours'
         ORDER BY fetched_at DESC`,
        [serviceId]
      );
      
      res.json({
        success: true,
        serviceId,
        hours,
        history: result.rows,
        count: result.rows.length
      });
    } catch (error) {
      console.error('[StatusController] Error getting service history:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  enhanceAggregatedData(aggregated, collectedData) {
    // Add download queue summary
    aggregated.downloads = {
      total: 0,
      active: 0,
      queued: 0,
      items: []
    };
    
    // Add streaming summary
    aggregated.streaming = {
      active: 0,
      bandwidth: 0,
      sessions: []
    };
    
    // Process each service's data
    collectedData.forEach(serviceData => {
      if (!serviceData.data) return;
      
      const { data, serviceType, serviceName } = serviceData;
      
      // Aggregate downloads
      if (data.queueDetails?.items) {
        data.queueDetails.items.forEach(item => {
          aggregated.downloads.items.push({
            service: serviceName,
            type: serviceType,
            ...item
          });
          aggregated.downloads.total++;
          if (item.status === 'downloading') aggregated.downloads.active++;
          else aggregated.downloads.queued++;
        });
      }
      
      // Aggregate streams
      if (data.currentStreams) {
        data.currentStreams.forEach(stream => {
          aggregated.streaming.sessions.push({
            service: serviceName,
            ...stream
          });
          aggregated.streaming.active++;
        });
      }
      
      // Calculate total media counts
      if (serviceType === 'radarr') {
        aggregated.overview.totalMedia += data.movies || 0;
        aggregated.overview.totalMissing += data.missing || 0;
      } else if (serviceType === 'sonarr') {
        aggregated.overview.totalMedia += data.series || 0;
        aggregated.overview.totalMissing += data.missing || 0;
      }
      
      // Storage calculations
      if (data.diskSpaceUsedPercent) {
        aggregated.overview.totalStorage += parseFloat(data.diskSpace) || 0;
      }
    });
    
    // Sort downloads by progress
    aggregated.downloads.items.sort((a, b) => b.progress - a.progress);
    
    return aggregated;
  }
}

module.exports = new StatusController();