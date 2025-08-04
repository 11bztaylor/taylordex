import React, { useState } from 'react';
import ServiceCard from './ServiceCard';
import AddServiceModal from './AddServiceModal';

const ServicesTab = ({ services, loading, onRefresh }) => {
  const [showAddModal, setShowAddModal] = useState(false);

  const handleServiceAdded = () => {
    onRefresh();
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
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-300">Docker Services</h2>
        <button 
          onClick={onRefresh}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh All</span>
        </button>
      </div>
      
      {/* Services grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <ServiceCard 
            key={service.id} 
            service={service} 
            onRefresh={onRefresh}
          />
        ))}
        
        {/* Add Service Card */}
        <div 
          onClick={() => setShowAddModal(true)}
          className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-6 border-2 border-dashed border-gray-800 hover:border-green-900/50 transition-all flex items-center justify-center min-h-[250px] group cursor-pointer"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-500/10 transition-all group-hover:shadow-lg group-hover:shadow-green-500/10 border border-gray-700 group-hover:border-green-900/50">
              <svg className="w-8 h-8 text-gray-500 group-hover:text-green-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-gray-400 group-hover:text-gray-300 transition-colors">Add New Service</p>
          </div>
        </div>
      </div>

      {/* Add Service Modal */}
      <AddServiceModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onServiceAdded={handleServiceAdded}
      />
    </div>
  );
};

export default ServicesTab;
