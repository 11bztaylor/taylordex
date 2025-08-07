import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, ArrowPathIcon, ChartBarIcon, ServerIcon, CircleStackIcon, FolderIcon, ExclamationTriangleIcon, 
  FilmIcon, CloudArrowDownIcon, ClockIcon, CpuChipIcon, TvIcon, MusicalNoteIcon, BookOpenIcon, 
  MagnifyingGlassIcon, PlayIcon, HomeIcon, CubeIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import StatsCard from '../shared/StatsCard';
import ProgressBar from '../shared/ProgressBar';
import SimpleLineChart from '../charts/SimpleLineChart';
import PerformanceChart from '../charts/PerformanceChart';

// Service relationship enrichment function
const enrichStatsWithServiceRelationships = (stats, currentService, allServices) => {
  if (!stats || !currentService || !allServices || allServices.length === 0) return stats;
  
  // Find potential Unraid hosts that might be hosting this Docker service
  const unraidServices = allServices.filter(s => 
    s.type === 'unraid' && 
    s.enabled && 
    s.status === 'online' &&
    s.host // Has a host configured
  );
  
  let enrichedStats = { ...stats };
  
  // For Docker services (radarr, sonarr, etc.), try to match with Unraid hosts
  if (['radarr', 'sonarr', 'lidarr', 'readarr', 'bazarr'].includes(currentService.type)) {
    
    // Method 1: Direct host matching
    let matchedUnraid = null;
    if (currentService.host) {
      matchedUnraid = unraidServices.find(unraid => 
        unraid.host === currentService.host || 
        unraid.host === currentService.host.split(':')[0] // Handle port differences
      );
    }
    
    // Method 2: Network subnet matching (if on same network)
    if (!matchedUnraid && currentService.host) {
      const currentServiceIP = currentService.host.split(':')[0];
      if (currentServiceIP.match(/^\d+\.\d+\.\d+\.\d+$/)) {
        const currentSubnet = currentServiceIP.split('.').slice(0, 3).join('.');
        matchedUnraid = unraidServices.find(unraid => {
          if (!unraid.host) return false;
          const unraidIP = unraid.host.split(':')[0];
          const unraidSubnet = unraidIP.split('.').slice(0, 3).join('.');
          return currentSubnet === unraidSubnet;
        });
      }
    }
    
    if (matchedUnraid) {
      enrichedStats = {
        ...enrichedStats,
        dockerHost: matchedUnraid.host,
        dockerHostName: matchedUnraid.name,
        dockerHostService: matchedUnraid,
        isDockerContainer: true,
        unraidIntegration: {
          enabled: true,
          hostService: matchedUnraid,
          detectionMethod: currentService.host === matchedUnraid.host ? 'direct_match' : 'subnet_match'
        }
      };
      
      // Enhance storage paths with Unraid context
      if (enrichedStats.storagePaths || enrichedStats.rootFolders || enrichedStats.paths) {
        const paths = enrichedStats.storagePaths || enrichedStats.rootFolders || enrichedStats.paths || [];
        enrichedStats.storagePaths = paths.map(pathInfo => {
          let path = pathInfo.path || pathInfo.rootFolderPath || pathInfo;
          return {
            ...pathInfo,
            path,
            isDockerMount: true,
            dockerHost: matchedUnraid.host,
            dockerHostName: matchedUnraid.name,
            unraidShare: extractUnraidShareFromPath(path)
          };
        });
      }
    }
  }
  
  return enrichedStats;
};

// Helper function to extract Unraid share name from path
const extractUnraidShareFromPath = (path) => {
  if (!path || typeof path !== 'string') return null;
  
  // Common Unraid patterns: /mnt/user/ShareName/ or /mnt/diskX/ShareName/
  const match = path.match(/^\/mnt\/(?:user|disk\d+)\/([^\/]+)/);
  return match ? match[1] : null;
};

const ServiceDetailModal = ({ service, isOpen, onClose, allServices = [] }) => {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [enrichedStats, setEnrichedStats] = useState(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (isOpen && service) {
      setLogoError(false); // Reset logo error when service changes
      fetchDetailedStats();
    }
  }, [isOpen, service]);

  useEffect(() => {
    if (stats && service && allServices.length > 0) {
      const enriched = enrichStatsWithServiceRelationships(stats, service, allServices);
      setEnrichedStats(enriched);
    } else {
      setEnrichedStats(stats);
    }
  }, [stats, allServices, service]);

  const fetchDetailedStats = async () => {
    try {
      setLoading(true);
      const url = `http://localhost:5000/api/${service.type}/${service.id}/stats`;
      console.log(`🔄 ServiceDetailModal - Fetching detailed stats from: ${url}`);
      
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(url, { headers });
      console.log(`📡 ServiceDetailModal - Response status: ${response.status}`);
      
      const data = await response.json();
      console.log(`📡 ServiceDetailModal - Response data:`, data);
      
      if (data.success) {
        console.log(`✅ ServiceDetailModal - Stats loaded successfully:`, data.stats);
        setStats(data.stats);
      } else {
        console.warn(`⚠️ ServiceDetailModal - Service-specific stats failed, trying generic endpoint:`, data.error);
        
        // Fallback to generic service stats
        try {
          const genericUrl = `http://localhost:5000/api/services/${service.id}/stats`;
          console.log(`🔄 ServiceDetailModal - Trying generic stats endpoint: ${genericUrl}`);
          
          const genericResponse = await fetch(genericUrl, { headers });
          const genericData = await genericResponse.json();
          
          if (genericData.success && genericData.stats) {
            console.log(`✅ ServiceDetailModal - Generic stats loaded:`, genericData.stats);
            setStats(genericData.stats);
          } else {
            console.warn(`⚠️ ServiceDetailModal - Generic stats also failed:`, genericData.error);
          }
        } catch (fallbackError) {
          console.error(`❌ ServiceDetailModal - Fallback stats failed:`, fallbackError.message);
        }
      }
    } catch (error) {
      console.error('❌ ServiceDetailModal - Failed to fetch detailed stats:', {
        error: error.message,
        stack: error.stack
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !service) return null;

  const getServiceIcon = () => {
    if (!service?.type) return ServerIcon;
    
    const ServiceIcons = {
      radarr: FilmIcon,
      sonarr: TvIcon,
      plex: PlayIcon,
      prowlarr: MagnifyingGlassIcon,
      lidarr: MusicalNoteIcon,
      readarr: BookOpenIcon,
      bazarr: TvIcon,
      unraid: ServerIcon,
      homeassistant: HomeIcon,
      portainer: CubeIcon
    };
    return ServiceIcons[service.type] || ServerIcon;
  };

  const getServiceColor = () => {
    if (!service?.type) return 'from-gray-500 to-gray-600';
    
    const colors = {
      radarr: 'from-yellow-500 to-orange-500',
      sonarr: 'from-blue-500 to-cyan-500',
      plex: 'from-orange-500 to-red-500',
      prowlarr: 'from-purple-500 to-pink-500',
      lidarr: 'from-green-500 to-emerald-500',
      unraid: 'from-orange-600 to-red-600',
      homeassistant: 'from-blue-600 to-cyan-600'
    };
    return colors[service.type] || 'from-gray-500 to-gray-600';
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderOverviewTab = () => {
    if (!stats) return <div>Loading...</div>;

    return (
      <div className="space-y-6">
        {/* Connection Info */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Connection Details</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Host:</span>
              <span className="text-white ml-2">{service.host}:{service.port}</span>
            </div>
            <div>
              <span className="text-gray-400">Version:</span>
              <span className="text-white ml-2">{stats.version || 'Unknown'}</span>
            </div>
            <div>
              <span className="text-gray-400">Status:</span>
              <span className={`ml-2 ${service.status === 'online' ? 'text-green-400' : 'text-red-400'}`}>
                {service.status}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Last Seen:</span>
              <span className="text-white ml-2">
                {service.lastSeen && !isNaN(new Date(service.lastSeen).getTime()) 
                  ? formatDistanceToNow(new Date(service.lastSeen), { addSuffix: true }) 
                  : 'Never'}
              </span>
            </div>
          </div>
        </div>

        {/* Service-specific stats */}
        {renderServiceSpecificStats()}
      </div>
    );
  };

  const renderServiceSpecificStats = () => {
    if (!stats || !service?.type) return null;

    switch (service.type) {
      case 'radarr':
        return <RadarrStats stats={enrichedStats || stats} />;
      case 'sonarr':
        return <SonarrStats stats={enrichedStats || stats} />;
      case 'plex':
        return <PlexStats stats={enrichedStats || stats} />;
      case 'prowlarr':
        return <ProwlarrStats stats={enrichedStats || stats} />;
      case 'unraid':
        return <UnraidStats stats={enrichedStats || stats} />;
      case 'homeassistant':
        return <HomeAssistantStats stats={enrichedStats || stats} />;
      default:
        return <GenericStats stats={enrichedStats || stats} />;
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'performance', label: 'Performance', icon: ServerIcon },
    { id: 'storage', label: 'Storage', icon: FolderIcon },
    { id: 'health', label: 'Health', icon: ExclamationTriangleIcon }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${getServiceColor()} p-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-lg bg-white/10 backdrop-blur-sm p-2 flex-shrink-0 flex items-center justify-center shadow-lg">
                {!logoError ? (
                  <img 
                    src={`/logos/${service.name.toLowerCase().replace(/\s+/g, '')}.svg`}
                    alt={`${service.name} logo`}
                    className="w-full h-full object-contain"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className={`w-full h-full rounded bg-gradient-to-br ${getServiceColor().replace('from-', 'from-').replace('to-', 'to-')} flex items-center justify-center`}>
                    {React.createElement(getServiceIcon(), { className: "w-6 h-6 text-white" })}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{service.name}</h2>
                <p className="text-white/80">{service.type.charAt(0).toUpperCase() + service.type.slice(1)} Service</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchDetailedStats}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-800 border-b border-gray-700">
          <div className="flex space-x-1 p-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverviewTab()}
              {activeTab === 'performance' && <PerformanceTab stats={enrichedStats || stats} service={service} />}
              {activeTab === 'storage' && <StorageTab stats={enrichedStats || stats} service={service} />}
              {activeTab === 'health' && <HealthTab stats={enrichedStats || stats} service={service} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Service-specific component for Radarr
const RadarrStats = ({ stats }) => (
  <div className="space-y-6">
    {/* Stats Cards Grid */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatsCard
        title="Total Movies"
        value={stats.movies}
        icon={FilmIcon}
        color="orange"
      />
      <StatsCard
        title="Monitored"
        value={stats.monitored}
        icon={CircleStackIcon}
        color="blue"
        trend={stats.monitored > 0 ? ((stats.monitored / stats.movies) * 100).toFixed(0) : 0}
        trendValue={`${((stats.monitored / stats.movies) * 100).toFixed(0)}% of total`}
      />
      <StatsCard
        title="Missing"
        value={stats.missing}
        icon={ExclamationTriangleIcon}
        color="red"
      />
      <StatsCard
        title="In Queue"
        value={stats.queue?.total || 0}
        icon={CloudArrowDownIcon}
        color="yellow"
      />
    </div>

    {/* Storage Progress */}
    <div className="bg-gray-800/50 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Storage Usage</h3>
      <ProgressBar
        value={stats.diskSpaceUsedPercent || 0}
        label="Disk Space"
        color="auto"
        size="large"
        animated={true}
      />
      <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
        <div>
          <span className="text-gray-400">Total</span>
          <p className="text-white font-medium">{stats.diskSpaceTotal}</p>
        </div>
        <div>
          <span className="text-gray-400">Used</span>
          <p className="text-yellow-400 font-medium">{stats.totalFileSize}</p>
        </div>
        <div>
          <span className="text-gray-400">Free</span>
          <p className="text-green-400 font-medium">{stats.diskSpaceFree}</p>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Movies Overview */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Collection Details</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-400">Average Size</span>
            <span className="text-white font-medium">{stats.averageFileSize}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Total Size</span>
            <span className="text-white font-medium">{stats.totalFileSize}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Health Issues</span>
            <span className={`font-medium ${stats.health?.issues > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
              {stats.health?.issues || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Queue Status */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3">Download Activity</h3>
        {stats.queue?.items?.length > 0 ? (
          <div className="space-y-2">
            {stats.queue.items.slice(0, 3).map((item, index) => (
              <div key={index} className="bg-gray-700/30 rounded p-2">
                <div className="text-sm text-white truncate">{item.title}</div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-gray-400">{item.quality}</span>
                  <span className="text-blue-400">{item.size}</span>
                </div>
                <ProgressBar
                  value={item.progress || 0}
                  size="small"
                  color="blue"
                  showPercentage={false}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No active downloads</p>
        )}
      </div>
    </div>

    {/* Recent Additions */}
    <div className="bg-gray-800/50 rounded-lg p-4 md:col-span-2">
      <h3 className="text-lg font-semibold text-white mb-3">Recent Additions</h3>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {stats.recentAdditions?.slice(0, 5).map((movie, index) => (
          <div key={index} className="flex justify-between items-center py-1 border-b border-gray-700/50">
            <div>
              <span className="text-white">{movie.title}</span>
              <span className="text-gray-400 text-sm ml-2">({movie.year})</span>
            </div>
            <div className="text-right">
              <span className="text-gray-400 text-sm">{movie.quality}</span>
              <span className="text-gray-500 text-xs ml-2">{movie.size}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Service-specific component for Sonarr
const SonarrStats = ({ stats }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* Series Overview */}
    <div className="bg-gray-800/50 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-3">Series Collection</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-400">Total Series</span>
          <span className="text-white font-medium">{stats.series}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Episodes</span>
          <span className="text-white font-medium">{stats.episodes}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Missing Episodes</span>
          <span className="text-red-400 font-medium">{stats.missing}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Continuing Series</span>
          <span className="text-green-400 font-medium">{stats.continuingSeries}</span>
        </div>
      </div>
    </div>

    {/* Upcoming Episodes */}
    <div className="bg-gray-800/50 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-3">Upcoming Episodes</h3>
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {stats.schedule?.slice(0, 5).map((episode, index) => (
          <div key={index} className="text-sm">
            <div className="text-white truncate">{episode.title}</div>
            <div className="text-gray-400 text-xs">{episode.airTime}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Service-specific component for Plex
const PlexStats = ({ stats }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* Library Overview */}
    <div className="bg-gray-800/50 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-3">Media Library</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-400">Movies</span>
          <span className="text-white font-medium">{stats.movies}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">TV Shows</span>
          <span className="text-white font-medium">{stats.shows}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Episodes</span>
          <span className="text-white font-medium">{stats.episodes}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Music Tracks</span>
          <span className="text-white font-medium">{stats.music}</span>
        </div>
      </div>
    </div>

    {/* Streaming Activity */}
    <div className="bg-gray-800/50 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-3">Streaming Activity</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-400">Active Streams</span>
          <span className="text-green-400 font-medium">{stats.activeStreams}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Transcoding</span>
          <span className="text-yellow-400 font-medium">{stats.performance?.transcoding || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Bandwidth</span>
          <span className="text-white font-medium">{stats.performance?.bandwidth || '0 Mbps'}</span>
        </div>
      </div>
    </div>
  </div>
);

// Service-specific component for Prowlarr
const ProwlarrStats = ({ stats }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* Indexers Overview */}
    <div className="bg-gray-800/50 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-3">Indexers</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-400">Total Indexers</span>
          <span className="text-white font-medium">{stats.indexers}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Enabled</span>
          <span className="text-green-400 font-medium">{stats.enabled}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Success Rate</span>
          <span className="text-white font-medium">{stats.successRate}%</span>
        </div>
      </div>
    </div>

    {/* 24h Activity */}
    <div className="bg-gray-800/50 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-3">24 Hour Activity</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-400">Total Grabs</span>
          <span className="text-white font-medium">{stats.totalGrabs24h}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Queries</span>
          <span className="text-white font-medium">{stats.totalQueries24h}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Failures</span>
          <span className="text-red-400 font-medium">{stats.totalFailures24h}</span>
        </div>
      </div>
    </div>
  </div>
);

// Service-specific component for Home Assistant
const HomeAssistantStats = ({ stats }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* Entity Overview */}
    <div className="bg-gray-800/50 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-3">Entity Overview</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-400">Total Entities</span>
          <span className="text-white font-medium">{stats.entities?.total || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Online Devices</span>
          <span className="text-green-400 font-medium">{stats.devices?.online || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Unavailable</span>
          <span className="text-red-400 font-medium">{stats.devices?.unavailable || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Automations</span>
          <span className="text-blue-400 font-medium">{stats.automations?.total || 0}</span>
        </div>
      </div>
    </div>

    {/* System Information */}
    <div className="bg-gray-800/50 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-3">System Information</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-400">Version</span>
          <span className="text-white font-medium">{stats.version || 'Unknown'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Location</span>
          <span className="text-white font-medium">{stats.location || 'Unknown'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Services</span>
          <span className="text-white font-medium">{stats.services || 0}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Scripts</span>
          <span className="text-white font-medium">{stats.scripts || 0}</span>
        </div>
      </div>
    </div>

    {/* Entity Types */}
    {stats.entities?.counts && (
      <div className="bg-gray-800/50 rounded-lg p-4 md:col-span-2">
        <h3 className="text-lg font-semibold text-white mb-3">Entity Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats.entities.counts).slice(0, 8).map(([type, count]) => (
            <div key={type} className="bg-gray-700/30 rounded-lg p-3">
              <div className="text-gray-400 text-sm capitalize">{type.replace('_', ' ')}</div>
              <div className="text-xl font-bold text-white">{count}</div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// Service-specific component for Unraid
const UnraidStats = ({ stats }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* System Overview */}
    <div className="bg-gray-800/50 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-3">System Information</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-400">CPU Cores</span>
          <span className="text-white font-medium">{stats.cpuCores}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Memory</span>
          <span className="text-white font-medium">{stats.memory?.total}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Memory Used</span>
          <span className="text-yellow-400 font-medium">{stats.memoryPercent}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Uptime</span>
          <span className="text-white font-medium">{stats.uptime}</span>
        </div>
      </div>
    </div>

    {/* Docker Overview */}
    <div className="bg-gray-800/50 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-3">Docker Containers</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-400">Total Containers</span>
          <span className="text-white font-medium">{stats.containers}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Running</span>
          <span className="text-green-400 font-medium">{stats.runningContainers}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Array Status</span>
          <span className="text-green-400 font-medium">{stats.arrayStatus}</span>
        </div>
      </div>
    </div>
  </div>
);

// Generic stats component
const GenericStats = ({ stats }) => (
  <div className="bg-gray-800/50 rounded-lg p-4">
    <h3 className="text-lg font-semibold text-white mb-3">Service Statistics</h3>
    <pre className="text-gray-300 text-sm overflow-auto">
      {JSON.stringify(stats, null, 2)}
    </pre>
  </div>
);

// Performance Tab Component
const PerformanceTab = ({ stats, service }) => {
  // Generate mock performance data
  const generateMockData = (baseValue, variance, count = 24) => {
    return Array.from({ length: count }, (_, i) => ({
      value: baseValue + (Math.random() - 0.5) * variance,
      unit: 'ms',
      timestamp: new Date(Date.now() - (count - i) * 3600000).toISOString()
    }));
  };

  const responseTimeData = generateMockData(75, 50);
  const apiCallsData = generateMockData(500, 200).map(d => ({ ...d, unit: 'calls' }));
  const cpuData = generateMockData(25, 20).map(d => ({ ...d, unit: '%' }));
  const memoryData = generateMockData(60, 15).map(d => ({ ...d, unit: '%' }));

  return (
    <div className="space-y-6">
      {/* Performance Summary - Moved to top */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-gray-400 text-sm mb-2">Average Load Time</p>
            <ProgressBar value={85} label="Page Load Speed" color="green" />
            <p className="text-xs text-gray-500 mt-1">Fast response times improve user experience</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-2">Cache Hit Rate</p>
            <ProgressBar value={92} label="Cache Efficiency" color="blue" />
            <p className="text-xs text-gray-500 mt-1">Higher rates reduce server load and improve speed</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-2">Resource Usage</p>
            <ProgressBar value={45} label="System Resources" color="auto" />
            <p className="text-xs text-gray-500 mt-1">Monitor to prevent performance bottlenecks</p>
          </div>
        </div>
      </div>

      {/* Performance Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Avg Response Time"
          value={responseTimeData[responseTimeData.length - 1].value.toFixed(0)}
          unit="ms"
          icon={ClockIcon}
          color="blue"
          trend={-5}
          trendValue="5% faster"
        />
        <StatsCard
          title="Uptime"
          value="99.9"
          unit="%"
          icon={ServerIcon}
          color="green"
        />
        <StatsCard
          title="API Calls"
          value={apiCallsData[apiCallsData.length - 1].value.toFixed(0)}
          unit="/hour"
          icon={ChartBarIcon}
          color="purple"
          trend={12}
        />
        <StatsCard
          title="Error Rate"
          value="0.1"
          unit="%"
          icon={ExclamationTriangleIcon}
          color="red"
          trend={0}
        />
      </div>

      {/* Enhanced Charts Grid with contextual information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 rounded-lg p-6">
          <PerformanceChart
            data={responseTimeData}
            title="Response Time (24h)"
            color="blue"
            height={240}
            description="How quickly the service responds to requests"
          />
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6">
          <PerformanceChart
            data={apiCallsData}
            title="API Calls (24h)"
            color="purple"
            height={240}
            description="Volume of API requests received by the service"
          />
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6">
          <PerformanceChart
            data={cpuData}
            title="CPU Usage (24h)"
            color="green"
            height={240}
            description="Processor utilization for service operations"
          />
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6">
          <PerformanceChart
            data={memoryData}
            title="Memory Usage (24h)"
            color="yellow"
            height={240}
            description="RAM consumption for caching and operations"
          />
        </div>
      </div>
    </div>
  );
};

// Storage Tab Component
const StorageTab = ({ stats, service }) => {
  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const deduplicateStoragePaths = (paths, dockerHost = null) => {
    if (!paths || paths.length === 0) return [];
    
    // Convert paths to normalized format for analysis
    const normalizedPaths = paths.map((pathInfo, index) => {
      let path = pathInfo.path || pathInfo.rootFolderPath || pathInfo;
      if (typeof path !== 'string') return null;
      
      return {
        originalIndex: index,
        originalPath: path,
        normalizedPath: path.replace(/\\/g, '/').replace(/\/+$/, ''), // Normalize slashes and remove trailing
        pathInfo: pathInfo,
        totalSpace: pathInfo.totalSpace,
        freeSpace: pathInfo.freeSpace,
        isDockerMount: dockerHost ? true : (pathInfo.isDockerMount || false),
        dockerHost: dockerHost || pathInfo.dockerHost
      };
    }).filter(Boolean);

    // CONSERVATIVE DUPLICATE DETECTION - Only group if we're very confident
    const duplicateGroups = [];
    const usedIndices = new Set();
    
    // Find TRUE duplicates using strict criteria (without array modification)
    for (let i = 0; i < normalizedPaths.length; i++) {
      if (usedIndices.has(i)) continue;
      
      const pathA = normalizedPaths[i];
      const duplicates = [{ index: i, path: pathA }];
      
      for (let j = i + 1; j < normalizedPaths.length; j++) {
        if (usedIndices.has(j)) continue;
        
        const pathB = normalizedPaths[j];
        
        // STRICT DUPLICATE CRITERIA - ALL must be true:
        if (
          // 1. Must have identical storage sizes (smoking gun for same storage)
          pathA.totalSpace && pathB.totalSpace && 
          pathA.freeSpace && pathB.freeSpace &&
          pathA.totalSpace === pathB.totalSpace && 
          pathA.freeSpace === pathB.freeSpace &&
          
          // 2. One path must be contained within the other (hierarchy relationship)
          (pathA.normalizedPath.startsWith(pathB.normalizedPath + '/') || 
           pathB.normalizedPath.startsWith(pathA.normalizedPath + '/') ||
           pathA.normalizedPath === pathB.normalizedPath) &&
           
          // 3. Must be reasonable size (avoid tiny test filesystems)
          pathA.totalSpace > 1024 * 1024 * 100 // > 100MB
        ) {
          duplicates.push({ index: j, path: pathB });
          usedIndices.add(j);
        }
      }
      
      if (duplicates.length > 1) {
        duplicateGroups.push(duplicates);
        usedIndices.add(i);
        
        // Debug logging
        console.log('🔍 Storage Dedup - Found duplicate group:', {
          paths: duplicates.map(d => d.path.originalPath),
          totalSpace: pathA.totalSpace,
          freeSpace: pathA.freeSpace,
          detectionMethod: 'storage_size_match'
        });
      }
    }

    // Process duplicate groups and unique paths
    const finalPaths = [];
    
    // Add unique paths (not in any duplicate group)
    normalizedPaths.forEach((pathData, index) => {
      if (!usedIndices.has(index)) {
        finalPaths.push({
          ...pathData.pathInfo,
          path: pathData.originalPath,
          isPrimary: true,
          isDuplicate: false,
          duplicateOfPath: null,
          isDockerMount: pathData.isDockerMount,
          dockerHost: pathData.dockerHost,
          detectionMethod: 'unique_path'
        });
      }
    });
    
    // Process confirmed duplicate groups
    duplicateGroups.forEach(group => {
      // Choose the best representative path from the group
      group.sort((a, b) => {
        // 1. Prefer paths with complete storage info
        const aComplete = !!(a.path.totalSpace && a.path.freeSpace);
        const bComplete = !!(b.path.totalSpace && b.path.freeSpace);
        if (aComplete !== bComplete) return bComplete - aComplete;
        
        // 2. Prefer shorter/more root-like paths
        const aDepth = a.path.normalizedPath.split('/').length;
        const bDepth = b.path.normalizedPath.split('/').length;
        if (aDepth !== bDepth) return aDepth - bDepth;
        
        // 3. Prefer original order
        return a.path.originalIndex - b.path.originalIndex;
      });
      
      const primaryPathData = group[0].path;
      const rootMount = findCommonRoot(group.map(g => g.path.normalizedPath));
      
      // Add primary path
      finalPaths.push({
        ...primaryPathData.pathInfo,
        path: primaryPathData.originalPath,
        isPrimary: true,
        isDuplicate: false,
        duplicateOfPath: null,
        rootMount: rootMount,
        isDockerMount: primaryPathData.isDockerMount,
        dockerHost: primaryPathData.dockerHost,
        duplicateCount: group.length - 1,
        detectionMethod: 'storage_size_match'
      });
      
      // Add duplicate paths
      group.slice(1).forEach(({ path: pathData }) => {
        finalPaths.push({
          ...pathData.pathInfo,
          path: pathData.originalPath,
          isPrimary: false,
          isDuplicate: true,
          duplicateOfPath: primaryPathData.originalPath,
          rootMount: rootMount,
          isDockerMount: pathData.isDockerMount,
          dockerHost: pathData.dockerHost,
          detectionMethod: 'storage_size_match'
        });
      });
    });

    // Sort: Primary paths first, then duplicates
    return finalPaths.sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return b.isPrimary - a.isPrimary;
      return a.path.localeCompare(b.path);
    });
  };

  // Helper function to find common root path
  const findCommonRoot = (paths) => {
    if (!paths.length) return '';
    if (paths.length === 1) return paths[0];
    
    const segments = paths[0].split('/');
    let commonRoot = '';
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (paths.every(path => path.split('/')[i] === segment)) {
        commonRoot += (i === 0 && segment === '') ? '/' : segment + '/';
      } else {
        break;
      }
    }
    
    return commonRoot.replace(/\/$/, '') || '/';
  };

  // Smart content path detection based on service type
  const detectContentPaths = (paths, serviceType) => {
    if (!paths || paths.length === 0) return [];
    
    // Define content keywords for each service type
    const contentKeywords = {
      radarr: ['movies', 'films', 'cinema', 'movie'],
      sonarr: ['tv', 'series', 'shows', 'television', 'show'],
      lidarr: ['music', 'audio', 'songs', 'albums', 'artist'],
      readarr: ['books', 'ebooks', 'audiobooks', 'literature'],
      bazarr: ['subtitles', 'subs']
    };
    
    const keywords = contentKeywords[serviceType] || [];
    if (keywords.length === 0) return paths; // No specific detection for this service type
    
    // Score paths based on content relevance
    const scoredPaths = paths.map(pathInfo => {
      const path = pathInfo.path || pathInfo.originalPath || '';
      const pathLower = path.toLowerCase();
      
      // Calculate content relevance score
      let score = 0;
      let matchedKeywords = [];
      
      keywords.forEach(keyword => {
        if (pathLower.includes(keyword)) {
          score += 10;
          matchedKeywords.push(keyword);
        }
      });
      
      // Bonus for exact matches in path segments
      const pathSegments = path.split('/').map(s => s.toLowerCase());
      keywords.forEach(keyword => {
        if (pathSegments.includes(keyword)) {
          score += 5;
          if (!matchedKeywords.includes(keyword)) {
            matchedKeywords.push(keyword);
          }
        }
      });
      
      // Bonus for having storage data (more useful for calculations)
      if (pathInfo.totalSpace && pathInfo.freeSpace) {
        score += 3;
      }
      
      // Slight bonus for non-duplicate paths
      if (!pathInfo.isDuplicate) {
        score += 1;
      }
      
      return {
        ...pathInfo,
        contentScore: score,
        matchedKeywords: matchedKeywords,
        isContentPath: score > 0
      };
    });
    
    // Sort by content score (highest first), then by storage completeness, then by path length
    return scoredPaths.sort((a, b) => {
      if (a.contentScore !== b.contentScore) return b.contentScore - a.contentScore;
      
      const aHasStorage = !!(a.totalSpace && a.freeSpace);
      const bHasStorage = !!(b.totalSpace && b.freeSpace);
      if (aHasStorage !== bHasStorage) return bHasStorage - aHasStorage;
      
      const aDepth = (a.path || '').split('/').length;
      const bDepth = (b.path || '').split('/').length;
      return aDepth - bDepth; // Prefer shorter paths
    });
  };

  const getStorageInfo = () => {
    if (!stats) return null;

    // For services that support storage information
    const supportedTypes = ['radarr', 'sonarr', 'lidarr', 'readarr', 'bazarr'];
    if (!supportedTypes.includes(service.type)) {
      return null;
    }

    // Calculate percentage if not provided
    let usedPercent = stats.diskSpaceUsedPercent || 0;
    if (!usedPercent && stats.diskSpaceTotal && stats.diskSpaceFree) {
      const totalBytes = parseFloat(stats.diskSpaceTotal.replace(/[^\d.]/g, ''));
      const freeBytes = parseFloat(stats.diskSpaceFree.replace(/[^\d.]/g, ''));
      if (totalBytes && freeBytes) {
        usedPercent = Math.round(((totalBytes - freeBytes) / totalBytes) * 100);
      }
    }

    // Get raw paths and deduplicate them
    const rawPaths = stats.storagePaths || stats.rootFolders || stats.paths || [];
    
    // Debug logging
    console.log('🔍 Storage Analysis - Raw paths:', {
      service: service.type,
      pathCount: rawPaths.length,
      paths: rawPaths.map(p => ({
        path: p.path || p.rootFolderPath || p,
        totalSpace: p.totalSpace,
        freeSpace: p.freeSpace
      }))
    });
    
    const deduplicatedPaths = deduplicateStoragePaths(rawPaths, stats.dockerHost);
    
    console.log('🔍 Storage Analysis - After deduplication:', {
      originalCount: rawPaths.length,
      deduplicatedCount: deduplicatedPaths.length,
      duplicatesFound: deduplicatedPaths.filter(p => p.isDuplicate).length
    });
    
    // Apply content path detection to find service-specific content paths
    const contentPaths = detectContentPaths(deduplicatedPaths, service.type);
    
    console.log('🔍 Content Path Detection:', {
      service: service.type,
      contentPathsFound: contentPaths.filter(p => p.isContentPath).length,
      topContentPath: contentPaths.find(p => p.isContentPath)?.path || 'none',
      matchedKeywords: contentPaths.find(p => p.isContentPath)?.matchedKeywords || []
    });
    
    // Calculate CONTENT SPACE USAGE from detected content paths
    let contentUsedSpace = 0;
    let contentTotalSpace = 0;
    let contentFreeSpace = 0;
    let hasContentData = false;
    const contentContributors = [];
    
    // Find the best content path (highest scoring path with storage data)
    const primaryContentPath = contentPaths.find(p => p.isContentPath && p.totalSpace && p.freeSpace);
    
    if (primaryContentPath) {
      contentTotalSpace = primaryContentPath.totalSpace;
      contentFreeSpace = primaryContentPath.freeSpace;
      contentUsedSpace = contentTotalSpace - contentFreeSpace;
      hasContentData = true;
      
      contentContributors.push({
        path: primaryContentPath.path,
        totalSpace: primaryContentPath.totalSpace,
        freeSpace: primaryContentPath.freeSpace,
        usedSpace: contentUsedSpace,
        matchedKeywords: primaryContentPath.matchedKeywords,
        contentScore: primaryContentPath.contentScore
      });
      
      // Mark this path as the content path
      primaryContentPath.isContentSource = true;
    }
    
    // Calculate TOTAL DISK SPACE using original deduplication logic for fallback
    const pathGroups = contentPaths.reduce((groups, path) => {
      const rootKey = path.rootMount || 'unknown';
      if (!groups[rootKey]) {
        groups[rootKey] = [];
      }
      groups[rootKey].push(path);
      return groups;
    }, {});
    
    let totalStorage = 0;
    let freeStorage = 0;
    let hasDiskData = false;
    const storageContributors = []; // Track which paths contribute to disk totals
    
    Object.keys(pathGroups).forEach(rootKey => {
      const pathsInGroup = pathGroups[rootKey];
      
      // Find the path with the LARGEST total space (most accurate representation)
      const pathWithLargestStorage = pathsInGroup
        .filter(p => p.totalSpace && p.freeSpace && p.totalSpace > 0)
        .sort((a, b) => b.totalSpace - a.totalSpace)[0];
      
      if (pathWithLargestStorage) {
        totalStorage += pathWithLargestStorage.totalSpace;
        freeStorage += pathWithLargestStorage.freeSpace;
        hasDiskData = true;
        storageContributors.push({
          rootMount: rootKey,
          path: pathWithLargestStorage.path,
          totalSpace: pathWithLargestStorage.totalSpace,
          freeSpace: pathWithLargestStorage.freeSpace,
          pathCount: pathsInGroup.length
        });
        
        // Mark this path as contributing to disk totals
        pathWithLargestStorage.contributesToTotal = true;
      }
    });
    
    // PRIORITIZE CONTENT SPACE for "Used" metric, fallback to disk space or service data
    const finalTotal = hasDiskData ? formatBytes(totalStorage) : (stats.diskSpaceTotal || 'N/A');
    const finalFree = hasDiskData ? formatBytes(freeStorage) : (stats.diskSpaceFree || 'N/A');
    
    // This is the key change - use CONTENT space for "Used" value
    const finalUsed = hasContentData ? formatBytes(contentUsedSpace) : 
                      hasDiskData ? formatBytes(totalStorage - freeStorage) :
                      (stats.totalFileSize || stats.diskSpace || 'N/A');
    
    const finalUsedPercent = hasDiskData ? Math.round(((totalStorage - freeStorage) / totalStorage) * 100) : usedPercent;

    // Count primary vs all paths for display
    const primaryPaths = contentPaths.filter(p => p.isPrimary);
    
    return {
      total: finalTotal,
      free: finalFree, 
      used: finalUsed,
      usedPercent: finalUsedPercent,
      paths: contentPaths, // Use content-analyzed paths
      primaryPathCount: primaryPaths.length,
      duplicatePathCount: contentPaths.length - primaryPaths.length,
      storageContributors: storageContributors, // Paths that contribute to disk totals
      contentContributors: contentContributors, // Paths that contribute to content usage
      hasContentData: hasContentData,
      contentUsedSpace: hasContentData ? formatBytes(contentUsedSpace) : null,
      contentPath: primaryContentPath ? (() => {
        const path = primaryContentPath.path || '';
        const pathSegments = path.split('/').filter(s => s.length > 0);
        
        // Find the segment that matches content keywords
        const keywords = {
          radarr: ['movies', 'films', 'cinema', 'movie'],
          sonarr: ['tv', 'series', 'shows', 'television', 'show'],
          lidarr: ['music', 'audio', 'songs', 'albums', 'artist'],
          readarr: ['books', 'ebooks', 'audiobooks', 'literature'],
          bazarr: ['subtitles', 'subs']
        }[service.type] || [];
        
        // Look for a path segment that contains content keywords
        const contentSegment = pathSegments.find(segment => 
          keywords.some(keyword => segment.toLowerCase().includes(keyword))
        );
        
        // Return the meaningful segment, or the last segment, or the full path
        return contentSegment || pathSegments[pathSegments.length - 1] || path;
      })() : null,
      dockerHost: stats.dockerHost,
      calculationMethod: hasContentData ? 'content_based' : hasDiskData ? 'path_based' : 'service_based'
    };
  };

  const storageInfo = getStorageInfo();

  if (!storageInfo) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-6">
        <div className="text-center py-8">
          <FolderIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No storage information available for this service type.</p>
          <p className="text-gray-500 text-sm mt-2">Storage details are available for Radarr, Sonarr, Lidarr, and similar *arr services.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Storage Overview */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Storage Overview</h3>
          <div className="flex items-center space-x-4">
            {storageInfo.hasContentData && (
              <div className="flex items-center space-x-2 text-sm text-blue-400">
                <FilmIcon className="w-4 h-4" />
                <span>Content-based calculation</span>
              </div>
            )}
            {storageInfo.calculationMethod === 'path_based' && storageInfo.storageContributors?.length > 0 && (
              <div className="flex items-center space-x-2 text-sm text-emerald-400">
                <CircleStackIcon className="w-4 h-4" />
                <span>Using largest storage values ({storageInfo.storageContributors.length} mounts)</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CircleStackIcon className="w-5 h-5 text-gray-400" />
              <span className="text-gray-400 text-sm">Total Space</span>
            </div>
            <div className="text-2xl font-bold text-white">{storageInfo.total}</div>
          </div>
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              {storageInfo.hasContentData ? (
                <>
                  <FilmIcon className="w-5 h-5 text-blue-400" />
                  <span className="text-gray-400 text-sm">
                    {service.type === 'radarr' ? 'Movies Used' : 
                     service.type === 'sonarr' ? 'TV Shows Used' :
                     service.type === 'lidarr' ? 'Music Used' :
                     'Content Used'}
                  </span>
                </>
              ) : (
                <>
                  <ServerIcon className="w-5 h-5 text-yellow-400" />
                  <span className="text-gray-400 text-sm">Used Space</span>
                </>
              )}
            </div>
            <div className={`text-2xl font-bold ${storageInfo.hasContentData ? 'text-blue-400' : 'text-yellow-400'}`}>
              {storageInfo.used}
            </div>
            {storageInfo.hasContentData && storageInfo.contentPath && (
              <div className="text-xs text-blue-300 mt-1">{storageInfo.contentPath}</div>
            )}
          </div>
          <div className="bg-gray-700/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <FolderIcon className="w-5 h-5 text-green-400" />
              <span className="text-gray-400 text-sm">Free Space</span>
            </div>
            <div className="text-2xl font-bold text-green-400">{storageInfo.free}</div>
          </div>
        </div>

        {/* Storage Usage Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-3">
            <span className="text-gray-400">Storage Usage</span>
            <span className="text-white font-medium">{storageInfo.usedPercent}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 shadow-inner">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                storageInfo.usedPercent > 90 ? 'bg-gradient-to-r from-red-500 to-red-600' : 
                storageInfo.usedPercent > 80 ? 'bg-gradient-to-r from-orange-500 to-yellow-500' : 
                storageInfo.usedPercent > 60 ? 'bg-gradient-to-r from-yellow-500 to-green-500' :
                'bg-gradient-to-r from-green-500 to-green-600'
              }`}
              style={{ width: Math.min(storageInfo.usedPercent, 100) + '%' }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span className={storageInfo.usedPercent > 80 ? 'text-orange-400' : ''}>
              {storageInfo.usedPercent > 90 ? 'Critical' : 
               storageInfo.usedPercent > 80 ? 'Warning' : 
               storageInfo.usedPercent > 60 ? 'Moderate' : 'Healthy'}
            </span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Enhanced Storage Paths with Duplicate Detection and Docker/NAS Integration */}
      {storageInfo.paths && storageInfo.paths.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Storage Paths</h3>
              {storageInfo.duplicatePathCount > 0 && (
                <p className="text-sm text-gray-400 mt-1">
                  {storageInfo.primaryPathCount} unique mounts, {storageInfo.duplicatePathCount} config entries shown for troubleshooting
                </p>
              )}
              {storageInfo.hasContentData && (
                <p className="text-sm text-blue-400 mt-1">
                  Content space calculated from {service.type === 'radarr' ? 'movies' : service.type === 'sonarr' ? 'TV shows' : service.type === 'lidarr' ? 'music' : 'content'} path
                </p>
              )}
              {storageInfo.storageContributors?.length > 0 && !storageInfo.hasContentData && (
                <p className="text-sm text-emerald-400 mt-1">
                  Using largest storage values from {storageInfo.storageContributors.length} mount points for totals
                </p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {storageInfo.duplicatePathCount > 0 && (
                <div className="flex items-center space-x-2 text-sm text-green-400">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  <span>Duplicates Detected & Filtered</span>
                </div>
              )}
              {stats.dockerHost && (
                <div className="flex items-center space-x-2 text-sm">
                  <ServerIcon className="w-4 h-4 text-orange-400" />
                  <span className="text-gray-400">Docker Host:</span>
                  <button 
                    onClick={() => {
                      // Try to find Unraid service and open it
                      const unraidUrl = `http://${stats.dockerHost}`;
                      window.open(unraidUrl, '_blank');
                    }}
                    className="text-orange-400 hover:text-orange-300 underline cursor-pointer"
                  >
                    {stats.dockerHost}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-3">
            {storageInfo.paths.map((pathInfo, index) => {
              let containerClass = 'rounded-lg p-4 transition-colors ';
              if (pathInfo.isPrimary) {
                containerClass += 'bg-green-900/20 border border-green-600/50';
              } else if (pathInfo.isDuplicate) {
                containerClass += 'bg-yellow-900/20 border border-yellow-600/50';
              } else {
                containerClass += 'bg-gray-700/40 hover:bg-gray-700/60';
              }
              return (
              <div key={index} className={containerClass}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <FolderIcon className={`w-4 h-4 flex-shrink-0 ${pathInfo.isPrimary ? 'text-green-400' : pathInfo.isDuplicate ? 'text-yellow-400' : 'text-blue-400'}`} />
                      <code className="text-blue-300 text-sm font-mono bg-gray-800/50 px-2 py-1 rounded">
                        {pathInfo.path || pathInfo.rootFolderPath || pathInfo}
                      </code>
                      {pathInfo.isContentSource && (
                        <span className="px-2 py-1 bg-blue-900/50 text-blue-400 text-xs rounded flex items-center space-x-1">
                          <FilmIcon className="w-3 h-3" />
                          <span>
                            {service.type === 'radarr' ? 'Movies Source' : 
                             service.type === 'sonarr' ? 'TV Shows Source' :
                             service.type === 'lidarr' ? 'Music Source' :
                             'Content Source'}
                          </span>
                          {pathInfo.matchedKeywords?.length > 0 && (
                            <span className="bg-blue-700 px-1 rounded text-xs">{pathInfo.matchedKeywords.join(', ')}</span>
                          )}
                        </span>
                      )}
                      {pathInfo.contributesToTotal && !pathInfo.isContentSource && (
                        <span className="px-2 py-1 bg-emerald-900/50 text-emerald-400 text-xs rounded flex items-center space-x-1">
                          <span>💾 Counted in Total</span>
                          {pathInfo.duplicateCount > 0 && (
                            <span className="bg-emerald-700 px-1 rounded text-xs">Largest of {pathInfo.duplicateCount + 1}</span>
                          )}
                        </span>
                      )}
                      {pathInfo.isPrimary && !pathInfo.contributesToTotal && (
                        <span className="px-2 py-1 bg-green-900/50 text-green-400 text-xs rounded flex items-center space-x-1">
                          <span>Primary Path</span>
                          {pathInfo.duplicateCount > 0 && (
                            <span className="bg-green-700 px-1 rounded text-xs">+{pathInfo.duplicateCount} duplicates</span>
                          )}
                        </span>
                      )}
                      {pathInfo.isDuplicate && (
                        <span className="px-2 py-1 bg-gray-700/50 text-gray-400 text-xs rounded" title={`Duplicate of ${pathInfo.duplicateOfPath || ''}`}>
                          📋 Config Only → {pathInfo.rootMount}
                        </span>
                      )}
                      {pathInfo.isDockerMount && (
                        <span className="px-2 py-1 bg-blue-900/50 text-blue-400 text-xs rounded">
                          Docker Mount
                        </span>
                      )}
                      {pathInfo.rootMount && (
                        <span className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded font-mono">
                          Root: {pathInfo.rootMount}
                        </span>
                      )}
                      {pathInfo.detectionMethod && (
                        <span className="px-2 py-1 bg-indigo-900/50 text-indigo-300 text-xs rounded">
                          {pathInfo.detectionMethod === 'storage_size_match' ? 'Size Match Detection' : 'Unique Path'}
                        </span>
                      )}
                    </div>
                    {pathInfo.label && (
                      <p className="text-gray-400 text-sm ml-6">{pathInfo.label}</p>
                    )}
                    {pathInfo.unraidShare && (
                      <p className="text-blue-300 text-xs ml-6 flex items-center space-x-1">
                        <ServerIcon className="w-3 h-3" />
                        <span>Unraid Share: {pathInfo.unraidShare}</span>
                      </p>
                    )}
                    {pathInfo.dockerHostName && (
                      <p className="text-orange-300 text-xs ml-6 flex items-center space-x-1">
                        <CubeIcon className="w-3 h-3" />
                        <span>Docker Host: {pathInfo.dockerHostName}</span>
                      </p>
                    )}
                    {pathInfo.isDuplicate && pathInfo.duplicateOfPath && (
                      <p className="text-gray-400 text-xs ml-6">📋 Config entry only - storage counted using largest path in {pathInfo.rootMount}</p>
                    )}
                    {pathInfo.contributesToTotal && pathInfo.duplicateCount > 0 && (
                      <p className="text-emerald-400 text-xs ml-6">💾 This path has the largest storage values and is used for total calculation</p>
                    )}
                    {pathInfo.freeSpace && pathInfo.totalSpace && (
                      <div className="ml-6 mt-2">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Free: {formatBytes(pathInfo.freeSpace)}</span>
                          <span>Total: {formatBytes(pathInfo.totalSpace)}</span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${pathInfo.isPrimary ? 'bg-gradient-to-r from-green-500 to-green-400' : pathInfo.isDuplicate ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' : 'bg-gradient-to-r from-blue-500 to-blue-400'}`}
                            style={{ 
                              width: Math.max(0, Math.min(100, ((pathInfo.totalSpace - pathInfo.freeSpace) / pathInfo.totalSpace) * 100)) + '%' 
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col space-y-2">
                    {pathInfo.accessible !== undefined && (
                      <div className={`px-2 py-1 rounded text-xs ${pathInfo.accessible ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                        {pathInfo.accessible ? 'Accessible' : 'Inaccessible'}
                      </div>
                    )}
                    {pathInfo.dockerHost && (
                      <button 
                        onClick={() => window.open(`http://${pathInfo.dockerHost}`, '_blank')}
                        className="px-2 py-1 bg-orange-900/50 text-orange-400 hover:text-orange-300 text-xs rounded transition-colors"
                        title="Open NAS interface"
                      >
                        Open NAS
                      </button>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quality/Category Breakdown */}
      {service.type === 'radarr' && stats.qualityBreakdown && (
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quality Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.qualityBreakdown).slice(0, 8).map(([quality, count]) => (
              <div key={quality} className="bg-gray-700/30 rounded-lg p-3 text-center">
                <div className="text-gray-400 text-sm mb-1">{quality}</div>
                <div className="text-xl font-bold text-white">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Genre Breakdown for Sonarr */}
      {service.type === 'sonarr' && stats.genreBreakdown && Object.keys(stats.genreBreakdown).length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Genre Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.genreBreakdown)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 8)
              .map(([genre, count]) => (
                <div key={genre} className="bg-gray-700/30 rounded-lg p-3 text-center">
                  <div className="text-gray-400 text-sm mb-1 capitalize">{genre}</div>
                  <div className="text-xl font-bold text-white">{count}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Storage Calculation Debug Info - for troubleshooting */}
      {storageInfo.storageContributors?.length > 0 && (
        <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-600/30">
          <h4 className="text-md font-semibold text-gray-300 mb-3 flex items-center space-x-2">
            <CircleStackIcon className="w-4 h-4" />
            <span>Storage Calculation Details</span>
          </h4>
          <div className="space-y-2">
            {storageInfo.storageContributors.map((contributor, index) => (
              <div key={index} className="bg-gray-700/20 rounded p-2 text-xs">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-emerald-400 font-mono">{contributor.path}</p>
                    <p className="text-gray-400 mt-1">Mount: {contributor.rootMount}</p>
                  </div>
                  <div className="text-right text-gray-300 ml-4">
                    <p>Total: {formatBytes(contributor.totalSpace)}</p>
                    <p>Free: {formatBytes(contributor.freeSpace)}</p>
                    <p>Used: {formatBytes(contributor.totalSpace - contributor.freeSpace)}</p>
                    {contributor.pathCount > 1 && (
                      <p className="text-yellow-400">Selected from {contributor.pathCount} paths</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3 italic">
            💡 Conservative detection: Only paths with identical storage sizes AND hierarchical relationships are considered duplicates
          </p>
        </div>
      )}
    </div>
  );
};

// Health Tab Component  
const HealthTab = ({ stats, service }) => {
  const getHealthIssues = () => {
    if (stats.health?.warnings) return stats.health.warnings;
    if (stats.healthIssues) return [stats.healthIssues + ' health issues detected'];
    return [];
  };

  const healthIssues = getHealthIssues();

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Service Health</h3>
        
        {healthIssues.length === 0 ? (
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
            <span className="text-green-400">No health issues detected</span>
          </div>
        ) : (
          <div className="space-y-3">
            {healthIssues.map((issue, index) => (
              <div key={index} className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mt-0.5" />
                <span className="text-gray-300">{issue}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Service Info */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Service Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-gray-400 text-sm">Service Type</div>
            <div className="text-white">{service.type.charAt(0).toUpperCase() + service.type.slice(1)}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">Version</div>
            <div className="text-white">{stats.version || 'Unknown'}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">Enabled</div>
            <div className={service.enabled ? 'text-green-400' : 'text-red-400'}>
              {service.enabled ? 'Yes' : 'No'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetailModal;