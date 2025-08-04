const BaseService = require('../../utils/baseService');

class SonarrService extends BaseService {
  constructor() {
    super('Sonarr');
  }

  getHeaders(config) {
    return {
      'X-Api-Key': config.api_key
    };
  }

  async getStats(config) {
    try {
      const series = await this.apiCall(config, '/api/v3/series');
      const systemStatus = await this.apiCall(config, '/api/v3/system/status');
      const diskSpace = await this.apiCall(config, '/api/v3/diskspace');
      const queue = await this.apiCall(config, '/api/v3/queue');

      // Calculate total episodes
      let totalEpisodes = 0;
      let episodesWithFiles = 0;
      
      for (const show of series) {
        if (show.statistics) {
          totalEpisodes += show.statistics.totalEpisodeCount || 0;
          episodesWithFiles += show.statistics.episodeFileCount || 0;
        }
      }

      const missingEpisodes = totalEpisodes - episodesWithFiles;
      const monitoredSeries = series.filter(s => s.monitored).length;
      
      const totalSpace = diskSpace.reduce((acc, disk) => acc + disk.totalSpace, 0);
      const freeSpace = diskSpace.reduce((acc, disk) => acc + disk.freeSpace, 0);
      const usedSpace = totalSpace - freeSpace;

      return {
        series: series.length,
        episodes: totalEpisodes,
        missing: missingEpisodes,
        monitored: monitoredSeries,
        queue: queue.totalRecords || 0,
        diskSpace: this.formatBytes(usedSpace),
        diskSpaceTotal: this.formatBytes(totalSpace),
        diskSpaceFree: this.formatBytes(freeSpace),
        version: systemStatus.version,
        status: 'online'
      };
    } catch (error) {
      console.error('Error fetching Sonarr stats:', error.message);
      return {
        series: 0,
        episodes: 0,
        missing: 0,
        monitored: 0,
        queue: 0,
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

module.exports = new SonarrService();
