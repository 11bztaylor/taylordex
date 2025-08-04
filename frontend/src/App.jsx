import React, { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import TabNavigation from './components/layout/TabNavigation';
import ServicesTab from './components/services/ServicesTab';

function App() {
  const [activeTab, setActiveTab] = useState('services');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUser = {
    id: 1,
    name: "Zach Taylor",
    email: "zach@taylorhomelink.com",
    role: "admin"
  };

  useEffect(() => {
    fetchServices();
    // Refresh every 30 seconds
    const interval = setInterval(fetchServices, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/services');
      const data = await response.json();
      
      if (data.success) {
        const transformedServices = data.services.map(service => ({
          id: service.id,
          name: service.name,
          type: service.type,
          host: service.host,
          port: service.port,
          status: service.status || 'unknown',
          lastSeen: service.lastSeen 
            ? new Date(service.lastSeen).toLocaleString() 
            : 'Never',
          stats: service.stats || {}
        }));
        setServices(transformedServices);
      } else {
        setServices([]);
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = (serviceId) => {
    // Optimistically remove from UI
    setServices(prevServices => prevServices.filter(s => s.id !== serviceId));
    
    // Could also show a success toast here
    console.log(`Service ${serviceId} deleted successfully`);
  };

  const totalServices = services.length;
  const onlineServices = services.filter(s => s.status === 'online').length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header 
        currentUser={currentUser} 
        onlineServices={onlineServices} 
        totalServices={totalServices} 
      />
      
      <TabNavigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      <main className="container mx-auto px-4 py-8">
        {activeTab === 'services' && (
          <ServicesTab 
            services={services} 
            loading={loading}
            onRefresh={fetchServices}
            onDeleteService={handleDeleteService}
          />
        )}
        
        {activeTab === 'status' && (
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4 text-green-400">Status Dashboard</h2>
            {services.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {services.map(service => (
                  <div key={service.id} className="bg-gray-800/50 rounded-lg p-4">
                    <h3 className="font-medium text-white">{service.name}</h3>
                    <p className="text-sm text-gray-400">{service.type}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {service.host}:{service.port}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No services configured yet.</p>
            )}
          </div>
        )}
        
        {activeTab === 'logs' && (
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4 text-green-400">System Logs</h2>
            <p className="text-gray-400">Log viewer coming soon...</p>
          </div>
        )}
        
        {activeTab === 'users' && (
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4 text-green-400">User Management</h2>
            <p className="text-gray-400">User management coming soon...</p>
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4 text-green-400">Settings</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-300 mb-2">API Configuration</h3>
                <p className="text-sm text-gray-500">
                  Backend API: http://localhost:5000
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-300 mb-2">Database Services</h3>
                <div className="space-y-2 mt-2">
                  {services.map(service => (
                    <div key={service.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">{service.name}</span>
                      <span className="text-gray-500">ID: {service.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
