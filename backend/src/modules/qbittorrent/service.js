const BaseService = require('../../utils/baseService');

class QBittorrentService extends BaseService {
  constructor() {
    super('qBittorrent');
  }

  getHeaders(config) {
    return {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': this.buildUrl(config.host, config.port)
    };
  }

  async authenticate(config) {
    try {
      const loginUrl = this.buildUrl(config.host, config.port, '/api/v2/auth/login');
      const formData = new URLSearchParams();
      
      // Support both individual fields and api_key (formatted as username:password)
      let username, password;
      
      if (config.api_key && config.api_key.includes(':')) {
        // If api_key is in format "username:password"
        [username, password] = config.api_key.split(':');
      } else {
        // Use individual fields or defaults
        username = config.username || 'admin';
        password = config.password || config.api_key || '';
      }
      
      formData.append('username', username);
      formData.append('password', password);

      const response = await this.axios.post(loginUrl, formData, {
        headers: this.getHeaders(config),
        withCredentials: true
      });

      // Store cookies for subsequent requests
      if (response.headers['set-cookie']) {
        this.cookies = response.headers['set-cookie'];
      }

      return response.data === 'Ok.';
    } catch (error) {
      console.error('qBittorrent authentication failed:', {
        message: error.message,
        host: config.host,
        port: config.port,
        hasApiKey: !!config.api_key,
        response: error.response?.data
      });
      throw new Error(`Authentication failed: ${error.response?.data || error.message}`);
    }
  }

  async apiCall(config, endpoint, options = {}) {
    // Authenticate first
    await this.authenticate(config);

    const url = this.buildUrl(config.host, config.port, endpoint);
    const headers = {
      ...this.getHeaders(config),
      'Cookie': this.cookies ? this.cookies.join('; ') : ''
    };

    return this.makeRequest(url, {
      ...options,
      headers
    });
  }

  async getStats(config) {
    try {
      console.log(`Fetching comprehensive qBittorrent stats from ${config.host}:${config.port}`);
      
      // Parallel API calls for performance
      const [
        torrents,
        globalStats,
        preferences,
        version
      ] = await Promise.all([
        this.apiCall(config, '/api/v2/torrents/info'),
        this.apiCall(config, '/api/v2/transfer/info'),
        this.apiCall(config, '/api/v2/app/preferences').catch(() => ({})),
        this.apiCall(config, '/api/v2/app/version').catch(() => 'Unknown')
      ]);

      // Process torrent data
      const totalTorrents = torrents.length;
      const activeTorrents = torrents.filter(t => 
        t.state === 'downloading' || t.state === 'uploading' || t.state === 'stalledUP' || t.state === 'stalledDL'
      ).length;
      const downloadingTorrents = torrents.filter(t => 
        t.state === 'downloading' || t.state === 'stalledDL'
      ).length;
      const seedingTorrents = torrents.filter(t => 
        t.state === 'uploading' || t.state === 'stalledUP'
      ).length;
      const completedTorrents = torrents.filter(t => t.state === 'queuedUP' || t.state === 'uploading').length;
      const pausedTorrents = torrents.filter(t => t.state === 'pausedDL' || t.state === 'pausedUP').length;

      // Status breakdown
      const statusBreakdown = {};
      torrents.forEach(torrent => {
        const status = this.getStatusDisplay(torrent.state);
        statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      });

      // Category breakdown
      const categoryBreakdown = {};
      torrents.forEach(torrent => {
        const category = torrent.category || 'Uncategorized';
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
      });

      // Active downloads with progress
      const activeDownloads = torrents
        .filter(t => t.state === 'downloading' || t.state === 'stalledDL' || (t.progress < 1 && t.progress > 0))
        .sort((a, b) => b.progress - a.progress)
        .slice(0, 10)
        .map(torrent => ({
          name: torrent.name,
          progress: Math.round(torrent.progress * 100),
          size: this.formatBytes(torrent.size),
          downloaded: this.formatBytes(torrent.downloaded),
          downloadSpeed: this.formatSpeed(torrent.dlspeed),
          eta: this.formatETA(torrent.eta),
          seeds: `${torrent.num_seeds} (${torrent.num_complete})`,
          ratio: torrent.ratio.toFixed(2),
          category: torrent.category || 'None',
          state: this.getStatusDisplay(torrent.state)
        }));

      // Recent completions (last 7 days)
      const sevenDaysAgo = Date.now() / 1000 - (7 * 24 * 60 * 60);
      const recentCompletions = torrents
        .filter(t => t.completion_on > sevenDaysAgo && t.completion_on > 0)
        .sort((a, b) => b.completion_on - a.completion_on)
        .slice(0, 10)
        .map(torrent => ({
          name: torrent.name,
          completedDate: new Date(torrent.completion_on * 1000).toISOString(),
          size: this.formatBytes(torrent.size),
          ratio: torrent.ratio.toFixed(2),
          category: torrent.category || 'None'
        }));

      // Calculate storage usage
      const totalSize = torrents.reduce((sum, t) => sum + t.size, 0);
      const downloadedSize = torrents.reduce((sum, t) => sum + t.downloaded, 0);
      const uploadedSize = torrents.reduce((sum, t) => sum + t.uploaded, 0);

      // Get free space from preferences
      const downloadPath = preferences.save_path || '/downloads';
      const freeSpace = globalStats.free_space_on_disk || 0;

      return {
        // Basic stats
        torrents: totalTorrents,
        active: activeTorrents,
        downloading: downloadingTorrents,
        seeding: seedingTorrents,
        completed: completedTorrents,
        paused: pausedTorrents,
        
        // Transfer stats
        downloadSpeed: this.formatSpeed(globalStats.dl_info_speed || 0),
        uploadSpeed: this.formatSpeed(globalStats.up_info_speed || 0),
        globalRatio: globalStats.global_ratio ? globalStats.global_ratio.toFixed(2) : '0.00',
        
        // Data stats
        totalSize: this.formatBytes(totalSize),
        downloaded: this.formatBytes(downloadedSize),
        uploaded: this.formatBytes(uploadedSize),
        
        // Storage
        diskSpace: this.formatBytes(totalSize),
        diskSpaceFree: this.formatBytes(freeSpace),
        diskSpaceTotal: this.formatBytes(totalSize + freeSpace),
        diskSpaceUsedPercent: Math.round((totalSize / (totalSize + freeSpace)) * 100),
        
        // Enhanced data
        activeDownloads,
        recentCompletions,
        statusBreakdown,
        categoryBreakdown,
        
        // Storage paths (simplified for qBittorrent)
        storagePaths: [{
          path: downloadPath,
          label: 'Downloads',
          totalSpace: totalSize + freeSpace,
          freeSpace: freeSpace,
          usedSpace: totalSize,
          usedPercent: Math.round((totalSize / (totalSize + freeSpace)) * 100),
          accessible: true,
          isDuplicate: false,
          isDockerMount: downloadPath.startsWith('/') && !downloadPath.startsWith('/mnt'),
          dockerHost: config.host !== 'localhost' && config.host !== '127.0.0.1' ? config.host : null,
          isPrimary: true
        }],
        
        // System info
        version: version || 'Unknown',
        downloadPath: downloadPath,
        status: 'online'
      };

    } catch (error) {
      console.error('Error fetching qBittorrent stats:', error.message);
      return {
        torrents: 0,
        active: 0,
        downloading: 0,
        seeding: 0,
        completed: 0,
        paused: 0,
        downloadSpeed: '0 B/s',
        uploadSpeed: '0 B/s',
        globalRatio: '0.00',
        diskSpace: 'N/A',
        version: 'Unknown',
        status: 'error',
        error: error.message
      };
    }
  }

  getStatusDisplay(state) {
    const statusMap = {
      'downloading': 'Downloading',
      'uploading': 'Seeding',
      'stalledUP': 'Seeding (Stalled)',
      'stalledDL': 'Downloading (Stalled)', 
      'queuedUP': 'Queued (Seed)',
      'queuedDL': 'Queued (Download)',
      'pausedUP': 'Paused (Seed)',
      'pausedDL': 'Paused (Download)',
      'checkingUP': 'Checking',
      'checkingDL': 'Checking',
      'error': 'Error',
      'missingFiles': 'Missing Files',
      'allocating': 'Allocating'
    };
    return statusMap[state] || state;
  }

  formatSpeed(bytesPerSecond) {
    if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatETA(seconds) {
    if (!seconds || seconds === 8640000) return '∞';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
  }

  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async testConnection(config) {
    try {
      const authenticated = await this.authenticate(config);
      if (!authenticated) {
        throw new Error('Authentication failed');
      }
      
      const version = await this.apiCall(config, '/api/v2/app/version');
      return {
        success: true,
        version: version || 'Unknown',
        message: 'Connected to qBittorrent successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: 'Check username/password and ensure Web UI is enabled'
      };
    }
  }
}

module.exports = new QBittorrentService();