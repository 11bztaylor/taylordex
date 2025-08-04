// Update the stats display section in ServiceCard.jsx (around line 180-230)
// Replace the existing stats section with this enhanced version:

{/* Enhanced Stats Section */}
<div className="space-y-2">
  {loading ? (
    <div className="animate-pulse space-y-2">
      <div className="h-4 bg-gray-800 rounded w-3/4"></div>
      <div className="h-4 bg-gray-800 rounded w-1/2"></div>
    </div>
  ) : stats ? (
    <>
      {/* Radarr Enhanced Stats */}
      {service.type === 'radarr' && (
        <>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Movies</span>
            <span className="text-sm text-green-400 font-medium">{stats.movies?.toLocaleString() || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Missing</span>
            <span className="text-sm text-amber-400 font-medium">{stats.missing?.toLocaleString() || 0}</span>
          </div>
          {stats.queue?.total > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Downloading</span>
              <span className="text-sm text-blue-400 font-medium">{stats.queue.downloading || 0} of {stats.queue.total}</span>
            </div>
          )}
          {stats.health?.issues > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Health Issues</span>
              <span className="text-sm text-red-400 font-medium">{stats.health.issues}</span>
            </div>
          )}
        </>
      )}
      
      {/* Sonarr Enhanced Stats */}
      {service.type === 'sonarr' && (
        <>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Series</span>
            <span className="text-sm text-green-400 font-medium">{stats.series?.toLocaleString() || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Episodes</span>
            <span className="text-sm text-green-400 font-medium">{stats.episodes?.toLocaleString() || 0}</span>
          </div>
          {stats.missing > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Missing</span>
              <span className="text-sm text-amber-400 font-medium">{stats.missing?.toLocaleString() || 0}</span>
            </div>
          )}
          {stats.airingToday > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Airing Today</span>
              <span className="text-sm text-blue-400 font-medium">{stats.airingToday}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Status</span>
            <span className="text-xs text-gray-500">{stats.continuingSeries || 0} active / {stats.endedSeries || 0} ended</span>
          </div>
        </>
      )}

      {/* Plex Enhanced Stats */}
      {service.type === 'plex' && (
        <>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Libraries</span>
            <span className="text-sm text-green-400 font-medium">{stats.libraries || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Movies / Shows</span>
            <span className="text-sm text-gray-300 font-medium">{stats.movies || 0} / {stats.shows || 0}</span>
          </div>
          {stats.activeStreams > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Active Streams</span>
              <span className="text-sm text-blue-400 font-medium animate-pulse">{stats.activeStreams}</span>
            </div>
          )}
          {stats.performance?.bandwidth && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Bandwidth</span>
              <span className="text-sm text-green-400 font-medium">{stats.performance.bandwidth}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Platform</span>
            <span className="text-xs text-gray-500">{stats.platform || 'Unknown'}</span>
          </div>
        </>
      )}

      {/* Prowlarr Enhanced Stats */}
      {service.type === 'prowlarr' && (
        <>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Indexers</span>
            <span className="text-sm text-green-400 font-medium">{stats.enabled || 0} / {stats.indexers || 0}</span>
          </div>
          {stats.totalQueries24h !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Queries (24h)</span>
              <span className="text-sm text-blue-400 font-medium">{stats.totalQueries24h.toLocaleString()}</span>
            </div>
          )}
          {stats.totalGrabs24h !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Grabs (24h)</span>
              <span className="text-sm text-green-400 font-medium">{stats.totalGrabs24h.toLocaleString()}</span>
            </div>
          )}
          {stats.successRate !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Success Rate</span>
              <span className="text-sm text-green-400 font-medium">{stats.successRate}%</span>
            </div>
          )}
          {stats.health?.issues > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Issues</span>
              <span className="text-sm text-red-400 font-medium">{stats.health.issues}</span>
            </div>
          )}
        </>
      )}

      {/* Lidarr Stats (if you add it) */}
      {service.type === 'lidarr' && (
        <>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Artists</span>
            <span className="text-sm text-green-400 font-medium">{stats.artists?.toLocaleString() || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Albums</span>
            <span className="text-sm text-green-400 font-medium">{stats.albums?.toLocaleString() || 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Tracks</span>
            <span className="text-sm text-gray-300 font-medium">{stats.tracks?.toLocaleString() || 0}</span>
          </div>
        </>
      )}

      {/* Common stats for all services */}
      {stats.diskSpace && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Disk Usage</span>
          <span className="text-sm text-gray-300 font-medium">
            {stats.diskSpace}
            {stats.diskSpaceUsedPercent && (
              <span className="text-xs text-gray-500 ml-1">({stats.diskSpaceUsedPercent}%)</span>
            )}
          </span>
        </div>
      )}

      {stats.version && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Version</span>
          <span className="text-sm text-gray-500 text-xs">{stats.version}</span>
        </div>
      )}

      {/* Status Indicator */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-800/50">
        <span className="text-xs text-gray-500">Status</span>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${stats.status === 'online' ? 'bg-green-400 animate-pulse shadow-sm shadow-green-400' : 'bg-red-500'}`}></div>
          <span className="text-xs text-gray-400 capitalize">{stats.status || 'Unknown'}</span>
        </div>
      </div>
    </>
  ) : (
    <div className="text-center py-4">
      <p className="text-sm text-gray-500">Unable to fetch stats</p>
      <button 
        onClick={handleRefresh}
        className="text-xs text-green-400 hover:text-green-300 mt-2"
      >
        Try again
      </button>
    </div>
  )}
</div>
