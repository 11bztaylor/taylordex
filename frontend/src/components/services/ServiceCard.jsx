import React from 'react';

const ServiceCard = ({ service }) => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 hover:border-green-900/50 transition-all hover:shadow-xl hover:shadow-green-500/5 group">
      {/* Service Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white group-hover:text-green-400 transition-colors">
            {service.name}
          </h3>
          <p className="text-sm text-gray-400">{service.host}:{service.port}</p>
        </div>
        
        {/* Status Indicator */}
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            service.status === 'online' 
              ? 'bg-green-400 animate-pulse shadow-sm shadow-green-400' 
              : 'bg-red-500'
          }`}></div>
          <span className={`text-sm ${
            service.status === 'online' ? 'text-green-400' : 'text-red-400'
          }`}>
            {service.status}
          </span>
        </div>
      </div>

      {/* Service Stats */}
      <div className="space-y-3">
        {service.type === 'radarr' && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Movies</span>
              <span className="text-white font-medium">{service.stats.movies}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Missing</span>
              <span className="text-yellow-400 font-medium">{service.stats.missing}</span>
            </div>
          </>
        )}
        
        {service.type === 'sonarr' && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Series</span>
              <span className="text-white font-medium">{service.stats.series}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Episodes</span>
              <span className="text-white font-medium">{service.stats.episodes}</span>
            </div>
          </>
        )}
        
        {service.type === 'plex' && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Users</span>
              <span className="text-white font-medium">{service.stats.users}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Libraries</span>
              <span className="text-white font-medium">{service.stats.libraries}</span>
            </div>
          </>
        )}
        
        <div className="flex justify-between text-sm pt-2 border-t border-gray-800">
          <span className="text-gray-400">Disk Usage</span>
          <span className="text-white font-medium">{service.stats.diskSpace || 'N/A'}</span>
        </div>
        
        <div className="text-xs text-gray-500 mt-2">
          Last seen: {service.lastSeen}
        </div>
      </div>

      {/* Hover Actions */}
      <div className="mt-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="flex-1 py-2 px-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg text-sm transition-all hover:shadow-md hover:shadow-green-500/10 border border-green-500/20">
          Open
        </button>
        <button className="flex-1 py-2 px-3 bg-gray-800/50 hover:bg-gray-800 text-gray-300 rounded-lg text-sm transition-colors border border-gray-700">
          Restart
        </button>
      </div>
    </div>
  );
};

export default ServiceCard;
