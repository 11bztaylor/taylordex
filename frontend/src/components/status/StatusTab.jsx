import React, { useState, useEffect } from 'react';
import { 
  ServerIcon, 
  FilmIcon, 
  TvIcon, 
  HardDriveIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const StatusTab = ({ services }) => {
  const [aggregateStats, setAggregateStats] = useState({
    totalMovies: 0,
    totalSeries: 0,
    totalMissing: 0,
    totalDiskUsage: 0,
    servicesOnline: 0,
    servicesOffline: 0,
    totalServices: 0
  });

  useEffect(() => {
    calculateAggregateStats();
  }, [services]);

  const calculateAggregateStats = () => {
    const stats = {
      totalMovies: 0,
      totalSeries: 0,
      totalMissing: 0,
      totalDiskUsage: 0,
      servicesOnline: 0,
      servicesOffline: 0,
      totalServices: services.length
    };

    services.forEach(service => {
      if (service.enabled === false) return; // Skip disabled services
      
      if (service.status === 'online') {
        stats.servicesOnline++;
      } else {
        stats.servicesOffline++;
      }

      if (service.stats) {
        // Radarr stats
        if (service.stats.movies) stats.totalMovies += service.stats.movies;
        if (service.stats.missing) stats.totalMissing += service.stats.missing;
        
        // Sonarr stats
        if (service.stats.series) stats.totalSeries += service.stats.series;
        
        // Parse disk usage (convert to GB for aggregation)
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

    setAggregateStats(stats);
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
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-white">System Status</h2>
        <p className="text-sm text-gray-400 mt-1">
          Real-time overview of your media services
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Service Health */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
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
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
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
        </div>

        {/* Missing Content */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-amber-400" />
            <span className="text-2xl font-bold text-white">
              {aggregateStats.totalMissing.toLocaleString()}
            </span>
          </div>
          <h3 className="text-sm font-medium text-gray-400">Missing</h3>
          <p className="text-xs text-gray-500 mt-1">
            Content to be downloaded
          </p>
        </div>

        {/* Storage Used */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <HardDriveIcon className="w-8 h-8 text-blue-400" />
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
        <h3 className="text-lg font-semibold text-white mb-4">Service Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(service => (
            <ServiceStatusCard key={service.id} service={service} />
          ))}
        </div>
      </div>

      {/* Disk Usage by Service */}
      {services.some(s => s.stats?.diskSpace) && (
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">Storage Distribution</h3>
          <div className="space-y-3">
            {services
              .filter(s => s.stats?.diskSpace && s.enabled !== false)
              .map(service => (
                <DiskUsageBar key={service.id} service={service} />
              ))}
          </div>
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

  return (
    <div className={`${getStatusBg()} rounded-lg p-4 border ${isDisabled ? 'border-gray-800' : isOnline ? 'border-green-900/50' : 'border-red-900/50'}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-white">{service.name}</h4>
        <div className={`w-2 h-2 rounded-full ${isDisabled ? 'bg-gray-500' : isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
      </div>
      <div className="space-y-1">
        <p className="text-xs text-gray-400">{service.type}</p>
        <p className="text-xs text-gray-500">{service.host}:{service.port}</p>
        {service.stats?.version && (
          <p className="text-xs text-gray-500">v{service.stats.version}</p>
        )}
        <div className="flex items-center space-x-2 mt-2">
          {isDisabled ? (
            <span className="text-xs text-gray-500">Disabled</span>
          ) : isOnline ? (
            <>
              <CheckCircleIcon className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400">Online</span>
            </>
          ) : (
            <>
              <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
              <span className="text-xs text-red-400">Offline</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Disk Usage Bar Component
const DiskUsageBar = ({ service }) => {
  const [diskSize, setDiskSize] = useState(0);
  const [unit, setUnit] = useState('GB');

  useEffect(() => {
    if (service.stats?.diskSpace) {
      const diskMatch = service.stats.diskSpace.match(/(\d+\.?\d*)\s*(GB|TB|MB)/i);
      if (diskMatch) {
        setDiskSize(parseFloat(diskMatch[1]));
        setUnit(diskMatch[2].toUpperCase());
      }
    }
  }, [service.stats]);

  const getBarWidth = () => {
    // Normalize to percentage (assuming max 10TB for visualization)
    let sizeInGB = diskSize;
    if (unit === 'TB') sizeInGB *= 1024;
    if (unit === 'MB') sizeInGB /= 1024;
    const maxGB = 10240; // 10TB
    return Math.min((sizeInGB / maxGB) * 100, 100);
  };

  const getServiceColor = () => {
    const colors = {
      radarr: 'from-orange-500 to-orange-600',
      sonarr: 'from-blue-500 to-blue-600',
      lidarr: 'from-green-500 to-green-600',
      bazarr: 'from-purple-500 to-purple-600',
      readarr: 'from-red-500 to-red-600',
      prowlarr: 'from-yellow-500 to-yellow-600'
    };
    return colors[service.type] || 'from-gray-500 to-gray-600';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-300">{service.name}</span>
        <span className="text-sm text-gray-400">{service.stats.diskSpace}</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-3">
        <div 
          className={`bg-gradient-to-r ${getServiceColor()} h-3 rounded-full transition-all duration-500`}
          style={{ width: `${getBarWidth()}%` }}
        />
      </div>
    </div>
  );
};

export default StatusTab;
