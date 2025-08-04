import React, { useState } from 'react';
import ServiceCard from './ServiceCard';
import AddServiceModal from './AddServiceModal';
import EditServiceModal from './EditServiceModal';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

const ServicesTab = ({ services, loading, onRefresh, onDeleteService }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingService, setEditingService] = useState(null);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading services...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with refresh button */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-white">Docker Services</h2>
          <p className="text-sm text-gray-400 mt-1">
            {services.length} {services.length === 1 ? 'service' : 'services'} configured
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
      
      {/* Services grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
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
