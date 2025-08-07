import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/layout/Header';
import TabNavigation from './components/layout/TabNavigation';
import ServicesTab from './components/services/ServicesTab';
import StatusTab from './components/status/StatusTab';
import LogsTab from './components/logs/LogsTab';
import LoginForm from './components/auth/LoginForm';
import SetupForm from './components/auth/SetupForm';
import AdminDashboard from './components/admin/AdminDashboard';
import ErrorBoundary from './components/shared/ErrorBoundary';
import ErrorTestComponent from './components/test/ErrorTestComponent';
import apiClient from './api/client';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('services');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, token } = useAuth();

  const currentUser = user || {
    id: 1,
    name: user?.username || "Admin User",
    email: user?.email || "admin@localhost",
    role: user?.role || "admin"
  };

  useEffect(() => {
    fetchServices();
    // Refresh every 30 seconds
    const interval = setInterval(fetchServices, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchServices = async () => {
    try {
      console.log('🔄 App - Starting services fetch', {
        hasToken: !!token,
        tokenSource: token ? 'AuthContext' : 'None',
        localStorageToken: !!localStorage.getItem('auth_token'),
        user: user?.username,
        timestamp: new Date().toISOString()
      });
      
      console.log('📡 App - Fetching services via API client');
      
      const data = await apiClient.getServices();
      
      // Fix: Services are in data.data.services, not data.services
      const services = data.data?.services || [];
      
      console.log('📡 App - Services response data:', {
        success: data.success,
        serviceCount: services.length,
        error: data.error,
        serviceNames: services.map(s => s.name) || [],
        timestamp: new Date().toISOString()
      });
      
      // Debug: Log full response if it looks suspicious
      if (data.success && services.length < 5) {
        console.warn('⚠️ App - Suspiciously low service count. Full response:', data);
      }
      
      if (data.success) {
        const transformedServices = services.map(service => ({
          id: service.id,
          name: service.name,
          type: service.type,
          host: service.host,
          port: service.port,
          enabled: service.enabled !== false, // Ensure enabled is a boolean
          status: service.status || 'unknown',
          lastSeen: service.lastSeen 
            ? new Date(service.lastSeen).toLocaleString() 
            : 'Never',
          stats: service.stats || {}
        }));
        
        console.log('✅ App - Services transformed successfully:', {
          originalCount: services.length,
          transformedCount: transformedServices.length,
          services: transformedServices.map(s => ({
            id: s.id,
            name: s.name, 
            type: s.type,
            hasStats: Object.keys(s.stats).length > 0,
            statsKeys: Object.keys(s.stats)
          }))
        });
        
        setServices(transformedServices);
      } else {
        console.warn('⚠️ App - Services fetch unsuccessful:', data.error);
        setServices([]);
      }
    } catch (error) {
      console.error('❌ App - Failed to fetch services:', {
        error: error.message,
        stack: error.stack
      });
      setServices([]);
    } finally {
      setLoading(false);
      console.log('🏁 App - Services fetch completed');
    }
  };

  const handleDeleteService = (serviceId) => {
    // Optimistically remove from UI
    setServices(prevServices => prevServices.filter(s => s.id !== serviceId));
    
    // Could also show a success toast here
    console.log(`Service ${serviceId} deleted successfully`);
  };

  const totalServices = services.length;
  const onlineServices = services.filter(s => s.status === 'online' && s.enabled !== false).length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <ErrorBoundary fallbackMessage="There was an error loading the header">
        <Header 
          currentUser={currentUser} 
          onlineServices={onlineServices} 
          totalServices={totalServices} 
        />
      </ErrorBoundary>
      
      <ErrorBoundary fallbackMessage="There was an error loading the navigation">
        <TabNavigation 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
        />
      </ErrorBoundary>

      <main className="container mx-auto px-4 py-8">
        <ErrorBoundary fallbackMessage="There was an error loading the main content">
          {activeTab === 'services' && (
            <ServicesTab 
              services={services} 
              loading={loading}
              onRefresh={fetchServices}
              onDeleteService={handleDeleteService}
            />
          )}
          
          {activeTab === 'status' && (
            <StatusTab services={services} />
          )}
          
          {activeTab === 'logs' && (
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden">
              <LogsTab />
            </div>
          )}
          
          {activeTab === 'users' && (
            <AdminDashboard />
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
                        <span className={`text-gray-400 ${service.enabled === false ? 'line-through' : ''}`}>
                          {service.name}
                        </span>
                        <span className="text-gray-500">
                          ID: {service.id} {service.enabled === false && '(Disabled)'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-300 mb-2">Testing</h3>
                  <ErrorBoundary fallbackMessage="Error test component failed">
                    <ErrorTestComponent />
                  </ErrorBoundary>
                </div>
              </div>
            </div>
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
};

const AuthenticatedApp = () => {
  const { loading, setupRequired, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (setupRequired) {
    return <SetupForm />;
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return <Dashboard />;
};

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;
