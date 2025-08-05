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
      console.log(`Fetching comprehensive Sonarr stats from ${config.host}:${config.port}`);
      
      // Parallel API calls
      const [
        series,
        systemStatus,
        diskSpace,
        queue,
        calendar,
        history,
        health
      ] = await Promise.all([
        this.apiCall(config, '/api/v3/series'),
        this.apiCall(config, '/api/v3/system/status'),
        this.apiCall(config, '/api/v3/diskspace'),
        this.apiCall(config, '/api/v3/queue'),
        this.apiCall(config, '/api/v3/calendar?start=' + new Date().toISOString() + '&end=' + new Date(Date.now() + 7*24*60*60*1000).toISOString()),
        this.apiCall(config, '/api/v3/history?pageSize=20&sortKey=date&sortDirection=descending'),
        this.apiCall(config, '/api/v3/health').catch(() => [])
      ]);

      // Calculate stats
      let totalEpisodes = 0;
      let episodesWithFiles = 0;
      let totalSeasons = 0;
      let monitoredSeasons = 0;
      
      const endedSeries = series.filter(s => s.ended).length;
      const continuingSeries = series.filter(s => !s.ended).length;
      
      for (const show of series) {
        if (show.statistics) {
          totalEpisodes += show.statistics.totalEpisodeCount || 0;
          episodesWithFiles += show.statistics.episodeFileCount || 0;
        }
        if (show.seasons) {
          totalSeasons += show.seasons.length;
          monitoredSeasons += show.seasons.filter(s => s.monitored).length;
        }
      }

      const missingEpisodes = totalEpisodes - episodesWithFiles;
      const monitoredSeries = series.filter(s => s.monitored).length;
      
      // Storage
      const totalSpace = diskSpace.reduce((acc, disk) => acc + disk.totalSpace, 0);
      const freeSpace = diskSpace.reduce((acc, disk) => acc + disk.freeSpace, 0);
      const usedSpace = totalSpace - freeSpace;

      // Recent episodes
      const recentEpisodes = history.records
        ?.filter(h => h.eventType === 'downloadFolderImported')
        .map(h => ({
          series: h.series?.title || 'Unknown',
          episode: `S${String(h.episode?.seasonNumber).padStart(2, '0')}E${String(h.episode?.episodeNumber).padStart(2, '0')}`,
          title: h.episode?.title,
          aired: h.episode?.airDateUtc,
          downloaded: h.date,
          quality: h.quality?.quality?.name
        }))
        .slice(0, 10) || [];

      // Airing schedule
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const airingToday = calendar.filter(ep => {
        const airDate = new Date(ep.airDateUtc);
        return airDate >= today && airDate < tomorrow;
      }).length;
      
      const airingThisWeek = calendar.length;
      
      const schedule = calendar
        .map(ep => ({
          series: ep.series?.title,
          episode: `S${String(ep.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}`,
          title: ep.title,
          airTime: new Date(ep.airDateUtc).toLocaleString(),
          monitored: ep.monitored,
          hasFile: ep.hasFile
        }))
        .slice(0, 20);

      // Queue details with enhanced episode parsing
      const queueDetails = {
        total: queue.totalRecords || 0,
        items: queue.records?.map(q => {
          // Enhanced title parsing
          let episodeTitle = 'Unknown';
          if (q.episode?.title) {
            episodeTitle = q.episode.title;
          } else if (q.title) {
            // Extract episode title from download title if needed
            const match = q.title.match(/S\d+E\d+\s*[-\.]\s*(.+?)(?:\s*(?:720p|1080p|2160p|HDTV|WEB|BluRay))/i);
            episodeTitle = match ? match[1].trim() : q.title;
          }
          
          return {
            series: q.series?.title || 'Unknown',
            episode: q.episode ? `S${String(q.episode.seasonNumber).padStart(2, '0')}E${String(q.episode.episodeNumber).padStart(2, '0')}` : 'Unknown',
            episodeTitle: episodeTitle,
            progress: Math.round(q.sizeleft && q.size ? ((q.size - q.sizeleft) / q.size) * 100 : 0),
            eta: q.timeleft || 'Unknown',
            size: this.formatBytes(q.size || 0),
            status: q.status,
            quality: q.quality?.quality?.name || 'Unknown'
          };
        }).slice(0, 10) || []
      };

      // Health
      const healthData = {
        issues: health.length || 0,
        warnings: health.map(h => h.message) || []
      };

      // Genre breakdown
      const genreBreakdown = {};
      series.forEach(show => {
        show.genres?.forEach(genre => {
          genreBreakdown[genre] = (genreBreakdown[genre] || 0) + 1;
        });
      });

      return {
        // Basic stats
        series: series.length,
        episodes: totalEpisodes,
        missing: missingEpisodes,
        monitored: monitoredSeries,
        queue: queue.totalRecords || 0,
        diskSpace: this.formatBytes(usedSpace),
        diskSpaceTotal: this.formatBytes(totalSpace),
        diskSpaceFree: this.formatBytes(freeSpace),
        diskSpaceUsedPercent: Math.round((usedSpace / totalSpace) * 100),
        
        // Enhanced stats
        endedSeries,
        continuingSeries,
        totalSeasons,
        monitoredSeasons,
        recentEpisodes,
        airingToday,
        airingThisWeek,
        schedule,
        queueDetails,
        health: healthData,
        genreBreakdown,
        
        // System info
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
