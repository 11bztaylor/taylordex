const BaseService = require('../../utils/baseService');

class PlexService extends BaseService {
  constructor() {
    super('Plex');
  }

  buildUrl(host, port, path) {
    const protocol = port === 443 ? 'https' : 'http';
    return `${protocol}://${host}:${port}${path}`;
  }

  getHeaders(config) {
    return {
      'X-Plex-Token': config.api_key,
      'Accept': 'application/json'
    };
  }

  async testConnection(config) {
    try {
      const url = this.buildUrl(config.host, config.port, '/identity');
      const response = await this.axios.get(url, {
        headers: this.getHeaders(config)
      });
      
      return {
        success: true,
        version: response.data.MediaContainer?.version || 'Unknown',
        message: `Connected to ${response.data.MediaContainer?.friendlyName || 'Plex'}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error.response?.data || 'Connection failed'
      };
    }
  }

  async getStats(config) {
    try {
      // Get library sections
      const libraries = await this.apiCall(config, '/library/sections');
      const identity = await this.apiCall(config, '/identity');
      
      let totalMovies = 0;
      let totalShows = 0;
      let totalMusic = 0;
      let totalPhotos = 0;
      
      // Count items in each library
      if (libraries.MediaContainer?.Directory) {
        for (const lib of libraries.MediaContainer.Directory) {
          const libStats = await this.apiCall(config, `/library/sections/${lib.key}/all?X-Plex-Container-Start=0&X-Plex-Container-Size=0`);
          const count = libStats.MediaContainer?.totalSize || 0;
          
          switch (lib.type) {
            case 'movie':
              totalMovies += count;
              break;
            case 'show':
              totalShows += count;
              break;
            case 'artist':
              totalMusic += count;
              break;
            case 'photo':
              totalPhotos += count;
              break;
          }
        }
      }

      // Get active sessions
      const sessions = await this.apiCall(config, '/status/sessions');
      const activeStreams = sessions.MediaContainer?.size || 0;

      return {
        serverName: identity.MediaContainer?.friendlyName || 'Plex Server',
        movies: totalMovies,
        shows: totalShows,
        music: totalMusic,
        photos: totalPhotos,
        libraries: libraries.MediaContainer?.size || 0,
        activeStreams: activeStreams,
        version: identity.MediaContainer?.version || 'Unknown',
        status: 'online'
      };
    } catch (error) {
      console.error('Error fetching Plex stats:', error.message);
      return {
        serverName: 'Unknown',
        movies: 0,
        shows: 0,
        music: 0,
        photos: 0,
        libraries: 0,
        activeStreams: 0,
        version: 'Unknown',
        status: 'error',
        error: error.message
      };
    }
  }
}

module.exports = new PlexService();
