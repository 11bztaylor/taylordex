import React, { useState, useEffect } from 'react';
import { PlusIcon, ServerIcon, PlayIcon, StopIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import AddDockerHostModal from './AddDockerHostModal';
import DockerHostCard from './DockerHostCard';
import UnraidDockerHostCard from './UnraidDockerHostCard';

const DockerHostsSection = () => {
  const [dockerHosts, setDockerHosts] = useState([]);
  const [unraidHosts, setUnraidHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchDockerHosts();
    fetchUnraidHosts();
  }, []);

  const fetchDockerHosts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/docker/hosts');
      const data = await response.json();
      
      if (data.success) {
        setDockerHosts(data.hosts);
      }
    } catch (error) {
      console.error('Failed to fetch Docker hosts:', error);
    }
  };

  const fetchUnraidHosts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/services');
      const data = await response.json();
      
      if (data.success) {
        // Filter for Unraid services and convert them to Docker host format
        const unraids = data.services
          .filter(service => service.type === 'unraid' && service.enabled)
          .map(service => ({
            name: `${service.name} (Unraid)`,
            type: 'unraid',
            connected: service.status === 'online',
            host: service.host,
            port: service.port,
            serviceId: service.id,
            info: {
              version: 'Unraid Docker',
              containers: 0
            },
            lastSeen: new Date().toISOString(),
            containers: []
          }));
        
        setUnraidHosts(unraids);
      }
    } catch (error) {
      console.error('Failed to fetch Unraid services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHostAdded = () => {
    fetchDockerHosts();
    fetchUnraidHosts();
    setShowAddModal(false);
  };

  const handleHostRemoved = async (hostName) => {
    try {
      // Check if it's an Unraid host (can't be removed from here)
      if (hostName.includes('(Unraid)')) {
        alert('Unraid Docker hosts are managed through the Services tab. Please disable or remove the Unraid service there.');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/docker/hosts/${hostName}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchDockerHosts();
      }
    } catch (error) {
      console.error('Failed to remove Docker host:', error);
    }
  };

  const handleRefresh = () => {
    fetchDockerHosts();
    fetchUnraidHosts();
  };

  if (loading) {
    return (
      <div>
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-semibold text-white">Docker Hosts</h3>
            <p className="text-sm text-gray-400 mt-1">Loading Docker hosts...</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="bg-gray-900/50 rounded-xl p-6 border border-gray-800 animate-pulse">
              <div className="h-4 bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-white">Docker Hosts</h3>
          <p className="text-sm text-gray-400 mt-1">
            Manage Docker container hosts ({dockerHosts.length + unraidHosts.length} total, {dockerHosts.filter(h => h.connected).length + unraidHosts.filter(h => h.connected).length} connected)
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors flex items-center space-x-2 border border-gray-700 hover:border-gray-600"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors flex items-center space-x-2 text-white"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Docker Host</span>
          </button>
        </div>
      </div>

      {/* Unraid Docker Hosts */}
      {unraidHosts.length > 0 && (
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {unraidHosts.map((host) => (
              <UnraidDockerHostCard 
                key={host.name} 
                host={host}
                onRemove={handleHostRemoved}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        </div>
      )}

      {/* Manual Docker Hosts */}
      <div>
        {dockerHosts.length > 0 && (
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-blue-900/30 rounded-lg flex items-center justify-center border border-blue-700/50">
              <ServerIcon className="w-4 h-4 text-blue-400" />
            </div>
            <h4 className="text-lg font-semibold text-white">Manual Docker Hosts</h4>
            <span className="text-xs bg-blue-900/20 text-blue-300 px-2 py-1 rounded border border-blue-700/50">
              Manually configured
            </span>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dockerHosts.map((host) => (
            <DockerHostCard 
              key={host.name} 
              host={host}
              onRemove={handleHostRemoved}
              onRefresh={handleRefresh}
            />
          ))}
          
          {/* Add Docker Host Card */}
          {dockerHosts.length === 0 && unraidHosts.length === 0 && (
            <div className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-6 border-2 border-dashed border-gray-800 min-h-[200px] flex flex-col justify-center items-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-3 border border-gray-700">
                  <ServerIcon className="w-6 h-6 text-gray-500" />
                </div>
                <p className="text-gray-400 font-medium mb-2">No Docker Hosts Connected</p>
                <p className="text-xs text-gray-500 mb-4">Connect to Docker hosts to manage containers</p>
                
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors text-white"
                >
                  Add First Docker Host
                </button>
              </div>
            </div>
          )}
          
          {/* Always show add card if there are any hosts */}
          {(dockerHosts.length > 0 || unraidHosts.length > 0) && (
            <div className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-6 border-2 border-dashed border-gray-800 min-h-[200px] flex flex-col justify-center items-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-3 border border-gray-700">
                  <PlusIcon className="w-6 h-6 text-gray-500" />
                </div>
                <p className="text-gray-400 font-medium mb-2">Add Docker Host</p>
                <p className="text-xs text-gray-500 mb-4">Connect additional Docker hosts</p>
                
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors text-white"
                >
                  Add Docker Host
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
        <h4 className="text-blue-300 font-medium mb-2">💡 Docker Host Setup Options</h4>
        <div className="text-sm text-blue-200/80 space-y-1">
          <p><strong>Socket:</strong> Local Docker socket (mounted in container)</p>
          <p><strong>TCP:</strong> Remote Docker API (requires Docker daemon configuration)</p>
          <p><strong>SSH:</strong> Connect via SSH (secure but slower)</p>
          <p><strong>Unraid:</strong> Use your Unraid server's Docker socket or TCP API</p>
        </div>
      </div>

      {/* Add Docker Host Modal */}
      <AddDockerHostModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onHostAdded={handleHostAdded}
      />
    </div>
  );
};

export default DockerHostsSection;