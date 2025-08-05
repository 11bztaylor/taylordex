import React, { useState } from 'react';
import ServiceCard from './ServiceCard';
import AddServiceModal from './AddServiceModal';
import EditServiceModal from './EditServiceModal';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { ServiceCardSkeleton } from '../shared/LoadingSkeleton';

const ServicesTab = ({ services, loading, onRefresh, onDeleteService }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, online, offline
  const [typeFilter, setTypeFilter] = useState('all'); // all, radarr, sonarr, etc.

  const handleServiceAdded = () => {
    onRefresh();
  };

  const handleServiceUpdated = () => {
    onRefresh();
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setShowEditModal(true);
  };

  // Filter services based on search and filters
  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.host.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'online' && service.status === 'online') ||
                         (statusFilter === 'offline' && (service.status === 'offline' || service.status === 'unknown' || !service.enabled));
    
    const matchesType = typeFilter === 'all' || service.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Get unique service types for filter dropdown
  const serviceTypes = [...new Set(services.map(s => s.type))].sort();

  // Show skeleton loaders during initial load
  if (loading) {
    return (
      <div>
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-white">Docker Services</h2>
            <p className="text-sm text-gray-400 mt-1">Loading services...</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Show 6 skeleton cards */}
          {Array.from({ length: 6 }).map((_, index) => (
            <ServiceCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with search and filters */}
      <div className="mb-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-white">Docker Services</h2>
            <p className="text-sm text-gray-400 mt-1">
              {filteredServices.length} of {services.length} services shown
            </p>
          </div>
          <button 
            onClick={onRefresh}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors flex items-center space-x-2 border border-gray-700 hover:border-gray-600"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>Refresh All</span>
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search services by name, type, or host..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
            />
          </div>
          
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500"
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
          
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500"
          >
            <option value="all">All Types</option>
            {serviceTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Services grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => (
          <ServiceCard 
            key={service.id} 
            service={service} 
            onDelete={onDeleteService}
            onRefresh={onRefresh}
            onEdit={handleEditService}
          />
        ))}
        
        {/* Add Service Card */}
        <div 
          onClick={() => setShowAddModal(true)}
          className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-6 border-2 border-dashed border-gray-800 hover:border-green-900/50 transition-all flex items-center justify-center min-h-[200px] group cursor-pointer"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-500/10 transition-all group-hover:shadow-lg group-hover:shadow-green-500/10 border border-gray-700 group-hover:border-green-900/50">
              <svg className="w-8 h-8 text-gray-500 group-hover:text-green-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-gray-400 group-hover:text-gray-300 transition-colors font-medium">Add New Service</p>
            <p className="text-xs text-gray-500 mt-1">Click to connect a service</p>
          </div>
        </div>
      </div>

      {/* Add Service Modal */}
      <AddServiceModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onServiceAdded={handleServiceAdded}
      />

      {/* Edit Service Modal */}
      <EditServiceModal 
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingService(null);
        }}
        service={editingService}
        onServiceUpdated={handleServiceUpdated}
      />
    </div>
  );
};

export default ServicesTab;
