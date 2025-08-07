import React, { useState, useEffect, Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { 
  EllipsisVerticalIcon, TrashIcon, ArrowPathIcon, PencilIcon, 
  FilmIcon, TvIcon, MusicalNoteIcon, BookOpenIcon, MagnifyingGlassIcon, 
  ServerIcon, PlayIcon, CubeIcon, ArrowTopRightOnSquareIcon, HomeIcon,
  ChartBarIcon, CloudIcon, ShieldCheckIcon, CodeBracketIcon, 
  EyeIcon, WrenchScrewdriverIcon, CircleStackIcon, PlayCircleIcon
  // DocumentDuplicateIcon // Removed with duplicate feature
} from '@heroicons/react/24/outline';
import apiClient from '../../api/client';
// import PlexDuplicatesModal from '../plex/PlexDuplicatesModal'; // Disabled for safety

const ServiceCard = ({ service, onDelete, onRefresh, onEdit, onClick }) => {
  const [stats, setStats] = useState(service.stats || null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [logoError, setLogoError] = useState(false);
  // const [showDuplicatesModal, setShowDuplicatesModal] = useState(false); // Disabled for safety

  // Updated icons for generic service types and specific services
  const ServiceIcons = {
    // Generic types
    media: PlayIcon,
    automation: HomeIcon,
    infrastructure: ServerIcon,
    monitoring: ChartBarIcon,
    security: ShieldCheckIcon,
    storage: CloudIcon,
    backup: CircleStackIcon,
    development: CodeBracketIcon,
    
    // Specific services (for backwards compatibility)
    radarr: FilmIcon,
    sonarr: TvIcon,
    lidarr: MusicalNoteIcon,
    readarr: BookOpenIcon,
    prowlarr: MagnifyingGlassIcon,
    bazarr: TvIcon,
    plex: PlayIcon,
    jellyfin: PlayIcon,
    homeassistant: HomeIcon,
    unraid: ServerIcon,
    portainer: CubeIcon,
    grafana: ChartBarIcon,
    nextcloud: CloudIcon,
    gitea: CodeBracketIcon,
    overseerr: PlayCircleIcon,
    tautulli: ChartBarIcon
  };

  // Updated colors for generic types and specific services
  const brandColors = {
    // Generic types
    media: 'from-purple-500 to-pink-600',
    automation: 'from-blue-500 to-cyan-600', 
    infrastructure: 'from-gray-600 to-slate-700',
    monitoring: 'from-green-500 to-emerald-600',
    security: 'from-red-500 to-rose-600',
    storage: 'from-indigo-500 to-purple-600',
    backup: 'from-yellow-500 to-amber-600',
    development: 'from-orange-500 to-red-600',
    
    // Specific services
    radarr: 'from-orange-500 to-orange-600',
    sonarr: 'from-blue-500 to-blue-600',
    bazarr: 'from-purple-500 to-purple-600',
    lidarr: 'from-green-500 to-green-600',
    readarr: 'from-red-500 to-red-600',
    prowlarr: 'from-yellow-500 to-yellow-600',
    plex: 'from-yellow-400 to-orange-500',
    jellyfin: 'from-purple-400 to-blue-500',
    homeassistant: 'from-blue-600 to-indigo-600',
    unraid: 'from-orange-500 to-red-500',
    portainer: 'from-blue-400 to-blue-600',
    grafana: 'from-orange-400 to-red-500',
    nextcloud: 'from-blue-500 to-indigo-600',
    gitea: 'from-green-500 to-teal-600',
    overseerr: 'from-blue-500 to-purple-600',
    tautulli: 'from-green-400 to-blue-500'
  };

  useEffect(() => {
    console.log(`🔧 ServiceCard [${service.name}] - useEffect triggered`, {
      serviceId: service.id,
      serviceName: service.name,
      serviceType: service.type,
      hasStats: !!(service.stats && Object.keys(service.stats).length > 0),
      statsKeys: service.stats ? Object.keys(service.stats) : [],
      service: service
    });

    // Use stats from service object (populated by backend RBAC filter)
    if (service.stats && Object.keys(service.stats).length > 0) {
      console.log(`✅ ServiceCard [${service.name}] - Using provided stats`, service.stats);
      setStats(service.stats);
      setLoading(false);
    } else {
      console.log(`⚠️ ServiceCard [${service.name}] - No stats provided, fetching...`);
      // Fallback: try to fetch stats if not provided
      fetchStats();
    }
  }, [service.id, service.stats]);

  const fetchStats = async () => {
    console.log(`🔄 ServiceCard [${service.name}] - Starting stats fetch for service ID ${service.id}`);
    try {
      setLoading(true);
      // Use the generic service endpoint for stats
      const url = `/api/services/${service.id}/stats`;
      console.log(`📡 ServiceCard [${service.name}] - Fetching from: ${url}`);
      
      const response = await fetch(url);
      console.log(`📡 ServiceCard [${service.name}] - Response status: ${response.status}`);
      
      const data = await response.json();
      console.log(`📡 ServiceCard [${service.name}] - Response data:`, data);
      
      if (data.success && data.stats) {
        console.log(`✅ ServiceCard [${service.name}] - Stats fetched successfully:`, data.stats);
        setStats(data.stats);
      } else {
        console.warn(`⚠️ ServiceCard [${service.name}] - No stats in response or fetch failed`, data);
      }
    } catch (error) {
      console.error(`❌ ServiceCard [${service.name}] - Failed to fetch stats:`, {
        error: error.message,
        stack: error.stack
      });
    } finally {
      setLoading(false);
      console.log(`🏁 ServiceCard [${service.name}] - Stats fetch completed`);
    }
  };

  const handleDelete = async () => {
    console.log(`🗑️ ServiceCard [${service.name}] - Delete requested for service ID ${service.id}`);
    
    if (!window.confirm(`Delete ${service.name}? This cannot be undone.`)) {
      console.log(`❌ ServiceCard [${service.name}] - Delete cancelled by user`);
      return;
    }

    console.log(`🗑️ ServiceCard [${service.name}] - Delete confirmed, proceeding...`);
    setDeleting(true);
    try {
      console.log(`🗑️ ServiceCard [${service.name}] - DELETE request via apiClient for service ID: ${service.id}`);
      
      const data = await apiClient.deleteService(service.id);
      console.log(`🗑️ ServiceCard [${service.name}] - DELETE response data:`, data);
      
      if (data.success) {
        console.log(`✅ ServiceCard [${service.name}] - Delete successful, calling onDelete callback`);
        onDelete(service.id);
      } else {
        console.error(`❌ ServiceCard [${service.name}] - Delete failed:`, data.error);
        alert(`Failed to delete: ${data.error}`);
      }
    } catch (error) {
      console.error(`❌ ServiceCard [${service.name}] - Delete error:`, {
        error: error.message,
        stack: error.stack
      });
      alert('Failed to delete service');
    } finally {
      setDeleting(false);
      console.log(`🏁 ServiceCard [${service.name}] - Delete operation completed`);
    }
  };

  const handleRefresh = () => {
    console.log(`🔄 ServiceCard [${service.name}] - Refresh requested`);
    setLoading(true);
    fetchStats();
    if (onRefresh) {
      console.log(`🔄 ServiceCard [${service.name}] - Calling onRefresh callback`);
      onRefresh();
    }
  };

  // Resolve icon and color - try service name first, then type, then fallback
  const getIconComponent = () => {
    const serviceName = service.name.toLowerCase().replace(/\s+/g, '');
    const serviceType = service.type.toLowerCase();
    
    return ServiceIcons[serviceName] || ServiceIcons[serviceType] || ServerIcon;
  };
  
  const getGradientClass = () => {
    const serviceName = service.name.toLowerCase().replace(/\s+/g, '');
    const serviceType = service.type.toLowerCase();
    
    return brandColors[serviceName] || brandColors[serviceType] || 'from-gray-500 to-gray-600';
  };

  const IconComponent = getIconComponent();
  const gradientClass = getGradientClass();
  // Use service type for logo, not service name (for custom named services)
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
                  {stats.movies !== undefined && stats.movies !== null ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Movies</span>
                      <span className="text-sm text-green-400 font-medium">{stats.movies.toLocaleString()}</span>
                    </div>
                  ) : stats.error ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Movies</span>
                      <span className="text-sm text-red-400 font-medium text-xs">Auth Error</span>
                    </div>
                  ) : null}
                  
                  {stats.files !== undefined && stats.files !== null ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Files</span>
                      <span className="text-sm text-blue-400 font-medium">{stats.files.toLocaleString()}</span>
                    </div>
                  ) : stats.error ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Files</span>
                      <span className="text-sm text-red-400 font-medium text-xs">Auth Error</span>
                    </div>
                  ) : null}
                  
                  {stats.missing !== undefined && stats.missing !== null ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Missing</span>
                      <span className="text-sm text-amber-400 font-medium">{stats.missing.toLocaleString()}</span>
                    </div>
                  ) : stats.error ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Missing</span>
                      <span className="text-sm text-red-400 font-medium text-xs">Auth Error</span>
                    </div>
                  ) : null}
                  
                  {stats.monitored !== undefined && stats.monitored !== null && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Monitored</span>
                      <span className="text-sm text-purple-400 font-medium">{stats.monitored.toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}
              
              {service.type === 'sonarr' && (
                <>
                  {stats.series !== undefined && stats.series !== null ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Series</span>
                      <span className="text-sm text-green-400 font-medium">{stats.series.toLocaleString()}</span>
                    </div>
                  ) : stats.error ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Series</span>
                      <span className="text-sm text-red-400 font-medium text-xs">Auth Error</span>
                    </div>
                  ) : null}
                  
                  {stats.episodes !== undefined && stats.episodes !== null ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Episodes</span>
                      <span className="text-sm text-green-400 font-medium">{stats.episodes?.toLocaleString() || 'N/A'}</span>
                    </div>
                  ) : stats.error ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Episodes</span>
                      <span className="text-sm text-red-400 font-medium text-xs">Auth Error</span>
                    </div>
                  ) : null}
                  
                  {stats.files !== undefined && stats.files !== null ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Files</span>
                      <span className="text-sm text-blue-400 font-medium">{stats.files?.toLocaleString() || 'N/A'}</span>
                    </div>
                  ) : stats.error ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Files</span>
                      <span className="text-sm text-red-400 font-medium text-xs">Auth Error</span>
                    </div>
                  ) : null}
                  
                  {stats.missing !== undefined && stats.missing !== null ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Missing</span>
                      <span className="text-sm text-amber-400 font-medium">{stats.missing.toLocaleString()}</span>
                    </div>
                  ) : stats.error ? (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Missing</span>
                      <span className="text-sm text-red-400 font-medium text-xs">Auth Error</span>
                    </div>
                  ) : null}
                  
                  {stats.monitored !== undefined && stats.monitored !== null && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Monitored</span>
                      <span className="text-sm text-purple-400 font-medium">{stats.monitored.toLocaleString()}</span>
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
                  {stats.episodes !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Episodes</span>
                      <span className="text-sm text-green-400 font-medium">{stats.episodes.toLocaleString()}</span>
                    </div>
                  )}
                  {stats.activeStreams !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Active Streams</span>
                      <span className="text-sm text-blue-400 font-medium">{stats.activeStreams}</span>
                    </div>
                  )}
                  {stats.totalUsers !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Users</span>
                      <span className="text-sm text-purple-400 font-medium">{stats.totalUsers}</span>
                    </div>
                  )}
                  
                  {/* Duplicates Management Button for Plex - DISABLED
                  <div className="mt-3 pt-3 border-t border-gray-800/50">
                    // Feature temporarily disabled for safety
                  </div>
                  */}
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
              
              {service.type === 'qbittorrent' && (
                <>
                  {stats.torrents !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Torrents</span>
                      <span className="text-sm text-green-400 font-medium">{stats.torrents.toLocaleString()}</span>
                    </div>
                  )}
                  {stats.active !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Active</span>
                      <span className="text-sm text-blue-400 font-medium">{stats.active}</span>
                    </div>
                  )}
                  {stats.seeding !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Seeding</span>
                      <span className="text-sm text-green-400 font-medium">{stats.seeding}</span>
                    </div>
                  )}
                  {stats.downloading !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Downloading</span>
                      <span className="text-sm text-yellow-400 font-medium">{stats.downloading}</span>
                    </div>
                  )}
                  {stats.downloadSpeed && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Down Speed</span>
                      <span className="text-sm text-yellow-400 font-medium">{stats.downloadSpeed}</span>
                    </div>
                  )}
                  {stats.uploadSpeed && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">Up Speed</span>
                      <span className="text-sm text-purple-400 font-medium">{stats.uploadSpeed}</span>
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

              {/* Common stats for all services - Disk usage removed per request */}
              
              {/* Show total file size if available (for Sonarr/Radarr) */}
              {stats.totalFileSize && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">Total Size</span>
                  <span className="text-sm text-gray-300 font-medium">{stats.totalFileSize}</span>
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
      
      {/* Plex Duplicates Modal - DISABLED FOR SAFETY
      {service.type === 'plex' && (
        // Modal disabled - duplicate detection feature temporarily removed
      )}
      */}
    </div>
  );
};

export default ServiceCard;
