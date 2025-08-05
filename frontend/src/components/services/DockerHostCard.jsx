import React, { useState, useEffect } from 'react';
import { 
  ServerIcon, 
  PlayIcon, 
  StopIcon, 
  TrashIcon,
  ArrowPathIcon,
  EyeIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';

const DockerHostCard = ({ host, onRemove, onRefresh }) => {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showContainers, setShowContainers] = useState(false);

  useEffect(() => {
    fetchContainers();
  }, [host.name]);

  const fetchContainers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/docker/hosts/${host.name}/containers`);
      const data = await response.json();
      
      if (data.success) {
        setContainers(data.containers);
      }
    } catch (error) {
      console.error('Failed to fetch containers:', error);
    } finally {
      setLoading(false);
    }
  };

  const controlContainer = async (containerId, action) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/docker/hosts/${host.name}/containers/${containerId}/${action}`,
        { method: 'POST' }
      );
      
      if (response.ok) {
        fetchContainers(); // Refresh container list
      }
    } catch (error) {
      console.error(`Failed to ${action} container:`, error);
    }
  };

  const runningContainers = containers.filter(c => c.state === 'running').length;
  const statusColor = host.connected ? 'green' : 'red';
  const statusText = host.connected ? 'Connected' : 'Disconnected';

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 hover:border-gray-700 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            host.connected ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'
          }`}>
            <ServerIcon className={`w-5 h-5 ${host.connected ? 'text-green-400' : 'text-red-400'}`} />
          </div>
          <div>
            <h3 className="text-white font-semibold">{host.name}</h3>
            <p className="text-xs text-gray-400">{host.type.toUpperCase()} Connection</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchContainers}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onRemove(host.name)}
            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
            title="Remove host"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${host.connected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className={`text-sm ${host.connected ? 'text-green-400' : 'text-red-400'}`}>
            {statusText}
          </span>
        </div>
        
        {host.info && (
          <div className="text-xs text-gray-400">
            Docker v{host.info.version}
          </div>
        )}
      </div>

      {/* Container Summary */}
      {!loading && (
        <div 
          className="bg-gray-800/50 rounded-lg p-3 mb-4 cursor-pointer hover:bg-gray-800/70 transition-colors"
          onClick={() => setShowContainers(!showContainers)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-medium">
                Containers: {runningContainers}/{containers.length}
              </p>
              <p className="text-xs text-gray-400">
                {runningContainers} running, {containers.length - runningContainers} stopped
              </p>
            </div>
            <EyeIcon className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      )}

      {/* Container List (Expandable) */}
      {showContainers && !loading && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {containers.slice(0, 10).map((container) => (
            <div key={container.id} className="bg-gray-800/30 rounded-lg p-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{container.name}</p>
                  <p className="text-xs text-gray-400 truncate">{container.image}</p>
                </div>
                
                <div className="flex items-center space-x-2 ml-2">
                  <div className={`w-2 h-2 rounded-full ${
                    container.state === 'running' ? 'bg-green-400' : 'bg-red-400'
                  }`}></div>
                  
                  {container.state === 'running' ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        controlContainer(container.id, 'stop');
                      }}
                      className="p-1 text-red-400 hover:text-red-300 transition-colors"
                      title="Stop container"
                    >
                      <StopIcon className="w-3 h-3" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        controlContainer(container.id, 'start');
                      }}
                      className="p-1 text-green-400 hover:text-green-300 transition-colors"
                      title="Start container"
                    >
                      <PlayIcon className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {containers.length > 10 && (
            <p className="text-xs text-gray-500 text-center py-2">
              ... and {containers.length - 10} more containers
            </p>
          )}
        </div>
      )}

      {loading && (
        <div className="bg-gray-800/50 rounded-lg p-3 animate-pulse">
          <div className="h-4 bg-gray-700 rounded mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-2/3"></div>
        </div>
      )}

      {/* Host Info */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Last seen: {new Date(host.lastSeen).toLocaleTimeString()}</span>
          {host.info && (
            <span>{host.info.containers} total containers</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default DockerHostCard;