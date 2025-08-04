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
      console.log(`Fetching ENHANCED Radarr stats from ${config.host}:${config.port}`);
      
      // Start with basic data for fast response
      const movies = await this.apiCall(config, '/api/v3/movie');
      const systemStatus = await this.apiCall(config, '/api/v3/system/status');
      const diskSpace = await this.apiCall(config, '/api/v3/diskspace');
      
      // Basic stats (what you're seeing now)
      const totalMovies = movies.length;
      const missingMovies = movies.filter(m => !m.hasFile).length;
      const monitoredMovies = movies.filter(m => m.monitored).length;
      
      const totalSpace = diskSpace.reduce((acc, disk) => acc + disk.totalSpace, 0);
      const freeSpace = diskSpace.reduce((acc, disk) => acc + disk.freeSpace, 0);
      const usedSpace = totalSpace - freeSpace;

      // Now let's add the ENHANCED data
      console.log('Fetching enhanced data...');
      
      // Get queue info
      let queueData = { total: 0, items: [] };
      try {
        const queue = await this.apiCall(config, '/api/v3/queue');
        queueData = {
          total: queue.totalRecords || 0,
          downloading: queue.records?.filter(q => q.status === 'downloading').length || 0,
          queued: queue.records?.filter(q => q.status === 'queued').length || 0,
          items: queue.records?.slice(0, 10).map(q => ({
            title: q.movie?.title || 'Unknown',
            progress: Math.round(q.sizeleft && q.size ? ((q.size - q.sizeleft) / q.size) * 100 : 0),
            eta: q.timeleft || 'Unknown',
            size: this.formatBytes(q.size || 0),
            status: q.status
          })) || []
        };
      } catch (e) {
        console.log('Could not fetch queue:', e.message);
      }

      // Get recent additions
      let recentAdditions = [];
      try {
        const sevenDaysAgo = new Date(Date.now() - 7*24*60*60*1000);
        recentAdditions = movies
          .filter(m => m.movieFile && new Date(m.movieFile.dateAdded) > sevenDaysAgo)
          .map(m => ({
            title: m.title,
            added: m.movieFile.dateAdded,
            quality: m.movieFile.quality?.quality?.name || 'Unknown',
            size: this.formatBytes(m.movieFile.size || 0),
            year: m.year
          }))
          .sort((a, b) => new Date(b.added) - new Date(a.added))
          .slice(0, 20);
      } catch (e) {
        console.log('Could not process recent additions:', e.message);
      }

      // Quality breakdown
      const qualityBreakdown = {};
      movies.forEach(movie => {
        if (movie.movieFile?.quality?.quality?.name) {
          const quality = movie.movieFile.quality.quality.name;
          qualityBreakdown[quality] = (qualityBreakdown[quality] || 0) + 1;
        }
      });

      // Get health warnings
      let healthData = { issues: 0, warnings: [] };
      try {
        const health = await this.apiCall(config, '/api/v3/health');
        healthData = {
          issues: health?.length || 0,
          warnings: health?.slice(0, 10).map(h => h.message) || []
        };
      } catch (e) {
        console.log('Could not fetch health:', e.message);
      }

      // Get upcoming releases
      let upcoming = [];
      try {
        const calendar = await this.apiCall(config, '/api/v3/calendar?start=' + new Date().toISOString() + '&end=' + new Date(Date.now() + 30*24*60*60*1000).toISOString());
        upcoming = calendar
          .filter(m => new Date(m.inCinemas || m.digitalRelease) > new Date())
          .map(m => ({
            title: m.title,
            releaseDate: m.inCinemas || m.digitalRelease,
            monitored: m.monitored
          }))
          .slice(0, 10);
      } catch (e) {
        console.log('Could not fetch calendar:', e.message);
      }

      console.log('Enhanced data collection complete');

      return {
        // Basic stats (what you have now)
        movies: totalMovies,
        missing: missingMovies,
        monitored: monitoredMovies,
        diskSpace: this.formatBytes(usedSpace),
        diskSpaceTotal: this.formatBytes(totalSpace),
        diskSpaceFree: this.formatBytes(freeSpace),
        diskSpaceUsedPercent: Math.round((usedSpace / totalSpace) * 100),
        version: systemStatus.version,
        status: 'online',
        
        // ENHANCED stats (new data)
        queue: queueData,
        recentAdditions: recentAdditions,
        qualityBreakdown: qualityBreakdown,
        health: healthData,
        upcoming: upcoming,
        
        // Extra stats
        totalFileSize: this.formatBytes(movies.reduce((sum, m) => sum + (m.movieFile?.size || 0), 0)),
        averageFileSize: this.formatBytes(movies.filter(m => m.movieFile).reduce((sum, m) => sum + (m.movieFile?.size || 0), 0) / movies.filter(m => m.movieFile).length || 0)
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
