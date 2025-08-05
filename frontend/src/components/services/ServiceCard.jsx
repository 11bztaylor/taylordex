import React, { useState, useEffect, Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { EllipsisVerticalIcon, TrashIcon, ArrowPathIcon, PencilIcon, FilmIcon, TvIcon, MusicalNoteIcon, BookOpenIcon, MagnifyingGlassIcon, ServerIcon, PlayIcon, CubeIcon, ArrowTopRightOnSquareIcon, HomeIcon } from '@heroicons/react/24/outline';

const ServiceCard = ({ service, onDelete, onRefresh, onEdit, onClick }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Heroicon fallbacks for each service type
  const ServiceIcons = {
    radarr: FilmIcon,
    sonarr: TvIcon,
    lidarr: MusicalNoteIcon,
    readarr: BookOpenIcon,
    prowlarr: MagnifyingGlassIcon,
    bazarr: TvIcon,
    plex: PlayIcon,
    homeassistant: HomeIcon,
    unraid: ServerIcon
  };

  // Brand colors for each service
  const brandColors = {
    radarr: 'from-orange-500 to-orange-600',
    sonarr: 'from-blue-500 to-blue-600',
    bazarr: 'from-purple-500 to-purple-600',
    lidarr: 'from-green-500 to-green-600',
    readarr: 'from-red-500 to-red-600',
    prowlarr: 'from-yellow-500 to-yellow-600',
    plex: 'from-yellow-400 to-orange-500',
    homeassistant: 'from-blue-600 to-indigo-600',
    unraid: 'from-orange-500 to-red-500'
  };

  useEffect(() => {
    fetchStats();
  }, [service.id, service.type]);

  const fetchStats = async () => {
    try {
      if (['radarr', 'sonarr', 'lidarr', 'readarr', 'bazarr', 'prowlarr', 'plex', 'homeassistant', 'unraid'].includes(service.type)) {
        const response = await fetch(`http://localhost:5000/api/${service.type}/${service.id}/stats`);
        const data = await response.json();
        
        if (data.success) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error(`Failed to fetch stats for ${service.name}:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${service.name}? This cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`http://localhost:5000/api/services/${service.id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        onDelete(service.id);
      } else {
        alert(`Failed to delete: ${data.error}`);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete service');
    } finally {
      setDeleting(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchStats();
    if (onRefresh) onRefresh();
  };

  const IconComponent = ServiceIcons[service.type.toLowerCase()] || ServiceIcons.radarr;
  const gradientClass = brandColors[service.type.toLowerCase()] || brandColors.radarr;
  const logoPath = `/logos/${service.type.toLowerCase()}.svg`;

  return (
    <div 
      className={`bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 hover:border-green-900/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10 relative cursor-pointer ${deleting ? 'opacity-50' : ''} ${service.enabled === false ? 'opacity-60' : ''}`}
      onClick={() => onClick && onClick(service)}>
      {/* Disabled indicator */}
      {service.enabled === false && (
        <div className="absolute top-2 left-2 bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded">
          Disabled
        </div>
      )}
      
      {/* Options Menu */}
      <div className="absolute top-4 right-4" onClick={(e) => e.stopPropagation()}>
        <Menu as="div" className="relative inline-block text-left">
          <Menu.Button className="p-1 rounded-lg hover:bg-gray-800/50 transition-colors">
            <EllipsisVerticalIcon className="w-5 h-5 text-gray-400 hover:text-white" />
          </Menu.Button>
          
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-40 origin-top-right rounded-lg bg-gray-900/95 backdrop-blur-sm border border-gray-800 shadow-lg shadow-black/50 focus:outline-none z-10">
              <div className="p-1">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`${
                        active ? 'bg-gray-800' : ''
                      } group flex w-full items-center rounded-md px-3 py-2 text-sm text-gray-300 hover:text-white transition-colors`}
                      onClick={() => onEdit(service)}
                    >
                      <PencilIcon className="mr-2 h-4 w-4" />
                      Edit
                    </button>
                  )}
                </Menu.Item>
                
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`${
                        active ? 'bg-gray-800' : ''
                      } group flex w-full items-center rounded-md px-3 py-2 text-sm text-gray-300 hover:text-white transition-colors`}
                      onClick={handleRefresh}
                      disabled={loading}
                    >
                      <ArrowPathIcon className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </button>
                  )}
                </Menu.Item>
                
                <div className="my-1 border-t border-gray-800"></div>
                
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`${
                        active ? 'bg-red-900/20' : ''
                      } group flex w-full items-center rounded-md px-3 py-2 text-sm text-red-400 hover:text-red-300 transition-colors`}
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      <TrashIcon className="mr-2 h-4 w-4" />
                      Delete
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>

      {/* Card Content with Logo */}
      <div className="pr-8">
        <div className="flex items-start space-x-4 mb-4">
          {/* Service Logo with better display */}
          <div className="w-12 h-12 rounded-lg bg-gray-800/50 backdrop-blur-sm p-2 flex-shrink-0 flex items-center justify-center shadow-lg border border-gray-700">
            {!logoError ? (
              <img 
                src={logoPath}
                alt={`${service.name} logo`}
                className="w-full h-full object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className={`w-full h-full rounded bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
                <IconComponent className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
          
          {/* Service Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">{service.name}</h3>
            <p className="text-sm text-gray-400">{service.host}:{service.port}</p>
          </div>
        </div>
        
        {/* Stats Section */}
        <div className="space-y-2">
          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-800 rounded w-3/4"></div>
              <div className="h-4 bg-gray-800 rounded w-1/2"></div>
            </div>
          ) : stats ? (
            <>
              {/* Dynamic stats based on service type */}
              {service.type === 'radarr' && (
                <>
                  {stats.movies !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Movies</span>
                      <span className="text-sm text-green-400 font-medium">{stats.movies.toLocaleString()}</span>
                    </div>
                  )}
                  {stats.missing !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Missing</span>
                      <span className="text-sm text-amber-400 font-medium">{stats.missing.toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}
              
              {service.type === 'sonarr' && (
                <>
                  {stats.series !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Series</span>
                      <span className="text-sm text-green-400 font-medium">{stats.series.toLocaleString()}</span>
                    </div>
                  )}
                  {stats.episodes !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Episodes</span>
                      <span className="text-sm text-green-400 font-medium">{stats.episodes?.toLocaleString() || 'N/A'}</span>
                    </div>
                  )}
                </>
              )}
              
              {service.type === 'plex' && (
                <>
                  {stats.movies !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Movies</span>
                      <span className="text-sm text-green-400 font-medium">{stats.movies.toLocaleString()}</span>
                    </div>
                  )}
                  {stats.shows !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Shows</span>
                      <span className="text-sm text-green-400 font-medium">{stats.shows.toLocaleString()}</span>
                    </div>
                  )}
                  {stats.activeStreams !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Active Streams</span>
                      <span className="text-sm text-blue-400 font-medium">{stats.activeStreams}</span>
                    </div>
                  )}
                </>
              )}
              
              {service.type === 'prowlarr' && (
                <>
                  {stats.indexers !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Indexers</span>
                      <span className="text-sm text-green-400 font-medium">{stats.indexers}</span>
                    </div>
                  )}
                  {stats.successRate !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Success Rate</span>
                      <span className="text-sm text-green-400 font-medium">{stats.successRate}%</span>
                    </div>
                  )}
                </>
              )}
              
              {service.type === 'homeassistant' && (
                <>
                  {stats.entities?.total !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Entities</span>
                      <span className="text-sm text-green-400 font-medium">{stats.entities.total.toLocaleString()}</span>
                    </div>
                  )}
                  {stats.devices?.online !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Online Devices</span>
                      <span className="text-sm text-blue-400 font-medium">{stats.devices.online}</span>
                    </div>
                  )}
                  {stats.automations?.enabled !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Automations</span>
                      <span className="text-sm text-purple-400 font-medium">{stats.automations.enabled}/{stats.automations.total}</span>
                    </div>
                  )}
                  {stats.realTime?.connected && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">WebSocket</span>
                      <span className="text-sm text-green-400 font-medium">Connected</span>
                    </div>
                  )}
                </>
              )}
              
              {service.type === 'unraid' && (
                <>
                  {stats.uptime && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Uptime</span>
                      <span className="text-sm text-green-400 font-medium">{stats.uptime}</span>
                    </div>
                  )}
                  {stats.containers !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Containers</span>
                      <span className="text-sm text-blue-400 font-medium">{stats.runningContainers}/{stats.containers}</span>
                    </div>
                  )}
                  
                  {/* Docker Management Link */}
                  {stats.containers > 0 && (
                    <div className="mt-2">
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Docker button clicked', { serviceName: service.name, serviceType: service.type });
                          const event = new CustomEvent('showDockerContainers', { 
                            detail: { serviceName: service.name, serviceType: service.type } 
                          });
                          window.dispatchEvent(event);
                        }}
                        className="w-full bg-blue-900/20 hover:bg-blue-900/30 border border-blue-600/50 hover:border-blue-500 rounded-lg p-2 transition-all group text-left cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <CubeIcon className="w-4 h-4 text-blue-400" />
                            <span className="text-blue-300 text-sm font-medium">
                              Dockers: {stats.runningContainers}/{stats.containers} Running
                            </span>
                          </div>
                          <ArrowTopRightOnSquareIcon className="w-3 h-3 text-blue-400 group-hover:text-blue-300" />
                        </div>
                        <p className="text-xs text-blue-400/70 mt-1 ml-6">Click to manage containers</p>
                      </button>
                    </div>
                  )}
                  
                  {stats.totalVMs !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">VMs</span>
                      <span className="text-sm text-purple-400 font-medium">{stats.runningVMs}/{stats.totalVMs}</span>
                    </div>
                  )}
                  {stats.array?.status && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Array Status</span>
                      <span className={`text-sm font-medium ${stats.array.status === 'started' ? 'text-green-400' : 'text-yellow-400'}`}>
                        {stats.array.status}
                      </span>
                    </div>
                  )}
                  {stats.storagePercent !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Storage Used</span>
                      <span className="text-sm text-orange-400 font-medium">{stats.storagePercent}%</span>
                    </div>
                  )}
                </>
              )}

              {/* Common stats for all services */}
              {stats.diskSpace && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Disk Usage</span>
                  <span className="text-sm text-gray-300 font-medium">{stats.diskSpace}</span>
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
      </div>
    </div>
  );
};

export default ServiceCard;
