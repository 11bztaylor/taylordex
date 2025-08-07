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
                      bestQuality: this.getBestQualityFile(files),
                      worstQuality: this.getWorstQualityFile(files)
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
      // Get all items in the library (increased to 5000 for large libraries)
      const allItems = await this.apiCall(config, `/library/sections/${library.key}/all?X-Plex-Container-Size=5000`);
      
      if (!allItems.MediaContainer?.Metadata) {
        console.log(`No items found in library ${library.title}`);
        return;
      }
      
      console.log(`Analyzing ${allItems.MediaContainer.Metadata.length} items for duplicates in ${library.title}...`);
      
      // Enhanced grouping with fuzzy matching and multiple strategies
      const titleGroups = {};
      
      for (const item of allItems.MediaContainer.Metadata) {
        const originalTitle = item.title || '';
        const year = item.year || 'unknown';
        
        // Multiple matching strategies
        const matchingKeys = this.generateMatchingKeys(originalTitle, year);
        
        let matched = false;
        
        // Try to match with existing groups using any of the keys
        for (const [existingKey, group] of Object.entries(titleGroups)) {
          if (this.isLikelyDuplicate(matchingKeys, existingKey, originalTitle, group.items[0]?.title)) {
            group.items.push({
              ratingKey: item.ratingKey,
              title: item.title,
              year: item.year,
              originalTitle: item.originalTitle,
              sortTitle: item.titleSort,
              addedAt: item.addedAt ? new Date(item.addedAt * 1000).toISOString() : null,
              duration: item.duration,
              rating: item.rating,
              thumb: item.thumb,
              guid: item.guid
            });
            matched = true;
            break;
          }
        }
        
        // If no match found, create new group
        if (!matched) {
          const primaryKey = matchingKeys[0]; // Use the normalized title as primary key
          titleGroups[primaryKey] = {
            title: originalTitle,
            year: year,
            matchingKeys: matchingKeys,
            items: [{
              ratingKey: item.ratingKey,
              title: item.title,
              year: item.year,
              originalTitle: item.originalTitle,
              sortTitle: item.titleSort,
              addedAt: item.addedAt ? new Date(item.addedAt * 1000).toISOString() : null,
              duration: item.duration,
              rating: item.rating,
              thumb: item.thumb,
              guid: item.guid
            }]
          };
        }
      }
      
      // Find groups with more than one item (potential duplicates)
      const duplicateGroups = Object.values(titleGroups).filter(group => group.items.length > 1);
      
      if (duplicateGroups.length > 0) {
        console.log(`Found ${duplicateGroups.length} potential duplicate groups in ${library.title}`);
        
        // Sort by number of duplicates (highest first) to prioritize items with most copies
        duplicateGroups.sort((a, b) => b.items.length - a.items.length);
        
        console.log(`Duplicate counts: ${duplicateGroups.map(g => `"${g.title}" (${g.items.length} copies)`).slice(0, 5).join(', ')}`);
        
        // Get detailed info for each duplicate
        const detailedDuplicates = [];
        
        for (const group of duplicateGroups.slice(0, 50)) { // Increased to 50 groups to catch many more duplicates
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
                  
                  // Calculate quality scores for each file
                  const filesWithScores = files.map(file => ({
                    ...file,
                    qualityScore: this.calculateQualityScore(file)
                  }));
                  
                  return {
                    ...item,
                    files: filesWithScores,
                    totalSize: files.reduce((sum, f) => sum + (f.size || 0), 0),
                    bestQuality: this.getBestQualityFile(files),
                    worstQuality: this.getWorstQualityFile(files),
                    qualityRange: `${this.getWorstQualityFile(files)?.videoResolution || 'Unknown'} - ${this.getBestQualityFile(files)?.videoResolution || 'Unknown'}`
                  };
                } catch (detailError) {
                  console.error(`Error getting details for item ${item.ratingKey}:`, detailError.message);
                  return item;
                }
              })
            );
            
            // Sort items by quality score (best first)
            detailedItems.sort((a, b) => {
              const aScore = a.bestQuality ? this.calculateQualityScore(a.bestQuality) : 0;
              const bScore = b.bestQuality ? this.calculateQualityScore(b.bestQuality) : 0;
              return bScore - aScore;
            });
            
            // Calculate comprehensive duplicate group statistics
            const totalSize = detailedItems.reduce((sum, item) => sum + (item.totalSize || 0), 0);
            const averageSize = totalSize / detailedItems.length;
            const qualityScores = detailedItems.map(item => 
              item.bestQuality ? this.calculateQualityScore(item.bestQuality) : 0
            );
            const avgQualityScore = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
            
            // Find potential deletion candidates (lowest quality items)
            const suggestedDeletions = detailedItems
              .slice(1) // Keep the best quality one
              .filter(item => {
                const itemScore = item.bestQuality ? this.calculateQualityScore(item.bestQuality) : 0;
                return itemScore < avgQualityScore * 0.8; // Suggest items that are significantly below average
              });
            
            detailedDuplicates.push({
              title: group.title,
              year: group.year,
              items: detailedItems,
              duplicateCount: detailedItems.length,
              totalSize: totalSize,
              averageSize: averageSize,
              qualityAnalysis: {
                averageScore: Math.round(avgQualityScore),
                bestItem: detailedItems[0], // First item after sorting by quality
                worstItem: detailedItems[detailedItems.length - 1],
                qualityRange: qualityScores.length > 1 ? 
                  `${Math.min(...qualityScores)}-${Math.max(...qualityScores)}` : 
                  qualityScores[0]?.toString() || '0'
              },
              suggestions: {
                deletionCandidates: suggestedDeletions.length,
                potentialSavings: suggestedDeletions.reduce((sum, item) => sum + (item.totalSize || 0), 0),
                recommendation: detailedItems.length >= 5 ? 'HIGH_PRIORITY' : 
                              detailedItems.length >= 3 ? 'MEDIUM_PRIORITY' : 'LOW_PRIORITY'
              }
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
          
          // Log detailed statistics
          const highPriority = detailedDuplicates.filter(d => d.suggestions.recommendation === 'HIGH_PRIORITY').length;
          const mediumPriority = detailedDuplicates.filter(d => d.suggestions.recommendation === 'MEDIUM_PRIORITY').length;
          const totalPotentialSavings = detailedDuplicates.reduce((sum, d) => sum + d.suggestions.potentialSavings, 0);
          const savingsGB = (totalPotentialSavings / (1024 * 1024 * 1024)).toFixed(1);
          
          console.log(`📊 Duplicate statistics for ${library.title}:`);
          console.log(`   - High priority (5+ copies): ${highPriority} groups`);
          console.log(`   - Medium priority (3-4 copies): ${mediumPriority} groups`);
          console.log(`   - Potential space savings: ${savingsGB} GB`);
          console.log(`   - Top duplicates: ${detailedDuplicates.slice(0, 3).map(d => `"${d.title}" (${d.duplicateCount} copies)`).join(', ')}`);
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
    const resStr = resolution.toLowerCase();
    const resMap = {
      '4k': 2160,
      'uhd': 2160,
      '2160p': 2160,
      '2160': 2160,
      '1440p': 1440,
      '1440': 1440,
      '1080p': 1080,
      '1080': 1080,
      'fhd': 1080,
      '720p': 720,
      '720': 720,
      'hd': 720,
      '576p': 576,
      '576': 576,
      '480p': 480,
      '480': 480,
      'sd': 480,
      '360p': 360,
      '360': 360,
      '240p': 240,
      '240': 240
    };
    return resMap[resStr] || 0;
  }

  calculateQualityScore(mediaFile) {
    let score = 0;
    
    // Resolution score (0-100)
    const resolution = this.parseResolution(mediaFile.videoResolution);
    if (resolution >= 2160) score += 100; // 4K
    else if (resolution >= 1080) score += 80; // 1080p
    else if (resolution >= 720) score += 60; // 720p
    else if (resolution >= 480) score += 40; // 480p
    else score += 20; // Lower
    
    // Bitrate score (0-50) - higher bitrate usually means better quality
    const bitrate = mediaFile.bitrate || 0;
    if (bitrate >= 20000) score += 50; // Very high bitrate (20+ Mbps)
    else if (bitrate >= 10000) score += 40; // High bitrate (10-20 Mbps)
    else if (bitrate >= 5000) score += 30; // Medium bitrate (5-10 Mbps)
    else if (bitrate >= 2000) score += 20; // Low bitrate (2-5 Mbps)
    else if (bitrate > 0) score += 10; // Very low bitrate
    
    // File size score (0-25) - larger files often indicate better quality
    const size = mediaFile.size || 0;
    const sizeGB = size / (1024 * 1024 * 1024);
    if (sizeGB >= 20) score += 25; // Very large file (20GB+)
    else if (sizeGB >= 10) score += 20; // Large file (10-20GB)
    else if (sizeGB >= 5) score += 15; // Medium file (5-10GB)
    else if (sizeGB >= 2) score += 10; // Small file (2-5GB)
    else if (sizeGB > 0) score += 5; // Very small file
    
    // Container bonus (0-15) - some containers are preferred
    const container = (mediaFile.container || '').toLowerCase();
    if (container === 'mkv') score += 15; // MKV often highest quality
    else if (container === 'mp4') score += 12; // MP4 good quality and compatibility
    else if (container === 'avi') score += 8; // AVI older but can be good
    else if (container === 'mov') score += 10; // MOV good quality
    else if (container) score += 5; // Any other container
    
    // Audio channels bonus (0-10)
    const audioChannels = mediaFile.audioChannels || 0;
    if (audioChannels >= 8) score += 10; // 7.1+ surround
    else if (audioChannels >= 6) score += 8; // 5.1 surround  
    else if (audioChannels >= 2) score += 5; // Stereo
    else if (audioChannels > 0) score += 2; // Mono
    
    return Math.min(score, 200); // Cap at 200 points
  }

  getBestQualityFile(files) {
    if (!files || files.length === 0) return null;
    
    return files.reduce((best, current) => {
      const bestScore = this.calculateQualityScore(best);
      const currentScore = this.calculateQualityScore(current);
      
      // Add debug logging for quality comparison
      console.log(`Quality comparison: "${current.file}" score: ${currentScore} vs "${best.file}" score: ${bestScore}`);
      
      return currentScore > bestScore ? current : best;
    });
  }

  getWorstQualityFile(files) {
    if (!files || files.length === 0) return null;
    
    return files.reduce((worst, current) => {
      const worstScore = this.calculateQualityScore(worst);
      const currentScore = this.calculateQualityScore(current);
      
      return currentScore < worstScore ? current : worst;
    });
  }

  normalizeTitle(title) {
    if (!title) return '';
    
    return title
      .toLowerCase()
      .trim()
      // Remove common prefixes/suffixes
      .replace(/^(the|a|an)\s+/i, '')
      .replace(/\s+(the|a|an)$/i, '')
      // Remove special characters and extra spaces
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      // Remove common edition markers
      .replace(/\s+(director\'?s?\s+cut|extended\s+edition|unrated|remastered|4k|uhd|hdr|dolby|atmos)(\s|$)/gi, ' ')
      .replace(/\s+(edition|cut|version)(\s|$)/gi, ' ')
      .trim();
  }

  generateMatchingKeys(title, year) {
    const normalized = this.normalizeTitle(title);
    const keys = [];
    
    // Primary key: normalized title + year
    keys.push(`${normalized}_${year}`);
    
    // Secondary keys for fuzzy matching
    if (normalized.length > 3) {
      // Remove year patterns from title (e.g., "Movie (2020)" -> "Movie")
      const titleWithoutYear = normalized.replace(/\s*\(?(\d{4})\)?\s*/g, ' ').trim();
      if (titleWithoutYear !== normalized) {
        keys.push(`${titleWithoutYear}_${year}`);
      }
      
      // Remove subtitles after colon/dash
      const titleBeforeSubtitle = normalized.split(/[:\-–—]/)[0].trim();
      if (titleBeforeSubtitle !== normalized && titleBeforeSubtitle.length > 2) {
        keys.push(`${titleBeforeSubtitle}_${year}`);
      }
      
      // Roman numeral variations (II, III, IV, etc.)
      const romanNumerals = {
        ' ii': ' 2', ' iii': ' 3', ' iv': ' 4', ' v': ' 5',
        ' vi': ' 6', ' vii': ' 7', ' viii': ' 8', ' ix': ' 9', ' x': ' 10'
      };
      
      let romanVariant = normalized;
      for (const [roman, number] of Object.entries(romanNumerals)) {
        if (romanVariant.includes(roman)) {
          romanVariant = romanVariant.replace(roman, number);
          keys.push(`${romanVariant}_${year}`);
        }
        // Also try the reverse
        if (normalized.includes(number)) {
          const numToRoman = normalized.replace(number, roman);
          keys.push(`${numToRoman}_${year}`);
        }
      }
    }
    
    return keys;
  }

  isLikelyDuplicate(newKeys, existingKey, newTitle, existingTitle) {
    // Direct key match
    if (newKeys.includes(existingKey)) {
      return true;
    }
    
    // Fuzzy string similarity
    const similarity = this.calculateStringSimilarity(
      this.normalizeTitle(newTitle), 
      this.normalizeTitle(existingTitle)
    );
    
    // Consider it a duplicate if similarity is high (85%+)
    if (similarity >= 0.85) {
      console.log(`Fuzzy match: "${newTitle}" vs "${existingTitle}" (${(similarity * 100).toFixed(1)}% similarity)`);
      return true;
    }
    
    return false;
  }

  calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;
    
    // Levenshtein distance based similarity
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitution = matrix[j - 1][i - 1] + (str1[i - 1] === str2[j - 1] ? 0 : 1);
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // insertion
          matrix[j - 1][i] + 1, // deletion
          substitution
        );
      }
    }
    
    const maxLength = Math.max(str1.length, str2.length);
    return (maxLength - matrix[str2.length][str1.length]) / maxLength;
  }
}

module.exports = new PlexService();
