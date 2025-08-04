const BaseService = require('../../utils/baseService');

class RadarrService extends BaseService {
  constructor() {
    super('Radarr');
  }

  getHeaders(config) {
    return {
      'X-Api-Key': config.api_key
    };
  }

  async getStats(config) {
    try {
      const movies = await this.apiCall(config, '/api/v3/movie');
      const systemStatus = await this.apiCall(config, '/api/v3/system/status');
      const diskSpace = await this.apiCall(config, '/api/v3/diskspace');

      const totalMovies = movies.length;
      const missingMovies = movies.filter(m => !m.hasFile).length;
      const monitoredMovies = movies.filter(m => m.monitored).length;
      
      const totalSpace = diskSpace.reduce((acc, disk) => acc + disk.totalSpace, 0);
      const freeSpace = diskSpace.reduce((acc, disk) => acc + disk.freeSpace, 0);
      const usedSpace = totalSpace - freeSpace;

      return {
        movies: totalMovies,
        missing: missingMovies,
        monitored: monitoredMovies,
        diskSpace: this.formatBytes(usedSpace),
        diskSpaceTotal: this.formatBytes(totalSpace),
        diskSpaceFree: this.formatBytes(freeSpace),
        version: systemStatus.version,
        status: 'online'
      };
    } catch (error) {
      console.error('Error fetching Radarr stats:', error.message);
      return {
        movies: 0,
        missing: 0,
        monitored: 0,
        diskSpace: 'N/A',
        version: 'Unknown',
        status: 'error',
        error: error.message
      };
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = new RadarrService();
