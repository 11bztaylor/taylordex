import React from 'react';
import ServiceCard from './ServiceCard';

const ServicesTab = ({ services }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} />
      ))}
      
      {/* Add Service Card */}
      <div className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-6 border-2 border-dashed border-gray-800 hover:border-green-900/50 transition-all flex items-center justify-center min-h-[250px] group cursor-pointer">
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
  );
};

export default ServicesTab;
