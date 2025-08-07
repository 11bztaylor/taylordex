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
      
      // Basic stats
      const totalMovies = movies.length;
      const moviesWithFiles = movies.filter(m => m.hasFile).length;
      const missingMovies = movies.filter(m => !m.hasFile).length;
      const monitoredMovies = movies.filter(m => m.monitored).length;
      
      // Enhanced storage processing with duplicate detection and path visibility
      const processedDisks = diskSpace.map(disk => {
        const duplicateOf = diskSpace.find(d => 
          d !== disk && d.totalSpace === disk.totalSpace && d.freeSpace === disk.freeSpace
        );
        return {
          ...disk,
          isDuplicate: !!duplicateOf,
          duplicateOfPath: duplicateOf?.path
        };
      });
      
      // Get unique disks for metrics calculation (avoid double counting)
      const uniqueDisks = processedDisks.filter(disk => !disk.isDuplicate);
      
      const primaryDisk = uniqueDisks.reduce((largest, current) => 
        current.totalSpace > largest.totalSpace ? current : largest
      , uniqueDisks[0] || { totalSpace: 0, freeSpace: 0 });
      
      // Storage paths with duplicate indicators and Docker/NAS integration
      const enhancedStoragePaths = processedDisks.map(disk => {
        const isDockerPath = disk.path.startsWith('/') && !disk.path.startsWith('/mnt') && !disk.path.startsWith('/media');
        return {
          path: disk.path,
          label: disk.label || disk.path.split('/').pop() || 'Root',
          totalSpace: disk.totalSpace,
          freeSpace: disk.freeSpace,
          usedSpace: disk.totalSpace - disk.freeSpace,
          usedPercent: Math.round(((disk.totalSpace - disk.freeSpace) / disk.totalSpace) * 100),
          accessible: disk.totalSpace > 0,
          isDuplicate: disk.isDuplicate,
          duplicateOfPath: disk.duplicateOfPath,
          isDockerMount: isDockerPath,
          // Docker/NAS host detection (will be enhanced with service integration)
          dockerHost: config.host !== 'localhost' && config.host !== '127.0.0.1' ? config.host : null,
          isPrimary: disk === primaryDisk
        };
      });
      
      const totalSpace = primaryDisk.totalSpace;
      const freeSpace = primaryDisk.freeSpace;
      const usedSpace = totalSpace - freeSpace;

      // Get queue info - FIXED parsing
      let queueData = { total: 0, items: [] };
      try {
        const queue = await this.apiCall(config, '/api/v3/queue?pageSize=20');
        console.log('Queue response structure:', Object.keys(queue));
        
        queueData = {
          total: queue.totalRecords || 0,
          downloading: 0,
          queued: 0,
          items: []
        };

        if (queue.records && Array.isArray(queue.records)) {
          console.log(`Processing ${queue.records.length} queue items`);
          
          // Count by status
          queueData.downloading = queue.records.filter(q => q.status === 'downloading').length;
          queueData.queued = queue.records.filter(q => q.status === 'queued' || q.status === 'delay').length;
          
          // Parse queue items
          queueData.items = queue.records.slice(0, 10).map(q => {
            // Try different ways to get the title
            let title = 'Unknown';
            if (q.title) {
              title = q.title;
            } else if (q.movie && q.movie.title) {
              title = q.movie.title;
            } else if (q.sourceTitle) {
              // Extract movie name from source title (e.g., "Movie Name 2024 1080p BluRay")
              title = q.sourceTitle.split(/\d{4}/)[0].trim() || q.sourceTitle;
            }
            
            return {
              title: title,
              progress: Math.round(q.sizeleft && q.size ? ((q.size - q.sizeleft) / q.size) * 100 : 0),
              eta: q.timeleft || 'Unknown',
              size: this.formatBytes(q.size || 0),
              status: q.status || 'queued',
              downloadClient: q.downloadClient || 'Unknown',
              quality: q.quality?.quality?.name || 'Unknown'
            };
          });
        }
      } catch (e) {
        console.error('Error fetching queue:', e.message);
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
        console.error('Error processing recent additions:', e.message);
      }

      // Get recent downloads from history
      let recentDownloads = [];
      try {
        const history = await this.apiCall(config, '/api/v3/history?pageSize=20&sortKey=date&sortDirection=descending&eventType=downloadFolderImported');
        if (history.records) {
          recentDownloads = history.records.map(h => ({
            title: h.movie?.title || h.sourceTitle || 'Unknown',
            downloaded: h.date,
            quality: h.quality?.quality?.name || 'Unknown',
            size: this.formatBytes(h.data?.size || 0)
          })).slice(0, 10);
        }
      } catch (e) {
        console.error('Error fetching history:', e.message);
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
        console.error('Error fetching health:', e.message);
      }

      // Get upcoming releases
      let upcoming = [];
      try {
        const startDate = new Date().toISOString();
        const endDate = new Date(Date.now() + 30*24*60*60*1000).toISOString();
        const calendar = await this.apiCall(config, `/api/v3/calendar?start=${startDate}&end=${endDate}&includeUnmonitored=false`);
        
        upcoming = calendar
          .filter(m => new Date(m.inCinemas || m.digitalRelease || m.physicalRelease) > new Date())
          .map(m => ({
            title: m.title,
            releaseDate: m.inCinemas || m.digitalRelease || m.physicalRelease,
            monitored: m.monitored,
            hasFile: m.hasFile
          }))
          .slice(0, 10);
      } catch (e) {
        console.error('Error fetching calendar:', e.message);
      }

      console.log('Enhanced data collection complete');

      return {
        // Basic stats
        movies: totalMovies,
        files: moviesWithFiles,
        missing: missingMovies,
        monitored: monitoredMovies,
        diskSpace: this.formatBytes(usedSpace),
        diskSpaceTotal: this.formatBytes(totalSpace),
        diskSpaceFree: this.formatBytes(freeSpace),
        diskSpaceUsedPercent: Math.round((usedSpace / totalSpace) * 100),
        version: systemStatus.version,
        status: 'online',
        
        // Enhanced storage information with Docker/NAS integration
        storagePaths: enhancedStoragePaths,
        dockerHost: config.host !== 'localhost' && config.host !== '127.0.0.1' ? config.host : null,
        
        // Enhanced stats
        queue: queueData,
        recentAdditions: recentAdditions,
        recentDownloads: recentDownloads,
        qualityBreakdown: qualityBreakdown,
        health: healthData,
        upcoming: upcoming,
        
        // Extra stats
        totalFileSize: this.formatBytes(movies.reduce((sum, m) => sum + (m.movieFile?.size || 0), 0)),
        averageFileSize: this.formatBytes(
          movies.filter(m => m.movieFile).length > 0 
            ? movies.filter(m => m.movieFile).reduce((sum, m) => sum + (m.movieFile?.size || 0), 0) / movies.filter(m => m.movieFile).length 
            : 0
        )
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
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = new RadarrService();
