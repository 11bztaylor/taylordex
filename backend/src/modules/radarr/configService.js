const BaseService = require('../../utils/baseService');

class RadarrConfigService extends BaseService {
  constructor() {
    super('RadarrConfig');
  }

  getHeaders(config) {
    return {
      'X-Api-Key': config.api_key
    };
  }

  /**
   * Get all configuration and management capabilities from Radarr
   */
  async getFullConfiguration(config) {
    try {
      console.log(`📋 Fetching complete Radarr configuration from ${config.host}:${config.port}`);
      
      // Fetch all configuration endpoints in parallel
      const [
        qualityProfiles,
        rootFolders,
        indexers,
        downloadClients,
        notifications,
        metadata,
        customFormats,
        namingConfig,
        uiConfig,
        mediaManagement,
        importLists,
        restrictions,
        tags,
        queue,
        calendar,
        history,
        wanted,
        blocklist
      ] = await Promise.all([
        this.apiCall(config, '/api/v3/qualityprofile').catch(() => []),
        this.apiCall(config, '/api/v3/rootfolder').catch(() => []),
        this.apiCall(config, '/api/v3/indexer').catch(() => []),
        this.apiCall(config, '/api/v3/downloadclient').catch(() => []),
        this.apiCall(config, '/api/v3/notification').catch(() => []),
        this.apiCall(config, '/api/v3/metadata').catch(() => []),
        this.apiCall(config, '/api/v3/customformat').catch(() => []),
        this.apiCall(config, '/api/v3/config/naming').catch(() => {}),
        this.apiCall(config, '/api/v3/config/ui').catch(() => {}),
        this.apiCall(config, '/api/v3/config/mediamanagement').catch(() => {}),
        this.apiCall(config, '/api/v3/importlist').catch(() => []),
        this.apiCall(config, '/api/v3/restriction').catch(() => []),
        this.apiCall(config, '/api/v3/tag').catch(() => []),
        this.apiCall(config, '/api/v3/queue').catch(() => ({ records: [] })),
        this.apiCall(config, '/api/v3/calendar').catch(() => []),
        this.apiCall(config, '/api/v3/history').catch(() => ({ records: [] })),
        this.apiCall(config, '/api/v3/wanted/missing').catch(() => ({ records: [] })),
        this.apiCall(config, '/api/v3/blocklist').catch(() => ({ records: [] }))
      ]);

      return {
        // Configuration
        qualityProfiles: {
          count: qualityProfiles.length,
          profiles: qualityProfiles.map(p => ({
            id: p.id,
            name: p.name,
            cutoff: p.cutoff,
            minFormatScore: p.minFormatScore,
            cutoffFormatScore: p.cutoffFormatScore,
            upgradeAllowed: p.upgradeAllowed
          }))
        },
        
        rootFolders: {
          count: rootFolders.length,
          folders: rootFolders.map(f => ({
            id: f.id,
            path: f.path,
            accessible: f.accessible,
            freeSpace: this.formatBytes(f.freeSpace),
            totalSpace: this.formatBytes(f.totalSpace),
            unmappedFolders: f.unmappedFolders?.length || 0
          }))
        },
        
        indexers: {
          count: indexers.length,
          enabled: indexers.filter(i => i.enable).length,
          list: indexers.map(i => ({
            id: i.id,
            name: i.name,
            protocol: i.protocol,
            enabled: i.enable,
            priority: i.priority,
            supportsRss: i.supportsRss,
            supportsSearch: i.supportsSearch
          }))
        },
        
        downloadClients: {
          count: downloadClients.length,
          enabled: downloadClients.filter(d => d.enable).length,
          list: downloadClients.map(d => ({
            id: d.id,
            name: d.name,
            protocol: d.protocol,
            enabled: d.enable,
            priority: d.priority
          }))
        },
        
        notifications: {
          count: notifications.length,
          enabled: notifications.filter(n => n.enable).length,
          types: [...new Set(notifications.map(n => n.implementation))]
        },
        
        customFormats: {
          count: customFormats.length,
          list: customFormats.map(cf => ({
            id: cf.id,
            name: cf.name,
            includeCustomFormatWhenRenaming: cf.includeCustomFormatWhenRenaming
          }))
        },
        
        tags: {
          count: tags.length,
          list: tags.map(t => ({
            id: t.id,
            label: t.label
          }))
        },
        
        importLists: {
          count: importLists.length,
          enabled: importLists.filter(i => i.enabled).length,
          types: [...new Set(importLists.map(i => i.listType))]
        },
        
        // Settings
        naming: namingConfig ? {
          renameMovies: namingConfig.renameMovies,
          replaceIllegalCharacters: namingConfig.replaceIllegalCharacters,
          colonReplacementFormat: namingConfig.colonReplacementFormat,
          standardMovieFormat: namingConfig.standardMovieFormat,
          movieFolderFormat: namingConfig.movieFolderFormat
        } : null,
        
        mediaManagement: mediaManagement ? {
          autoUnmonitorPreviouslyDownloadedMovies: mediaManagement.autoUnmonitorPreviouslyDownloadedMovies,
          recycleBin: mediaManagement.recycleBin,
          recycleBinCleanupDays: mediaManagement.recycleBinCleanupDays,
          downloadPropersAndRepacks: mediaManagement.downloadPropersAndRepacks,
          createEmptyMovieFolders: mediaManagement.createEmptyMovieFolders,
          deleteEmptyFolders: mediaManagement.deleteEmptyFolders,
          fileDate: mediaManagement.fileDate,
          rescanAfterRefresh: mediaManagement.rescanAfterRefresh,
          autoRenameFolders: mediaManagement.autoRenameFolders,
          pathsDefaultStatic: mediaManagement.pathsDefaultStatic
        } : null,
        
        ui: uiConfig ? {
          firstDayOfWeek: uiConfig.firstDayOfWeek,
          calendarWeekColumnHeader: uiConfig.calendarWeekColumnHeader,
          movieRuntimeFormat: uiConfig.movieRuntimeFormat,
          shortDateFormat: uiConfig.shortDateFormat,
          longDateFormat: uiConfig.longDateFormat,
          timeFormat: uiConfig.timeFormat,
          showRelativeDates: uiConfig.showRelativeDates,
          enableColorImpairedMode: uiConfig.enableColorImpairedMode
        } : null,
        
        // Activity
        queue: {
          count: queue.records?.length || 0,
          downloading: queue.records?.filter(q => q.status === 'downloading').length || 0,
          items: queue.records?.slice(0, 10).map(q => ({
            title: q.title,
            status: q.status,
            size: this.formatBytes(q.size),
            sizeleft: this.formatBytes(q.sizeleft),
            timeleft: q.timeleft,
            estimatedCompletionTime: q.estimatedCompletionTime,
            downloadClient: q.downloadClient,
            indexer: q.indexer
          })) || []
        },
        
        calendar: {
          upcoming: calendar.length,
          next7Days: calendar.filter(m => {
            const releaseDate = new Date(m.digitalRelease || m.physicalRelease || m.inCinemas);
            const daysUntil = (releaseDate - new Date()) / (1000 * 60 * 60 * 24);
            return daysUntil >= 0 && daysUntil <= 7;
          }).length
        },
        
        history: {
          totalRecords: history.totalRecords || 0,
          recent: history.records?.slice(0, 10).map(h => ({
            movieTitle: h.movie?.title,
            eventType: h.eventType,
            date: h.date,
            quality: h.quality?.quality?.name,
            data: h.data
          })) || []
        },
        
        wanted: {
          missing: wanted.totalRecords || 0,
          cutoffUnmet: 0 // Would need separate API call
        },
        
        blocklist: {
          count: blocklist.totalRecords || 0
        }
      };

    } catch (error) {
      console.error('Error fetching Radarr configuration:', error.message);
      throw error;
    }
  }

  /**
   * Get available actions that can be performed
   */
  async getAvailableActions(config) {
    return {
      movies: {
        search: 'Trigger search for specific movie',
        refresh: 'Refresh movie metadata',
        rename: 'Rename movie files according to naming config',
        delete: 'Remove movie from library',
        edit: 'Update movie settings (monitored, quality profile, etc)',
        import: 'Import movie from filesystem'
      },
      
      system: {
        backup: 'Create database backup',
        updates: 'Check for and install updates',
        restart: 'Restart Radarr service',
        tasks: 'View and trigger system tasks',
        logs: 'View application logs'
      },
      
      downloads: {
        grab: 'Download specific release',
        queue: 'Manage download queue',
        history: 'View download history',
        blocklist: 'Manage blocklist entries',
        manualImport: 'Manually import downloaded files'
      },
      
      library: {
        import: 'Bulk import movies',
        massEdit: 'Edit multiple movies at once',
        rescan: 'Rescan library folders',
        rssSync: 'Trigger RSS sync',
        backup: 'Export library to file'
      }
    };
  }

  /**
   * Execute a movie search
   */
  async searchMovie(config, movieId) {
    try {
      const response = await this.apiCall(config, `/api/v3/command`, 'POST', {
        name: 'MoviesSearch',
        movieIds: [movieId]
      });
      return { success: true, commandId: response.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Refresh movie metadata
   */
  async refreshMovie(config, movieId) {
    try {
      const response = await this.apiCall(config, `/api/v3/command`, 'POST', {
        name: 'RefreshMovie',
        movieId: movieId
      });
      return { success: true, commandId: response.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Trigger RSS Sync
   */
  async rssSync(config) {
    try {
      const response = await this.apiCall(config, `/api/v3/command`, 'POST', {
        name: 'RssSync'
      });
      return { success: true, commandId: response.id };
    } catch (error) {
      return { success: false, error: error.message };
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

module.exports = new RadarrConfigService();