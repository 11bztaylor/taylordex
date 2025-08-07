import React, { useState } from 'react';
import ServiceCard from './ServiceCard';
import AddServiceModal from './AddServiceModal';
import EditServiceModal from './EditServiceModal';
import ServiceDetailModal from './ServiceDetailModal';
import NetworkDiscoveryModal from '../discovery/NetworkDiscoveryModal';
import DockerHostsSection from './DockerHostsSection';
import { ArrowPathIcon, WifiIcon, PlusIcon, ServerIcon, CubeIcon } from '@heroicons/react/24/outline';
import { ServiceCardSkeleton } from '../shared/LoadingSkeleton';

const ServicesTab = ({ services, loading, onRefresh, onDeleteService }) => {
  const [activeTab, setActiveTab] = useState('services');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDiscoveryModal, setShowDiscoveryModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const handleServiceAdded = () => {
    console.log('📝 ServicesTab - Service added, triggering refresh');
    onRefresh();
  };

  const handleServiceUpdated = () => {
    console.log('✏️ ServicesTab - Service updated, triggering refresh');
    onRefresh();
  };

  const handleEditService = (service) => {
    console.log('✏️ ServicesTab - Opening edit modal for service:', service);
    setEditingService(service);
    setShowEditModal(true);
  };

  const handleServiceClick = (service) => {
    console.log('👆 ServicesTab - Service clicked, opening detail modal:', service);
    setSelectedService(service);
    setShowDetailModal(true);
  };
  
  const handleServicesDiscovered = (discoveredServices) => {
    console.log('🔍 ServicesTab - Services discovered:', discoveredServices);
    console.log('🔄 ServicesTab - Forcing immediate refresh after discovery');
    
    // Force refresh with a small delay to ensure backend has processed
    setTimeout(() => {
      console.log('⚡ ServicesTab - Executing delayed refresh');
      onRefresh();
    }, 1000);
    
    // Also do immediate refresh
    onRefresh();
  };

  // Listen for Docker container requests from service cards
  React.useEffect(() => {
    const handleShowDockerContainers = (event) => {
      const { serviceName, serviceType } = event.detail;
      // Switch to Docker Hosts tab and filter by the service
      setActiveTab('docker');
      // TODO: Add filtering logic here
    };

    window.addEventListener('showDockerContainers', handleShowDockerContainers);
    return () => window.removeEventListener('showDockerContainers', handleShowDockerContainers);
  }, []);

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
          {Array.from({ length: 6 }).map((_, index) => (
            <ServiceCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'services', name: 'Services', icon: ServerIcon },
    { id: 'docker', name: 'Docker Hosts', icon: CubeIcon }
  ];

  return (
    <div>
      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-800">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'services' ? (
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
              
              <div className="flex space-x-3">
                <button 
                  onClick={() => setShowDiscoveryModal(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm transition-colors flex items-center space-x-2 text-white"
                >
                  <WifiIcon className="w-4 h-4" />
                  <span>Discover Services</span>
                </button>
                
                <button 
                  onClick={onRefresh}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors flex items-center space-x-2 border border-gray-700 hover:border-gray-600"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  <span>Refresh All</span>
                </button>
              </div>
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
                onClick={handleServiceClick}
              />
            ))}
            
            {/* Add Service Card */}
            <div className="bg-gray-900/30 backdrop-blur-sm rounded-xl p-6 border-2 border-dashed border-gray-800 min-h-[200px] flex flex-col">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-3 border border-gray-700">
                  <PlusIcon className="w-6 h-6 text-gray-500" />
                </div>
                <p className="text-gray-400 font-medium">Add New Service</p>
                <p className="text-xs text-gray-500 mt-1">Connect a service to TaylorDex</p>
              </div>
              
              <div className="flex-1 flex flex-col space-y-3">
                <button 
                  onClick={() => setShowDiscoveryModal(true)}
                  className="flex-1 bg-green-600/20 hover:bg-green-600/30 border border-green-600/50 hover:border-green-500 rounded-lg p-3 transition-all group"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <WifiIcon className="w-4 h-4 text-green-400" />
                    <span className="text-green-300 text-sm font-medium">Discover Network</span>
                  </div>
                  <p className="text-xs text-green-400/70 mt-1">Scan for services automatically</p>
                </button>
                
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="flex-1 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-gray-600 rounded-lg p-3 transition-all"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <PlusIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-300 text-sm font-medium">Manual Entry</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Add service manually</p>
                </button>
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
          
          {/* Network Discovery Modal */}
          <NetworkDiscoveryModal 
            isOpen={showDiscoveryModal}
            onClose={() => setShowDiscoveryModal(false)}
            onServicesFound={handleServicesDiscovered}
          />

          {/* Service Detail Modal */}
          <ServiceDetailModal
            isOpen={showDetailModal}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedService(null);
            }}
            service={selectedService}
            allServices={services}
          />
        </div>
      ) : (
        <DockerHostsSection />
      )}
    </div>
  );
};

export default ServicesTab;