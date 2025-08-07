const BaseService = require('../../utils/baseService');

class SonarrConfigService extends BaseService {
  constructor() {
    super('SonarrConfig');
  }

  getHeaders(config) {
    return {
      'X-Api-Key': config.api_key
    };
  }

  /**
   * Get all configuration and management capabilities from Sonarr
   */
  async getFullConfiguration(config) {
    try {
      console.log(`📋 Fetching complete Sonarr configuration from ${config.host}:${config.port}`);
      
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
        releaseProfiles,
        languageProfiles,
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
        this.apiCall(config, '/api/v3/releaseprofile').catch(() => []),
        this.apiCall(config, '/api/v3/languageprofile').catch(() => []),
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
            upgradeAllowed: p.upgradeAllowed
          }))
        },
        
        languageProfiles: {
          count: languageProfiles.length,
          profiles: languageProfiles.map(p => ({
            id: p.id,
            name: p.name,
            cutoff: p.cutoff,
            languages: p.languages?.map(l => l.language?.name).filter(Boolean)
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
        
        releaseProfiles: {
          count: releaseProfiles.length,
          list: releaseProfiles.map(rp => ({
            id: rp.id,
            name: rp.name,
            enabled: rp.enabled,
            required: rp.required?.length || 0,
            ignored: rp.ignored?.length || 0,
            preferred: rp.preferred?.length || 0
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
          renameEpisodes: namingConfig.renameEpisodes,
          replaceIllegalCharacters: namingConfig.replaceIllegalCharacters,
          multiEpisodeStyle: namingConfig.multiEpisodeStyle,
          standardEpisodeFormat: namingConfig.standardEpisodeFormat,
          dailyEpisodeFormat: namingConfig.dailyEpisodeFormat,
          animeEpisodeFormat: namingConfig.animeEpisodeFormat,
          seriesFolderFormat: namingConfig.seriesFolderFormat,
          seasonFolderFormat: namingConfig.seasonFolderFormat
        } : null,
        
        mediaManagement: mediaManagement ? {
          autoUnmonitorPreviouslyDownloadedEpisodes: mediaManagement.autoUnmonitorPreviouslyDownloadedEpisodes,
          recycleBin: mediaManagement.recycleBin,
          recycleBinCleanupDays: mediaManagement.recycleBinCleanupDays,
          downloadPropersAndRepacks: mediaManagement.downloadPropersAndRepacks,
          createEmptySeriesFolders: mediaManagement.createEmptySeriesFolders,
          deleteEmptyFolders: mediaManagement.deleteEmptyFolders,
          fileDate: mediaManagement.fileDate,
          rescanAfterRefresh: mediaManagement.rescanAfterRefresh,
          setPermissionsLinux: mediaManagement.setPermissionsLinux,
          chmodFolder: mediaManagement.chmodFolder,
          chownGroup: mediaManagement.chownGroup
        } : null,
        
        ui: uiConfig ? {
          firstDayOfWeek: uiConfig.firstDayOfWeek,
          calendarWeekColumnHeader: uiConfig.calendarWeekColumnHeader,
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
            series: q.series?.title,
            episode: q.episode?.title,
            seasonNumber: q.episode?.seasonNumber,
            episodeNumber: q.episode?.episodeNumber,
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
          next7Days: calendar.filter(e => {
            const airDate = new Date(e.airDateUtc);
            const daysUntil = (airDate - new Date()) / (1000 * 60 * 60 * 24);
            return daysUntil >= 0 && daysUntil <= 7;
          }).length,
          todayAiring: calendar.filter(e => {
            const airDate = new Date(e.airDateUtc);
            const today = new Date();
            return airDate.toDateString() === today.toDateString();
          }).length
        },
        
        history: {
          totalRecords: history.totalRecords || 0,
          recent: history.records?.slice(0, 10).map(h => ({
            seriesTitle: h.series?.title,
            episodeTitle: h.episode?.title,
            seasonNumber: h.episode?.seasonNumber,
            episodeNumber: h.episode?.episodeNumber,
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
      console.error('Error fetching Sonarr configuration:', error.message);
      throw error;
    }
  }

  /**
   * Get available actions that can be performed
   */
  async getAvailableActions(config) {
    return {
      series: {
        search: 'Trigger search for specific series or episode',
        refresh: 'Refresh series metadata',
        rename: 'Rename episode files according to naming config',
        delete: 'Remove series from library',
        edit: 'Update series settings (monitored, quality profile, etc)',
        seasonPass: 'Bulk edit monitoring for seasons'
      },
      
      episodes: {
        search: 'Search for specific episode',
        monitor: 'Change episode monitoring status',
        unmonitor: 'Stop monitoring episode',
        markAsFailed: 'Mark download as failed',
        manualSearch: 'Search for episode manually'
      },
      
      system: {
        backup: 'Create database backup',
        updates: 'Check for and install updates',
        restart: 'Restart Sonarr service',
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
        import: 'Bulk import series',
        massEdit: 'Edit multiple series at once',
        rescan: 'Rescan library folders',
        rssSync: 'Trigger RSS sync',
        backup: 'Export library to file',
        seasonPass: 'Manage season monitoring in bulk'
      }
    };
  }

  /**
   * Execute a series search
   */
  async searchSeries(config, seriesId) {
    try {
      const response = await this.apiCall(config, `/api/v3/command`, 'POST', {
        name: 'SeriesSearch',
        seriesId: seriesId
      });
      return { success: true, commandId: response.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute an episode search
   */
  async searchEpisode(config, episodeIds) {
    try {
      const response = await this.apiCall(config, `/api/v3/command`, 'POST', {
        name: 'EpisodeSearch',
        episodeIds: Array.isArray(episodeIds) ? episodeIds : [episodeIds]
      });
      return { success: true, commandId: response.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Refresh series metadata
   */
  async refreshSeries(config, seriesId) {
    try {
      const response = await this.apiCall(config, `/api/v3/command`, 'POST', {
        name: 'RefreshSeries',
        seriesId: seriesId
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

  /**
   * Get missing episodes
   */
  async getMissingEpisodes(config, pageSize = 50) {
    try {
      const response = await this.apiCall(config, `/api/v3/wanted/missing?pageSize=${pageSize}&sortKey=airDateUtc&sortDirection=descending`);
      return {
        success: true,
        totalRecords: response.totalRecords,
        episodes: response.records?.map(e => ({
          id: e.id,
          seriesTitle: e.series?.title,
          seasonNumber: e.seasonNumber,
          episodeNumber: e.episodeNumber,
          title: e.title,
          airDate: e.airDateUtc,
          monitored: e.monitored
        }))
      };
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

module.exports = new SonarrConfigService();