import React, { useState, useEffect } from 'react';

const ServiceCard = ({ service }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800 hover:border-green-900/50 transition-all">
      <h3 className="text-lg font-semibold text-white">{service.name}</h3>
      <p className="text-sm text-gray-400">{service.host}:{service.port}</p>
      
      {loading ? (
        <p className="text-sm text-gray-500 mt-2">Loading stats...</p>
      ) : stats ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-400">Movies: <span className="text-white">{stats.movies?.toLocaleString() || 0}</span></p>
          <p className="text-sm text-gray-400">Disk: <span className="text-white">{stats.diskSpace || 'N/A'}</span></p>
        </div>
      ) : (
        <p className="text-sm text-gray-500 mt-2">No stats available</p>
      )}
    </div>
  );
};

export default ServiceCard;
