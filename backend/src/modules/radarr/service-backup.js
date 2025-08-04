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
      console.log(`Fetching comprehensive Radarr stats from ${config.host}:${config.port}`);
      
      // Parallel API calls for better performance
      const [
        movies,
        systemStatus,
        diskSpace,
        queue,
        calendar,
        history,
        health,
        qualityProfiles
      ] = await Promise.all([
        this.apiCall(config, '/api/v3/movie'),
        this.apiCall(config, '/api/v3/system/status'),
        this.apiCall(config, '/api/v3/diskspace'),
        this.apiCall(config, '/api/v3/queue'),
        this.apiCall(config, '/api/v3/calendar?start=' + new Date().toISOString() + '&end=' + new Date(Date.now() + 30*24*60*60*1000).toISOString()),
        this.apiCall(config, '/api/v3/history?pageSize=10&sortKey=date&sortDirection=descending'),
        this.apiCall(config, '/api/v3/health').catch(() => []),
        this.apiCall(config, '/api/v3/qualityprofile').catch(() => [])
      ]);

      // Basic stats
      const totalMovies = movies.length;
      const missingMovies = movies.filter(m => !m.hasFile).length;
      const monitoredMovies = movies.filter(m => m.monitored).length;
      
      // Storage calculations
      const totalSpace = diskSpace.reduce((acc, disk) => acc + disk.totalSpace, 0);
      const freeSpace = diskSpace.reduce((acc, disk) => acc + disk.freeSpace, 0);
      const usedSpace = totalSpace - freeSpace;

      // Quality breakdown
      const qualityBreakdown = {};
      movies.forEach(movie => {
        if (movie.movieFile?.quality?.quality?.name) {
          const quality = movie.movieFile.quality.quality.name;
          qualityBreakdown[quality] = (qualityBreakdown[quality] || 0) + 1;
        }
      });

      // Recent additions (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7*24*60*60*1000);
      const recentAdditions = movies
        .filter(m => m.movieFile && new Date(m.movieFile.dateAdded) > sevenDaysAgo)
        .map(m => ({
          title: m.title,
          added: m.movieFile.dateAdded,
          quality: m.movieFile.quality.quality.name,
          size: this.formatBytes(m.movieFile.size)
        }))
        .sort((a, b) => new Date(b.added) - new Date(a.added))
        .slice(0, 10);

      // Recent downloads from history
      const recentDownloads = history.records
        ?.filter(h => h.eventType === 'downloadFolderImported')
        .map(h => ({
          title: h.movie?.title || 'Unknown',
          downloaded: h.date,
          quality: h.quality?.quality?.name || 'Unknown',
          size: this.formatBytes(h.data?.size || 0)
        }))
        .slice(0, 10) || [];

      // Queue details
      const queueDetails = {
        total: queue.totalRecords || 0,
        downloading: queue.records?.filter(q => q.status === 'downloading').length || 0,
        queued: queue.records?.filter(q => q.status === 'queued').length || 0,
        items: queue.records?.map(q => ({
          title: q.movie?.title || 'Unknown',
          progress: Math.round(q.sizeleft && q.size ? ((q.size - q.sizeleft) / q.size) * 100 : 0),
          eta: q.timeleft || 'Unknown',
          size: this.formatBytes(q.size || 0),
          status: q.status
        })).slice(0, 5) || []
      };

      // Health checks
      const healthData = {
        issues: health.length || 0,
        warnings: health.map(h => h.message) || []
      };

      // Upcoming releases
      const upcoming = calendar
        .filter(m => new Date(m.inCinemas || m.digitalRelease) > new Date())
        .map(m => ({
          title: m.title,
          releaseDate: m.inCinemas || m.digitalRelease,
          monitored: m.monitored
        }))
        .slice(0, 10);

      // Movies by year
      const moviesByYear = {};
      movies.forEach(movie => {
        const year = movie.year;
        if (year) {
          moviesByYear[year] = (moviesByYear[year] || 0) + 1;
        }
      });

      return {
        // Basic stats
        movies: totalMovies,
        missing: missingMovies,
        monitored: monitoredMovies,
        diskSpace: this.formatBytes(usedSpace),
        diskSpaceTotal: this.formatBytes(totalSpace),
        diskSpaceFree: this.formatBytes(freeSpace),
        diskSpaceUsedPercent: Math.round((usedSpace / totalSpace) * 100),
        
        // Enhanced stats
        recentAdditions,
        recentDownloads,
        queue: queueDetails,
        health: healthData,
        upcoming,
        qualityBreakdown,
        moviesByYear,
        qualityProfiles: qualityProfiles?.map(p => p.name) || [],
        
        // System info
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
