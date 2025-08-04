import React, { useState, useEffect, Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { EllipsisVerticalIcon, TrashIcon, ArrowPathIcon, PencilIcon } from '@heroicons/react/24/outline';

const ServiceCard = ({ service, onDelete, onRefresh }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Service logo mapping - using the raw GitHub URLs from homelab-svg-assets
  const serviceLogos = {
    radarr: 'https://raw.githubusercontent.com/loganmarchione/homelab-svg-assets/main/assets/radarr.svg',
    sonarr: 'https://raw.githubusercontent.com/loganmarchione/homelab-svg-assets/main/assets/sonarr.svg',
    bazarr: 'https://raw.githubusercontent.com/loganmarchione/homelab-svg-assets/main/assets/bazarr.svg',
    lidarr: 'https://raw.githubusercontent.com/loganmarchione/homelab-svg-assets/main/assets/lidarr.svg',
    readarr: 'https://raw.githubusercontent.com/loganmarchione/homelab-svg-assets/main/assets/readarr.svg',
    prowlarr: 'https://raw.githubusercontent.com/loganmarchione/homelab-svg-assets/main/assets/prowlarr.svg',
    overseerr: 'https://raw.githubusercontent.com/loganmarchione/homelab-svg-assets/main/assets/overseerr.svg',
    requestrr: 'https://raw.githubusercontent.com/loganmarchione/homelab-svg-assets/main/assets/requestrr.svg',
    plex: 'https://raw.githubusercontent.com/loganmarchione/homelab-svg-assets/main/assets/plex.svg',
    jellyfin: 'https://raw.githubusercontent.com/loganmarchione/homelab-svg-assets/main/assets/jellyfin.svg',
    emby: 'https://raw.githubusercontent.com/loganmarchione/homelab-svg-assets/main/assets/emby.svg',
    tautulli: 'https://raw.githubusercontent.com/loganmarchione/homelab-svg-assets/main/assets/tautulli.svg',
    ombi: 'https://raw.githubusercontent.com/loganmarchione/homelab-svg-assets/main/assets/ombi.svg',
    sabnzbd: 'https://raw.githubusercontent.com/loganmarchione/homelab-svg-assets/main/assets/sabnzbd.svg',
    nzbget: 'https://raw.githubusercontent.com/loganmarchione/homelab-svg-assets/main/assets/nzbget.svg',
    qbittorrent: 'https://raw.githubusercontent.com/loganmarchione/homelab-svg-assets/main/assets/qbittorrent.svg',
    deluge: 'https://raw.githubusercontent.com/loganmarchione/homelab-svg-assets/main/assets/deluge.svg',
    transmission: 'https://raw.githubusercontent.com/loganmarchione/homelab-svg-assets/main/assets/transmission.svg',
    jackett: 'https://raw.githubusercontent.com/loganmarchione/homelab-svg-assets/main/assets/jackett.svg',
    flaresolverr: 'https://raw.githubusercontent.com/loganmarchione/homelab-svg-assets/main/assets/flaresolverr.svg',
    organizr: 'https://raw.githubusercontent.com/loganmarchione/homelab-svg-assets/main/assets/organizr.svg',
    heimdall: 'https://raw.githubusercontent.com/loganmarchione/homelab-svg-assets/main/assets/heimdall.svg',
    // Add more as needed from the ICONS.md file
  };

  useEffect(() => {
    fetchStats();
  }, [service.id, service.type]);

  const fetchStats = async () => {
    try {
      if (['radarr', 'sonarr', 'lidarr', 'readarr', 'bazarr', 'prowlarr'].includes(service.type)) {
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

  const logoUrl = serviceLogos[service.type.toLowerCase()];

  return (
    <div className={`bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 hover:border-green-900/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/10 relative ${deleting ? 'opacity-50' : ''}`}>
      {/* Options Menu */}
      <div className="absolute top-4 right-4">
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
                      onClick={() => alert('Edit feature coming soon!')}
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
          {/* Service Logo */}
          {logoUrl ? (
            <div className="w-12 h-12 bg-gray-800/50 rounded-lg p-2 flex-shrink-0">
              <img 
                src={logoUrl} 
                alt={`${service.name} logo`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center text-gray-500 text-xs font-medium">' + service.type.substring(0, 2).toUpperCase() + '</div>';
                }}
              />
            </div>
          ) : (
            <div className="w-12 h-12 bg-gray-800/50 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-gray-500 text-sm font-medium">
                {service.type.substring(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          
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
