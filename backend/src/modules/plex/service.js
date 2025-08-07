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
      const [identity, libraries, sessions, accounts] = await Promise.all([
        this.apiCall(config, '/identity'),
        this.apiCall(config, '/library/sections'),
        this.apiCall(config, '/status/sessions'),
        this.apiCall(config, '/accounts').catch(() => ({ MediaContainer: { size: 0 } }))
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
        totalUsers: accounts.MediaContainer?.size || 0,
        
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

  async getDuplicates(config) {
    try {
      console.log(`Fetching Plex duplicates from ${config.host}:${config.port}`);
      
      // Get all libraries first
      const libraries = await this.apiCall(config, '/library/sections');
      const duplicatesByLibrary = {};
      let totalDuplicates = 0;
      
      if (libraries.MediaContainer?.Directory) {
        console.log(`Found ${libraries.MediaContainer.Directory.length} libraries:`, 
          libraries.MediaContainer.Directory.map(l => `${l.title} (key: ${l.key}, type: ${l.type})`));
        
        for (const lib of libraries.MediaContainer.Directory) {
          try {
            const duplicatesUrl = `/library/sections/${lib.key}/duplicates`;
            console.log(`Checking duplicates for library "${lib.title}" at URL: ${duplicatesUrl}`);
            
            // Try the duplicates endpoint for this library
            const duplicates = await this.apiCall(config, duplicatesUrl);
            
            if (duplicates.MediaContainer?.Metadata && duplicates.MediaContainer.Metadata.length > 0) {
              const processedDuplicates = await Promise.all(
                duplicates.MediaContainer.Metadata.map(async (item) => {
                  // Get detailed metadata for each duplicate item
                  try {
                    const details = await this.apiCall(config, `/library/metadata/${item.ratingKey}`);
                    const metadata = details.MediaContainer?.Metadata?.[0];
                    
                    if (!metadata) return null;
                    
                    // Process media files for each duplicate
                    const files = [];
                    if (metadata.Media) {
                      for (const media of metadata.Media) {
                        if (media.Part) {
                          for (const part of media.Part) {
                            files.push({
                              file: part.file,
                              size: part.size || 0,
                              duration: part.duration || 0,
                              container: part.container,
                              videoResolution: media.videoResolution || 'Unknown',
                              bitrate: media.bitrate || 0,
                              audioChannels: media.audioChannels || 0,
                              videoCodec: media.videoCodec || 'Unknown',
                              audioCodec: media.audioCodec || 'Unknown'
                            });
                          }
                        }
                      }
                    }
                    
                    return {
                      ratingKey: metadata.ratingKey,
                      title: metadata.title,
                      year: metadata.year,
                      duration: metadata.duration,
                      addedAt: metadata.addedAt ? new Date(metadata.addedAt * 1000).toISOString() : null,
                      updatedAt: metadata.updatedAt ? new Date(metadata.updatedAt * 1000).toISOString() : null,
                      rating: metadata.rating,
                      thumb: metadata.thumb,
                      files: files,
                      totalSize: files.reduce((sum, f) => sum + (f.size || 0), 0),
                      bestQuality: files.reduce((best, current) => {
                        const currentRes = this.parseResolution(current.videoResolution);
                        const bestRes = this.parseResolution(best?.videoResolution);
                        return currentRes > bestRes ? current : best;
                      }, files[0])
                    };
                  } catch (detailError) {
                    console.error(`Error fetching details for ${item.ratingKey}:`, detailError.message);
                    return {
                      ratingKey: item.ratingKey,
                      title: item.title || 'Unknown',
                      year: item.year,
                      error: 'Could not fetch details',
                      files: []
                    };
                  }
                })
              );
              
              // Group duplicates by title
              const groupedDuplicates = {};
              processedDuplicates.filter(Boolean).forEach(duplicate => {
                const key = `${duplicate.title}_${duplicate.year || 'unknown'}`;
                if (!groupedDuplicates[key]) {
                  groupedDuplicates[key] = {
                    title: duplicate.title,
                    year: duplicate.year,
                    items: [],
                    totalSize: 0,
                    duplicateCount: 0
                  };
                }
                groupedDuplicates[key].items.push(duplicate);
                groupedDuplicates[key].totalSize += duplicate.totalSize || 0;
                groupedDuplicates[key].duplicateCount = groupedDuplicates[key].items.length;
              });
              
              // Only include groups with actual duplicates (more than 1 item)
              const actualDuplicates = Object.values(groupedDuplicates).filter(group => group.items.length > 1);
              
              if (actualDuplicates.length > 0) {
                duplicatesByLibrary[lib.title] = {
                  libraryKey: lib.key,
                  libraryType: lib.type,
                  duplicateGroups: actualDuplicates,
                  totalGroups: actualDuplicates.length,
                  totalItems: actualDuplicates.reduce((sum, group) => sum + group.items.length, 0)
                };
                
                totalDuplicates += actualDuplicates.reduce((sum, group) => sum + group.items.length, 0);
              }
            }
          } catch (libError) {
            console.error(`Error fetching duplicates for library ${lib.title}:`, libError.message);
            
            // Try alternative approach - search for duplicates manually
            if (libError.message.includes('404')) {
              console.log(`Standard duplicates endpoint not available for ${lib.title}, trying manual duplicate detection...`);
              try {
                await this.findDuplicatesManually(config, lib, duplicatesByLibrary);
              } catch (manualError) {
                console.error(`Manual duplicate detection also failed for ${lib.title}:`, manualError.message);
              }
            }
          }
        }
      }
      
      // Recalculate total duplicates including manual detection
      totalDuplicates = Object.values(duplicatesByLibrary).reduce((sum, lib) => {
        return sum + (lib.totalItems || 0);
      }, 0);
      
      return {
        success: true,
        totalDuplicates,
        libraryCount: Object.keys(duplicatesByLibrary).length,
        duplicatesByLibrary,
        scannedAt: new Date().toISOString(),
        note: Object.values(duplicatesByLibrary).some(lib => lib.detectionMethod === 'manual') 
          ? 'Some duplicates found using manual detection due to API limitations' 
          : 'Standard Plex duplicates API used'
      };
      
    } catch (error) {
      console.error('Error fetching Plex duplicates:', error.message);
      return {
        success: false,
        error: error.message,
        totalDuplicates: 0,
        libraryCount: 0,
        duplicatesByLibrary: {}
      };
    }
  }

  async findDuplicatesManually(config, library, duplicatesByLibrary) {
    console.log(`Manual duplicate detection for library: ${library.title} (${library.type})`);
    
    try {
      // Get all items in the library (first 1000 to avoid timeout)
      const allItems = await this.apiCall(config, `/library/sections/${library.key}/all?X-Plex-Container-Size=1000`);
      
      if (!allItems.MediaContainer?.Metadata) {
        console.log(`No items found in library ${library.title}`);
        return;
      }
      
      console.log(`Analyzing ${allItems.MediaContainer.Metadata.length} items for duplicates in ${library.title}...`);
      
      // Group items by title and year
      const titleGroups = {};
      
      for (const item of allItems.MediaContainer.Metadata) {
        // Create a key based on title and year
        const title = item.title?.toLowerCase().trim();
        const year = item.year || 'unknown';
        const key = `${title}_${year}`;
        
        if (!titleGroups[key]) {
          titleGroups[key] = {
            title: item.title,
            year: item.year,
            items: []
          };
        }
        
        titleGroups[key].items.push({
          ratingKey: item.ratingKey,
          title: item.title,
          year: item.year,
          addedAt: item.addedAt ? new Date(item.addedAt * 1000).toISOString() : null,
          duration: item.duration,
          rating: item.rating,
          thumb: item.thumb
        });
      }
      
      // Find groups with more than one item (potential duplicates)
      const duplicateGroups = Object.values(titleGroups).filter(group => group.items.length > 1);
      
      if (duplicateGroups.length > 0) {
        console.log(`Found ${duplicateGroups.length} potential duplicate groups in ${library.title}`);
        
        // Get detailed info for each duplicate
        const detailedDuplicates = [];
        
        for (const group of duplicateGroups.slice(0, 20)) { // Limit to first 20 groups to avoid timeout
          try {
            const detailedItems = await Promise.all(
              group.items.map(async (item) => {
                try {
                  const details = await this.apiCall(config, `/library/metadata/${item.ratingKey}`);
                  const metadata = details.MediaContainer?.Metadata?.[0];
                  
                  if (!metadata) return item;
                  
                  // Get file information
                  const files = [];
                  if (metadata.Media) {
                    for (const media of metadata.Media) {
                      if (media.Part) {
                        for (const part of media.Part) {
                          files.push({
                            file: part.file,
                            size: part.size || 0,
                            container: part.container,
                            videoResolution: media.videoResolution || 'Unknown',
                            bitrate: media.bitrate || 0
                          });
                        }
                      }
                    }
                  }
                  
                  return {
                    ...item,
                    files: files,
                    totalSize: files.reduce((sum, f) => sum + (f.size || 0), 0)
                  };
                } catch (detailError) {
                  console.error(`Error getting details for item ${item.ratingKey}:`, detailError.message);
                  return item;
                }
              })
            );
            
            detailedDuplicates.push({
              title: group.title,
              year: group.year,
              items: detailedItems,
              totalSize: detailedItems.reduce((sum, item) => sum + (item.totalSize || 0), 0),
              duplicateCount: detailedItems.length
            });
          } catch (groupError) {
            console.error(`Error processing duplicate group ${group.title}:`, groupError.message);
          }
        }
        
        if (detailedDuplicates.length > 0) {
          duplicatesByLibrary[library.title] = {
            libraryKey: library.key,
            libraryType: library.type,
            duplicateGroups: detailedDuplicates,
            totalGroups: detailedDuplicates.length,
            totalItems: detailedDuplicates.reduce((sum, group) => sum + group.items.length, 0),
            detectionMethod: 'manual'
          };
          
          console.log(`✅ Found ${detailedDuplicates.length} duplicate groups in ${library.title} using manual detection`);
        }
      } else {
        console.log(`No duplicates found in ${library.title} using manual detection`);
      }
      
    } catch (error) {
      console.error(`Manual duplicate detection failed for ${library.title}:`, error.message);
      throw error;
    }
  }

  async deleteDuplicate(config, ratingKey) {
    try {
      console.log(`Deleting Plex item ${ratingKey} from ${config.host}:${config.port}`);
      
      await this.apiCall(config, `/library/metadata/${ratingKey}`, 'DELETE');
      
      return {
        success: true,
        message: 'Item deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting Plex item:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  parseResolution(resolution) {
    if (!resolution) return 0;
    const resMap = {
      '4k': 2160,
      '2160p': 2160,
      '1080p': 1080,
      '720p': 720,
      '480p': 480,
      '360p': 360,
      'sd': 480
    };
    return resMap[resolution.toLowerCase()] || 0;
  }
}

module.exports = new PlexService();
