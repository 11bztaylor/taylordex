const BaseService = require('../../utils/baseService');

class LidarrService extends BaseService {
  constructor() {
    super('Lidarr');
  }

  getHeaders(config) {
    return {
      'X-Api-Key': config.api_key
    };
  }

  async getStats(config) {
    try {
      const artists = await this.apiCall(config, '/api/v1/artist');
      const systemStatus = await this.apiCall(config, '/api/v1/system/status');
      const queue = await this.apiCall(config, '/api/v1/queue');
      
      const totalArtists = artists.length;
      const monitoredArtists = artists.filter(a => a.monitored).length;
      
      // Calculate total albums and tracks
      let totalAlbums = 0;
      let totalTracks = 0;
      let missingTracks = 0;
      
      artists.forEach(artist => {
        if (artist.statistics) {
          totalAlbums += artist.statistics.albumCount || 0;
          totalTracks += artist.statistics.trackCount || 0;
          
          const trackFileCount = artist.statistics.trackFileCount || 0;
          missingTracks += (artist.statistics.trackCount - trackFileCount);
        }
      });

      return {
        artists: totalArtists,
        albums: totalAlbums,
        tracks: totalTracks,
        missing: missingTracks,
        monitored: monitoredArtists,
        queue: queue.totalRecords || 0,
        version: systemStatus.version,
        status: 'online'
      };
    } catch (error) {
      console.error('Error fetching Lidarr stats:', error.message);
      return {
        artists: 0,
        albums: 0,
        tracks: 0,
        missing: 0,
        monitored: 0,
        queue: 0,
        version: 'Unknown',
        status: 'error',
        error: error.message
      };
    }
  }
}

module.exports = new LidarrService();
