import React, { useState, useEffect } from 'react';
import { XMarkIcon, ArrowPathIcon, ChartBarIcon, ServerIcon, CircleStackIcon, FolderIcon, ExclamationTriangleIcon, FilmIcon, CloudArrowDownIcon, ClockIcon, CpuChipIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import StatsCard from '../shared/StatsCard';
import ProgressBar from '../shared/ProgressBar';
import SimpleLineChart from '../charts/SimpleLineChart';

const ServiceDetailModal = ({ service, isOpen, onClose }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isOpen && service) {
      fetchDetailedStats();
    }
  }, [isOpen, service]);

  const fetchDetailedStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/${service.type}/${service.id}/stats`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch detailed stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !service) return null;

  const getServiceIcon = () => {
    const icons = {
      radarr: '🎬',
      sonarr: '📺',
      plex: '🎭',
      prowlarr: '🔍',
      lidarr: '🎵',
      unraid: '💾'
    };
    return icons[service.type] || '📦';
  };

  const getServiceColor = () => {
    const colors = {
      radarr: 'from-yellow-500 to-orange-500',
      sonarr: 'from-blue-500 to-cyan-500',
      plex: 'from-orange-500 to-red-500',
      prowlarr: 'from-purple-500 to-pink-500',
      lidarr: 'from-green-500 to-emerald-500',
      unraid: 'from-orange-600 to-red-600'
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
                {service.lastSeen ? formatDistanceToNow(new Date(service.lastSeen), { addSuffix: true }) : 'Never'}
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
    if (!stats) return null;

    switch (service.type) {
      case 'radarr':
        return <RadarrStats stats={stats} />;
      case 'sonarr':
        return <SonarrStats stats={stats} />;
      case 'plex':
        return <PlexStats stats={stats} />;
      case 'prowlarr':
        return <ProwlarrStats stats={stats} />;
      case 'unraid':
        return <UnraidStats stats={stats} />;
      default:
        return <GenericStats stats={stats} />;
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
              <div className="text-4xl">{getServiceIcon()}</div>
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
              {activeTab === 'performance' && <PerformanceTab stats={stats} service={service} />}
              {activeTab === 'storage' && <StorageTab stats={stats} service={service} />}
              {activeTab === 'health' && <HealthTab stats={stats} service={service} />}
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 rounded-lg p-6">
          <SimpleLineChart
            data={responseTimeData}
            title="Response Time (24h)"
            color="blue"
            height={200}
          />
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6">
          <SimpleLineChart
            data={apiCallsData}
            title="API Calls (24h)"
            color="purple"
            height={200}
          />
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6">
          <SimpleLineChart
            data={cpuData}
            title="CPU Usage (24h)"
            color="green"
            height={200}
          />
        </div>
        
        <div className="bg-gray-800/50 rounded-lg p-6">
          <SimpleLineChart
            data={memoryData}
            title="Memory Usage (24h)"
            color="yellow"
            height={200}
          />
        </div>
      </div>

      {/* Additional Performance Info */}
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-gray-400 text-sm mb-2">Average Load Time</p>
            <ProgressBar value={85} label="Page Load Speed" color="green" />
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-2">Cache Hit Rate</p>
            <ProgressBar value={92} label="Cache Efficiency" color="blue" />
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-2">Resource Usage</p>
            <ProgressBar value={45} label="System Resources" color="auto" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Storage Tab Component
const StorageTab = ({ stats, service }) => {
  const getStorageData = () => {
    switch (service.type) {
      case 'radarr':
        return {
          total: stats.diskSpaceTotal,
          used: stats.totalFileSize,
          free: stats.diskSpaceFree,
          percent: stats.diskSpaceUsedPercent
        };
      case 'sonarr':
        return {
          total: stats.diskSpaceTotal,
          used: 'N/A',
          free: stats.diskSpaceFree,
          percent: stats.diskSpaceUsedPercent
        };
      default:
        return null;
    }
  };

  const storageData = getStorageData();

  if (!storageData) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-6">
        <p className="text-gray-400">No storage information available for this service.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Storage Overview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-gray-400 text-sm mb-1">Total Space</div>
            <div className="text-2xl font-bold text-white">{storageData.total}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm mb-1">Used Space</div>
            <div className="text-2xl font-bold text-yellow-400">{storageData.used}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm mb-1">Free Space</div>
            <div className="text-2xl font-bold text-green-400">{storageData.free}</div>
          </div>
        </div>

        {/* Storage bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Storage Usage</span>
            <span className="text-white">{storageData.percent}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all ${
                storageData.percent > 80 ? 'bg-red-500' : 
                storageData.percent > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${storageData.percent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Additional storage details */}
      {service.type === 'radarr' && stats.qualityBreakdown && (
        <div className="bg-gray-800/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quality Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.qualityBreakdown).slice(0, 8).map(([quality, count]) => (
              <div key={quality} className="bg-gray-700/30 rounded-lg p-3">
                <div className="text-gray-400 text-sm">{quality}</div>
                <div className="text-xl font-bold text-white">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Health Tab Component  
const HealthTab = ({ stats, service }) => {
  const getHealthIssues = () => {
    if (stats.health?.warnings) return stats.health.warnings;
    if (stats.healthIssues) return [`${stats.healthIssues} health issues detected`];
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
            <div className="text-gray-400 text-sm">API Key</div>
            <div className="text-white font-mono text-sm">
              {service.api_key ? '••••••••' + service.api_key.slice(-4) : 'Not configured'}
            </div>
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