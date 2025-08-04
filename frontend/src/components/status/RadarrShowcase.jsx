import React from 'react';

// This will show ALL the Radarr data we can display
const RadarrShowcase = ({ radarrService }) => {
  const stats = radarrService?.stats || {};
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-4">
        Radarr Data Showcase - {radarrService?.name}
      </h2>
      
      {/* Basic Stats */}
      <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-green-400 mb-4">Basic Stats</h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-3xl font-bold text-white">{stats.movies || 0}</p>
            <p className="text-sm text-gray-400">Total Movies</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-amber-400">{stats.missing || 0}</p>
            <p className="text-sm text-gray-400">Missing</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-400">{stats.monitored || 0}</p>
            <p className="text-sm text-gray-400">Monitored</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-400">{stats.diskSpace || 'N/A'}</p>
            <p className="text-sm text-gray-400">Disk Usage</p>
          </div>
        </div>
      </div>
      
      {/* Queue Details */}
      {stats.queue && (
        <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold text-green-400 mb-4">
            Download Queue ({stats.queue.total || 0})
          </h3>
          {stats.queue.items?.map((item, idx) => (
            <div key={idx} className="mb-3 bg-gray-800/50 p-3 rounded">
              <div className="flex justify-between">
                <span className="text-white font-medium">{item.title}</span>
                <span className="text-green-400">{item.progress}%</span>
              </div>
              <div className="mt-2 bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-400 h-2 rounded-full"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-400">
                {item.size} • ETA: {item.eta}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Recent Additions */}
      {stats.recentAdditions?.length > 0 && (
        <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold text-green-400 mb-4">
            Recent Additions
          </h3>
          <div className="space-y-2">
            {stats.recentAdditions.map((movie, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-300">{movie.title}</span>
                <span className="text-gray-500">
                  {movie.quality} • {movie.size}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Quality Breakdown */}
      {stats.qualityBreakdown && (
        <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold text-green-400 mb-4">
            Quality Distribution
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.qualityBreakdown).map(([quality, count]) => (
              <div key={quality} className="flex justify-between">
                <span className="text-gray-300">{quality}</span>
                <span className="text-white font-medium">{count} movies</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Health Warnings */}
      {stats.health?.warnings?.length > 0 && (
        <div className="bg-red-900/20 rounded-xl p-6 border border-red-800">
          <h3 className="text-lg font-semibold text-red-400 mb-4">
            Health Warnings ({stats.health.issues})
          </h3>
          <ul className="space-y-2">
            {stats.health.warnings.map((warning, idx) => (
              <li key={idx} className="text-sm text-gray-300">
                • {warning}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* All Available Fields Debug */}
      <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold text-green-400 mb-4">
          All Available Data Fields
        </h3>
        <pre className="text-xs text-gray-400 overflow-auto">
          {JSON.stringify(stats, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default RadarrShowcase;
