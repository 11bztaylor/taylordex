import React, { useState, useEffect } from 'react';

// Inline SVG Icons
const ServerIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
);

const FilmIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
  </svg>
);

const TvIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const CircleStackIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
  </svg>
);

const PlayIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ArrowDownTrayIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const ClockIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const MagnifyingGlassIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const SignalIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

const ExclamationTriangleIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const CheckCircleIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const StatusTab = ({ services }) => {
  const [activeView, setActiveView] = useState('overview'); // overview, activity, performance
  const [aggregateStats, setAggregateStats] = useState({
    totalMovies: 0,
    totalSeries: 0,
    totalEpisodes: 0,
    totalMissing: 0,
    totalDiskUsage: 0,
    servicesOnline: 0,
    servicesOffline: 0,
    totalServices: 0,
    activeStreams: 0,
    downloadsInProgress: 0,
    indexerSuccess: 0
  });
  
  const [activityData, setActivityData] = useState({
    recentAdditions: [],
    currentDownloads: [],
    currentStreams: [],
    upcomingReleases: [],
    airingToday: []
  });
  
  const [performanceData, setPerformanceData] = useState({
    indexerStats: [],
    libraryHealth: {},
    systemHealth: []
  });

  useEffect(() => {
    processServiceData();
  }, [services]);

  const processServiceData = () => {
    const stats = {
      totalMovies: 0,
      totalSeries: 0,
      totalEpisodes: 0,
      totalMissing: 0,
      totalDiskUsage: 0,
      servicesOnline: 0,
      servicesOffline: 0,
      totalServices: services.length,
      activeStreams: 0,
      downloadsInProgress: 0,
      indexerSuccess: 0
    };

    const activity = {
      recentAdditions: [],
      currentDownloads: [],
      currentStreams: [],
      upcomingReleases: [],
      airingToday: []
    };

    const performance = {
      indexerStats: [],
      libraryHealth: {},
      systemHealth: []
    };

    services.forEach(service => {
      if (service.enabled === false) return;
      
      if (service.status === 'online') {
        stats.servicesOnline++;
      } else {
        stats.servicesOffline++;
      }

      if (service.stats) {
        // Aggregate basic stats
        if (service.type === 'radarr') {
          stats.totalMovies += service.stats.movies || 0;
          stats.totalMissing += service.stats.missing || 0;
          
          // Activity data
          if (service.stats.recentAdditions) {
            activity.recentAdditions.push(...service.stats.recentAdditions.map(item => ({
              ...item,
              service: service.name,
              type: 'movie'
            })));
          }
          if (service.stats.queue?.items) {
            activity.currentDownloads.push(...service.stats.queue.items.map(item => ({
              ...item,
              service: service.name,
              type: 'movie'
            })));
          }
          if (service.stats.upcoming) {
            activity.upcomingReleases.push(...service.stats.upcoming);
          }
          
          // Health data
          if (service.stats.health?.warnings?.length > 0) {
            performance.systemHealth.push({
              service: service.name,
              warnings: service.stats.health.warnings
            });
          }
        }
        
        if (service.type === 'sonarr') {
          stats.totalSeries += service.stats.series || 0;
          stats.totalEpisodes += service.stats.episodes || 0;
          stats.totalMissing += service.stats.missing || 0;
          
          // Activity data
          if (service.stats.recentEpisodes) {
            activity.recentAdditions.push(...service.stats.recentEpisodes.map(item => ({
              ...item,
              service: service.name,
              type: 'episode'
            })));
          }
          if (service.stats.queueDetails?.items) {
            activity.currentDownloads.push(...service.stats.queueDetails.items.map(item => ({
              ...item,
              service: service.name,
              type: 'episode'
            })));
          }
          if (service.stats.airingToday) {
            stats.airingToday = (stats.airingToday || 0) + service.stats.airingToday;
          }
          if (service.stats.schedule) {
            activity.airingToday.push(...service.stats.schedule.filter(ep => {
              const airDate = new Date(ep.airTime);
              const today = new Date();
              return airDate.toDateString() === today.toDateString();
            }));
          }
        }
        
        if (service.type === 'plex') {
          stats.activeStreams += service.stats.activeStreams || 0;
          
          if (service.stats.currentStreams) {
            activity.currentStreams.push(...service.stats.currentStreams);
          }
          if (service.stats.recentlyAdded) {
            activity.recentAdditions.push(...service.stats.recentlyAdded.map(item => ({
              ...item,
              service: service.name
            })));
          }
          
          performance.libraryHealth[service.name] = {
            libraries: service.stats.libraryDetails || [],
            performance: service.stats.performance || {}
          };
        }
        
        if (service.type === 'prowlarr') {
          stats.indexerSuccess = service.stats.successRate || 0;
          
          if (service.stats.indexerDetails) {
            performance.indexerStats = service.stats.indexerDetails;
          }
          if (service.stats.health?.warnings?.length > 0) {
            performance.systemHealth.push({
              service: service.name,
              warnings: service.stats.health.warnings.map(w => w.message)
            });
          }
        }

        // Parse disk usage
        if (service.stats.diskSpace) {
          const diskMatch = service.stats.diskSpace.match(/(\d+\.?\d*)\s*(GB|TB|MB)/i);
          if (diskMatch) {
            let size = parseFloat(diskMatch[1]);
            const unit = diskMatch[2].toUpperCase();
            if (unit === 'TB') size *= 1024;
            if (unit === 'MB') size /= 1024;
            stats.totalDiskUsage += size;
          }
        }
      }
    });

    // Sort activity data by date
    activity.recentAdditions.sort((a, b) => new Date(b.added || b.downloaded) - new Date(a.added || a.downloaded));
    activity.currentDownloads.sort((a, b) => b.progress - a.progress);
    
    // Update state
    setAggregateStats(stats);
    setActivityData(activity);
    setPerformanceData(performance);
  };

  const formatDiskSize = (sizeInGB) => {
    if (sizeInGB >= 1024) {
      return `${(sizeInGB / 1024).toFixed(2)} TB`;
    }
    return `${sizeInGB.toFixed(2)} GB`;
  };

  const getHealthPercentage = () => {
    if (aggregateStats.totalServices === 0) return 0;
    return Math.round((aggregateStats.servicesOnline / aggregateStats.totalServices) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header with View Switcher */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-semibold text-white">System Status</h2>
          <p className="text-sm text-gray-400 mt-1">
            Real-time overview of your media services
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === 'overview' 
                ? 'bg-green-900/30 text-green-400 border border-green-800' 
                : 'bg-gray-800/30 text-gray-400 border border-gray-700 hover:border-gray-600'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveView('activity')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === 'activity' 
                ? 'bg-green-900/30 text-green-400 border border-green-800' 
                : 'bg-gray-800/30 text-gray-400 border border-gray-700 hover:border-gray-600'
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => setActiveView('performance')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === 'performance' 
                ? 'bg-green-900/30 text-green-400 border border-green-800' 
                : 'bg-gray-800/30 text-gray-400 border border-gray-700 hover:border-gray-600'
            }`}
          >
            Performance
          </button>
        </div>
      </div>

      {/* Overview View */}
      {activeView === 'overview' && (
        <>
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Service Health */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-all">
              <div className="flex items-center justify-between mb-4">
                <ServerIcon className="w-8 h-8 text-green-400" />
                <span className="text-2xl font-bold text-white">{getHealthPercentage()}%</span>
              </div>
              <h3 className="text-sm font-medium text-gray-400">System Health</h3>
              <p className="text-xs text-gray-500 mt-1">
                {aggregateStats.servicesOnline} of {aggregateStats.totalServices} online
              </p>
              <div className="mt-3 w-full bg-gray-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${getHealthPercentage()}%` }}
                />
              </div>
            </div>

            {/* Total Media */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-all">
              <div className="flex items-center justify-between mb-4">
                <FilmIcon className="w-8 h-8 text-orange-400" />
                <span className="text-2xl font-bold text-white">
                  {(aggregateStats.totalMovies + aggregateStats.totalSeries).toLocaleString()}
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-400">Total Media</h3>
              <p className="text-xs text-gray-500 mt-1">
                {aggregateStats.totalMovies.toLocaleString()} movies • {aggregateStats.totalSeries.toLocaleString()} series
              </p>
              <p className="text-xs text-gray-500">
                {aggregateStats.totalEpisodes.toLocaleString()} episodes
              </p>
            </div>

            {/* Active Now */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-all">
              <div className="flex items-center justify-between mb-4">
                <PlayIcon className="w-8 h-8 text-blue-400" />
                <span className="text-2xl font-bold text-white">
                  {aggregateStats.activeStreams + activityData.currentDownloads.length}
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-400">Active Now</h3>
              <p className="text-xs text-gray-500 mt-1">
                {aggregateStats.activeStreams} streaming • {activityData.currentDownloads.length} downloading
              </p>
            </div>

            {/* Storage Used */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-all">
              <div className="flex items-center justify-between mb-4">
                <CircleStackIcon className="w-8 h-8 text-purple-400" />
                <span className="text-2xl font-bold text-white">
                  {formatDiskSize(aggregateStats.totalDiskUsage)}
                </span>
              </div>
              <h3 className="text-sm font-medium text-gray-400">Storage Used</h3>
              <p className="text-xs text-gray-500 mt-1">
                Across all services
              </p>
            </div>
          </div>

          {/* Service Status Grid */}
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">Service Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {services.map(service => (
                <ServiceStatusCard key={service.id} service={service} />
              ))}
            </div>
          </div>

          {/* Quick Activity */}
          {activityData.recentAdditions.length > 0 && (
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">Recently Added</h3>
              <div className="space-y-2">
                {activityData.recentAdditions.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-3">
                      {item.type === 'movie' ? (
                        <FilmIcon className="w-4 h-4 text-orange-400" />
                      ) : (
                        <TvIcon className="w-4 h-4 text-blue-400" />
                      )}
                      <span className="text-gray-300">{item.title}</span>
                      <span className="text-xs text-gray-500">({item.service})</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(item.added || item.downloaded).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Activity View */}
      {activeView === 'activity' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Downloads */}
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <ArrowDownTrayIcon className="w-5 h-5 mr-2 text-green-400" />
              Downloads ({activityData.currentDownloads.length})
            </h3>
            {activityData.currentDownloads.length > 0 ? (
              <div className="space-y-3">
                {activityData.currentDownloads.map((download, idx) => (
                  <div key={idx} className="bg-gray-800/50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-white font-medium">{download.title}</span>
                      <span className="text-xs text-gray-400">{download.service}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{download.size} • ETA: {download.eta}</span>
                      <span className="text-green-400">{download.progress}%</span>
                    </div>
                    <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${download.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No active downloads</p>
            )}
          </div>

          {/* Current Streams */}
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <PlayIcon className="w-5 h-5 mr-2 text-blue-400" />
              Active Streams ({activityData.currentStreams.length})
            </h3>
            {activityData.currentStreams.length > 0 ? (
              <div className="space-y-3">
                {activityData.currentStreams.map((stream, idx) => (
                  <div key={idx} className="bg-gray-800/50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-white font-medium">{stream.media}</span>
                      <span className="text-xs text-gray-400">{stream.user}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{stream.quality} • {stream.type}</span>
                      <span className="text-blue-400">{stream.bandwidth}</span>
                    </div>
                    <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-400 to-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${stream.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No active streams</p>
            )}
          </div>

          {/* Upcoming Content */}
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <ClockIcon className="w-5 h-5 mr-2 text-amber-400" />
              Airing Today ({activityData.airingToday.length})
            </h3>
            {activityData.airingToday.length > 0 ? (
              <div className="space-y-2">
                {activityData.airingToday.slice(0, 10).map((episode, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-gray-300">{episode.series}</span>
                      <span className="text-gray-500 ml-2">{episode.episode}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(episode.airTime).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Nothing airing today</p>
            )}
          </div>

          {/* Recent Additions */}
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Additions</h3>
            <div className="space-y-2">
              {activityData.recentAdditions.slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-3">
                    {item.type === 'movie' ? (
                      <FilmIcon className="w-4 h-4 text-orange-400" />
                    ) : item.type === 'episode' ? (
                      <TvIcon className="w-4 h-4 text-blue-400" />
                    ) : (
                      <CircleStackIcon className="w-4 h-4 text-gray-400" />
                    )}
                    <div>
                      <span className="text-gray-300">{item.title || item.series}</span>
                      {item.episode && <span className="text-gray-500 ml-2">{item.episode}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{item.service}</p>
                    <p className="text-xs text-gray-600">
                      {new Date(item.added || item.downloaded).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Performance View */}
      {activeView === 'performance' && (
        <div className="space-y-6">
          {/* Indexer Performance */}
          {performanceData.indexerStats.length > 0 && (
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <MagnifyingGlassIcon className="w-5 h-5 mr-2 text-yellow-400" />
                Indexer Performance (24h)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {performanceData.indexerStats.slice(0, 6).map((indexer, idx) => (
                  <div key={idx} className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium text-white">{indexer.name}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        indexer.enabled ? 'bg-green-900/30 text-green-400' : 'bg-gray-700 text-gray-400'
                      }`}>
                        {indexer.enabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">Queries</p>
                        <p className="text-white font-medium">{indexer.queries24h}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Grabs</p>
                        <p className="text-green-400 font-medium">{indexer.grabs24h}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Failures</p>
                        <p className="text-red-400 font-medium">{indexer.failures24h}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Avg Time</p>
                        <p className="text-blue-400 font-medium">{indexer.avgResponseTime}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-center">
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center">
                    <SignalIcon className="w-4 h-4 text-green-400 mr-1" />
                    <span className="text-gray-400">Success Rate: </span>
                    <span className="text-green-400 font-medium ml-1">{aggregateStats.indexerSuccess}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Library Health */}
          {Object.keys(performanceData.libraryHealth).length > 0 && (
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4">Library Health</h3>
              {Object.entries(performanceData.libraryHealth).map(([service, data]) => (
                <div key={service} className="mb-6 last:mb-0">
                  <h4 className="text-md font-medium text-gray-300 mb-3">{service}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {data.libraries?.map((lib, idx) => (
                      <div key={idx} className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-sm font-medium text-white">{lib.name}</p>
                        <p className="text-xs text-gray-400 mt-1">{lib.count} items</p>
                        <p className="text-xs text-gray-500">{lib.type}</p>
                      </div>
                    ))}
                  </div>
                  {data.performance && (
                    <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                      <div className="bg-gray-800/30 rounded p-2">
                        <p className="text-xs text-gray-400">Bandwidth</p>
                        <p className="text-sm font-medium text-blue-400">{data.performance.bandwidth}</p>
                      </div>
                      <div className="bg-gray-800/30 rounded p-2">
                        <p className="text-xs text-gray-400">Transcodes</p>
                        <p className="text-sm font-medium text-amber-400">{data.performance.transcodeSessions}</p>
                      </div>
                      <div className="bg-gray-800/30 rounded p-2">
                        <p className="text-xs text-gray-400">Direct Play</p>
                        <p className="text-sm font-medium text-green-400">{data.performance.directPlaySessions}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* System Health Warnings */}
          {performanceData.systemHealth.length > 0 && (
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <ExclamationTriangleIcon className="w-5 h-5 mr-2 text-amber-400" />
                System Health Warnings
              </h3>
              <div className="space-y-2">
                {performanceData.systemHealth.map((health, idx) => (
                  <div key={idx} className="bg-amber-900/20 border border-amber-900/50 rounded-lg p-3">
                    <p className="text-sm font-medium text-amber-400">{health.service}</p>
                    <ul className="mt-1 text-xs text-gray-300 space-y-1">
                      {health.warnings.map((warning, widx) => (
                        <li key={widx}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Service Status Card Component
const ServiceStatusCard = ({ service }) => {
  const isOnline = service.status === 'online' && service.enabled !== false;
  const isDisabled = service.enabled === false;
  
  const getStatusColor = () => {
    if (isDisabled) return 'text-gray-500';
    return isOnline ? 'text-green-400' : 'text-red-400';
  };

  const getStatusBg = () => {
    if (isDisabled) return 'bg-gray-800/30';
    return isOnline ? 'bg-green-900/20' : 'bg-red-900/20';
  };

  const getServiceIcon = () => {
    const icons = {
      radarr: <FilmIcon className="w-5 h-5" />,
      sonarr: <TvIcon className="w-5 h-5" />,
      plex: <PlayIcon className="w-5 h-5" />,
      prowlarr: <MagnifyingGlassIcon className="w-5 h-5" />
    };
    return icons[service.type] || <ServerIcon className="w-5 h-5" />;
  };

  const getQuickStats = () => {
    if (!service.stats) return null;
    
    switch (service.type) {
      case 'radarr':
        return `${service.stats.movies || 0} movies • ${service.stats.missing || 0} missing`;
      case 'sonarr':
        return `${service.stats.series || 0} series • ${service.stats.episodes || 0} episodes`;
      case 'plex':
        return `${service.stats.activeStreams || 0} streams • ${service.stats.libraries || 0} libraries`;
      case 'prowlarr':
        return `${service.stats.enabled || 0}/${service.stats.indexers || 0} indexers`;
      default:
        return null;
    }
  };

  return (
    <div className={`${getStatusBg()} rounded-lg p-4 border ${isDisabled ? 'border-gray-800' : isOnline ? 'border-green-900/50' : 'border-red-900/50'} hover:border-opacity-80 transition-all`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className={getStatusColor()}>
            {getServiceIcon()}
          </div>
          <h4 className="font-medium text-white">{service.name}</h4>
        </div>
        <div className={`w-2 h-2 rounded-full ${isDisabled ? 'bg-gray-500' : isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
      </div>
      <div className="space-y-1">
        <p className="text-xs text-gray-400">{service.type} • v{service.stats?.version || 'Unknown'}</p>
        <p className="text-xs text-gray-500">{getQuickStats()}</p>
        <div className="flex items-center space-x-2 mt-2">
          {isDisabled ? (
            <span className="text-xs text-gray-500">Disabled</span>
          ) : isOnline ? (
            <span className="text-xs text-green-400">Online</span>
          ) : (
            <span className="text-xs text-red-400">Offline</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusTab;
