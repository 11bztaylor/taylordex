import React, { useState, useEffect, Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { EllipsisVerticalIcon, TrashIcon, ArrowPathIcon, PencilIcon } from '@heroicons/react/24/outline';

const ServiceCard = ({ service, onDelete, onRefresh }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [service.id, service.type]);

  const fetchStats = async () => {
    try {
      if (['radarr', 'sonarr', 'lidarr', 'readarr'].includes(service.type)) {
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
            <Menu.Items className="absolute right-0 mt-2 w-40 origin-top-right rounded-lg bg-gray-900/95 backdrop-blur-sm border border-gray-800 shadow-lg shadow-black/50 focus:outline-none">
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

      {/* Card Content */}
      <div className="pr-8">
        <h3 className="text-lg font-semibold text-white mb-1">{service.name}</h3>
        <p className="text-sm text-gray-400">{service.host}:{service.port}</p>
        
        <div className="mt-4 space-y-2">
          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-800 rounded w-3/4"></div>
              <div className="h-4 bg-gray-800 rounded w-1/2"></div>
            </div>
          ) : stats ? (
            <>
              {stats.movies !== undefined && (
                <p className="text-sm text-gray-400">
                  Movies: <span className="text-green-400 font-medium">{stats.movies.toLocaleString()}</span>
                </p>
              )}
              {stats.series !== undefined && (
                <p className="text-sm text-gray-400">
                  Series: <span className="text-green-400 font-medium">{stats.series.toLocaleString()}</span>
                </p>
              )}
              {stats.diskSpace && (
                <p className="text-sm text-gray-400">
                  Disk: <span className="text-green-400 font-medium">{stats.diskSpace}</span>
                </p>
              )}
              {stats.status && (
                <div className="flex items-center space-x-2 mt-3">
                  <div className={`w-2 h-2 rounded-full ${stats.status === 'online' ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-xs text-gray-500 capitalize">{stats.status}</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500">No stats available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;
