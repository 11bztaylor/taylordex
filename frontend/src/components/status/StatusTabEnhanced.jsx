import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../shared/LoadingSpinner';
import { StatusTabSkeleton } from '../shared/LoadingSkeleton';
import { 
  ServerIcon, FilmIcon, TvIcon, CircleStackIcon, 
  ArrowPathIcon, ExclamationTriangleIcon, CheckCircleIcon,
  ArrowDownTrayIcon, PlayIcon, ClockIcon
} from '@heroicons/react/24/outline';

const StatusTabEnhanced = ({ services }) => {
  const [activeView, setActiveView] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusData, setStatusData] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  useEffect(() => {
    fetchComprehensiveStatus();
    
    if (autoRefresh) {
      const interval = setInterval(fetchComprehensiveStatus, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const fetchComprehensiveStatus = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/services/status/comprehensive');
      const result = await response.json();
      
      if (result.success) {
        setStatusData(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch status');
      }
    } catch (err) {
      console.error('Error fetching comprehensive status:', err);
      setError('Network error - unable to reach backend');
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (percentage) => {
    if (percentage >= 90) return 'text-green-400';
    if (percentage >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  if (loading && !statusData) {
    return <StatusTabSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-900/20 backdrop-blur-sm rounded-xl p-6 border border-red-800/50">
        <div className="flex items-center space-x-3">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
          <div>
            <h3 className="text-lg font-medium text-red-400">Error Loading Status</h3>
            <p className="text-sm text-gray-400 mt-1">{error}</p>
          </div>
          <button
            onClick={fetchComprehensiveStatus}
            className="ml-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { overview, downloads, streaming, performance, alerts } = statusData || {};
  const healthPercentage = overview 
    ? Math.round((overview.servicesOnline / (overview.totalServices || 1)) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-semibold text-white">System Status</h2>
          <p className="text-sm text-gray-400 mt-1">
            Real-time overview of your media services
            {performance?.lastUpdate && (
              <span className="ml-2 text-gray-500">
                • Updated {new Date(performance.lastUpdate).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Auto-refresh toggle */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-400">Auto-refresh</label>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoRefresh ? 'bg-green-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoRefresh ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* Manual refresh */}
          <button
            onClick={fetchComprehensiveStatus}
            disabled={loading}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          {/* View switcher */}
          <div className="flex space-x-2">
            {['overview', 'activity', 'performance'].map(view => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  activeView === view 
                    ? 'bg-green-900/30 text-green-400 border border-green-800' 
                    : 'bg-gray-800/30 text-gray-400 border border-gray-700 hover:border-gray-600'
                }`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overview View */}
      {activeView === 'overview' && overview && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <ServerIcon className="w-8 h-8 text-green-400" />
                <span className={`text-2xl font-bold ${getHealthColor(healthPercentage)}`}>
                  {healthPercentage}%
                </span>
              </div>
              <h3 className="text-lg font-medium text-gray-300">System Health</h3>
              <p className="text-sm text-gray-500 mt-1">
                {overview.servicesOnline} of {overview.totalServices} services online
              </p>
            </div>

            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <FilmIcon className="w-8 h-8 text-blue-400" />
                <span className="text-2xl font-bold text-white">
                  {overview.totalMedia?.toLocaleString() || 0}
                </span>
              </div>
              <h3 className="text-lg font-medium text-gray-300">Total Media</h3>
              <p className="text-sm text-gray-500 mt-1">
                {overview.totalMissing || 0} missing items
              </p>
            </div>

            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <ArrowDownTrayIcon className="w-8 h-8 text-yellow-400" />
                <span className="text-2xl font-bold text-white">
                  {downloads?.active || 0}
                </span>
              </div>
              <h3 className="text-lg font-medium text-gray-300">Active Now</h3>
              <p className="text-sm text-gray-500 mt-1">
                {streaming?.active || 0} streaming • {downloads?.queued || 0} queued
              </p>
            </div>

            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <CircleStackIcon className="w-8 h-8 text-purple-400" />
                <span className="text-2xl font-bold text-white">
                  {formatBytes(overview.totalStorage * 1024 * 1024 * 1024)}
                </span>
              </div>
              <h3 className="text-lg font-medium text-gray-300">Storage Used</h3>
              <p className="text-sm text-gray-500 mt-1">
                Across all services
              </p>
            </div>
          </div>

          {/* Service Health Grid */}
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-medium text-white mb-4">Service Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {overview.byService && Object.entries(overview.byService).map(([name, data]) => (
                <div key={name} className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    data.status === 'online' ? 'bg-green-400' : 'bg-red-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-300">{name}</p>
                    <p className="text-xs text-gray-500">{data.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          {alerts && alerts.length > 0 && (
            <div className="bg-yellow-900/20 backdrop-blur-sm rounded-xl p-6 border border-yellow-800/50">
              <h3 className="text-lg font-medium text-yellow-400 mb-4 flex items-center">
                <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                System Alerts ({alerts.length})
              </h3>
              <div className="space-y-2">
                {alerts.slice(0, 5).map((alert, index) => (
                  <div key={index} className="text-sm text-gray-300">
                    <span className="text-yellow-400">{alert.service}:</span> {alert.message}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity View */}
      {activeView === 'activity' && (
        <div className="space-y-6">
          {/* Active Downloads */}
          {downloads && downloads.items.length > 0 && (
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <ArrowDownTrayIcon className="w-5 h-5 mr-2" />
                Downloads ({downloads.active} active, {downloads.queued} queued)
              </h3>
              <div className="space-y-3">
                {downloads.items.slice(0, 10).map((item, index) => (
                  <div key={index} className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-white">{item.title || item.series}</p>
                        {item.episodeTitle && (
                          <p className="text-sm text-gray-400">
                            {item.episode} - {item.episodeTitle}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {item.service} • {item.quality} • {item.size}
                        </p>
                      </div>
                      <span className="text-sm text-gray-400">{item.eta}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Streams */}
          {streaming && streaming.sessions.length > 0 && (
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <PlayIcon className="w-5 h-5 mr-2" />
                Active Streams ({streaming.active})
              </h3>
              <div className="space-y-3">
                {streaming.sessions.map((stream, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div>
                      <p className="font-medium text-white">{stream.user}</p>
                      <p className="text-sm text-gray-400">{stream.media}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-300">{stream.type}</p>
                      <p className="text-xs text-gray-500">{stream.quality} • {stream.bandwidth}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance View */}
      {activeView === 'performance' && performance && (
        <div className="space-y-6">
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-medium text-white mb-4">Performance Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-400">Response Time</p>
                <p className="text-xl font-bold text-white">{performance.responseTime}ms</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Services Checked</p>
                <p className="text-xl font-bold text-white">{performance.servicesChecked}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Services Responded</p>
                <p className="text-xl font-bold text-white">{performance.servicesResponded}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Success Rate</p>
                <p className="text-xl font-bold text-green-400">
                  {Math.round((performance.servicesResponded / performance.servicesChecked) * 100)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusTabEnhanced;