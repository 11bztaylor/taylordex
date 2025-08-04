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
      console.log(`Fetching comprehensive Plex stats from ${config.host}:${config.port}`);
      
      // Get basic server info and libraries
      const [identity, libraries, sessions] = await Promise.all([
        this.apiCall(config, '/identity'),
        this.apiCall(config, '/library/sections'),
        this.apiCall(config, '/status/sessions')
      ]);

      let totalMovies = 0;
      let totalShows = 0;
      let totalMusic = 0;
      let totalPhotos = 0;
      let totalEpisodes = 0;
      
      // Detailed library stats
      const libraryDetails = [];
      
      if (libraries.MediaContainer?.Directory) {
        for (const lib of libraries.MediaContainer.Directory) {
          const libStats = await this.apiCall(config, `/library/sections/${lib.key}/all?X-Plex-Container-Start=0&X-Plex-Container-Size=0`);
          const count = libStats.MediaContainer?.totalSize || 0;
          
          libraryDetails.push({
            name: lib.title,
            type: lib.type,
            count: count,
            agent: lib.agent,
            scanner: lib.scanner,
            refreshing: lib.refreshing || false
          });
          
          switch (lib.type) {
            case 'movie':
              totalMovies += count;
              break;
            case 'show':
              totalShows += count;
              // Get episode count for shows
              if (count > 0) {
                try {
                  const episodes = await this.apiCall(config, `/library/sections/${lib.key}/all?type=4&X-Plex-Container-Start=0&X-Plex-Container-Size=0`);
                  totalEpisodes += episodes.MediaContainer?.totalSize || 0;
                } catch (e) {
                  console.log('Could not fetch episode count');
                }
              }
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

      // Recently added (last 50 items across all libraries)
      let recentlyAdded = [];
      try {
        const recent = await this.apiCall(config, '/library/recentlyAdded?X-Plex-Container-Start=0&X-Plex-Container-Size=20');
        if (recent.MediaContainer?.Metadata) {
          recentlyAdded = recent.MediaContainer.Metadata.map(item => ({
            title: item.title || item.grandparentTitle,
            type: item.type,
            added: new Date(item.addedAt * 1000).toLocaleString(),
            year: item.year,
            rating: item.rating,
            thumb: item.thumb
          }));
        }
      } catch (e) {
        console.log('Could not fetch recently added');
      }

      // Current streams detailed
      const currentStreams = [];
      const activeStreams = sessions.MediaContainer?.size || 0;
      
      if (sessions.MediaContainer?.Metadata) {
        for (const session of sessions.MediaContainer.Metadata) {
          const user = session.User?.title || 'Unknown';
          const player = session.Player?.title || 'Unknown';
          const isTranscoding = session.TranscodeSession ? true : false;
          
          currentStreams.push({
            user: user,
            media: session.title || session.grandparentTitle,
            type: isTranscoding ? 'Transcode' : 'Direct Play',
            progress: Math.round((session.viewOffset / session.duration) * 100) || 0,
            player: player,
            quality: session.Media?.[0]?.videoResolution || 'Unknown',
            bandwidth: session.Session?.bandwidth ? `${Math.round(session.Session.bandwidth / 1000)} Mbps` : 'Unknown'
          });
        }
      }

      // Server resources (if available)
      let performance = {
        transcoding: currentStreams.filter(s => s.type === 'Transcode').length
      };

      // Get server preferences for more details
      try {
        const prefs = await this.apiCall(config, '/:/prefs');
        // Extract useful preferences if needed
      } catch (e) {
        console.log('Could not fetch server preferences');
      }

      // Calculate bandwidth
      const totalBandwidth = sessions.MediaContainer?.Metadata?.reduce((sum, session) => {
        return sum + (session.Session?.bandwidth || 0);
      }, 0) || 0;

      return {
        // Basic stats
        serverName: identity.MediaContainer?.friendlyName || 'Plex Server',
        movies: totalMovies,
        shows: totalShows,
        episodes: totalEpisodes,
        music: totalMusic,
        photos: totalPhotos,
        libraries: libraries.MediaContainer?.size || 0,
        activeStreams: activeStreams,
        
        // Enhanced stats
        libraryDetails,
        recentlyAdded,
        currentStreams,
        performance: {
          ...performance,
          bandwidth: totalBandwidth ? `${Math.round(totalBandwidth / 1000)} Mbps` : '0 Mbps',
          transcodeSessions: performance.transcoding,
          directPlaySessions: activeStreams - performance.transcoding
        },
        
        // System info
        version: identity.MediaContainer?.version || 'Unknown',
        platform: identity.MediaContainer?.platform || 'Unknown',
        platformVersion: identity.MediaContainer?.platformVersion || 'Unknown',
        status: 'online'
      };
    } catch (error) {
      console.error('Error fetching Plex stats:', error.message);
      return {
        serverName: 'Unknown',
        movies: 0,
        shows: 0,
        episodes: 0,
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
