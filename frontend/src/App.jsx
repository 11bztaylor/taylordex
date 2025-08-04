import React, { useState } from 'react';
import Header from './components/layout/Header';
import TabNavigation from './components/layout/TabNavigation';
import ServicesTab from './components/services/ServicesTab';

function App() {
  const [activeTab, setActiveTab] = useState('services');

  // Mock data
  const mockServices = [
    { 
      id: 1,
      name: "Radarr - Movies", 
      type: "radarr", 
      host: "pidocker.taylorhomelink.com",
      port: 7878,
      status: "online",
      lastSeen: "2 min ago",
      stats: { movies: 1245, missing: 23, diskSpace: "2.4 TB" }
    },
    { 
      id: 2,
      name: "Sonarr - TV Shows", 
      type: "sonarr", 
      host: "pidocker.taylorhomelink.com",
      port: 8989,
      status: "online",
      lastSeen: "1 min ago",
      stats: { series: 89, episodes: 4521, diskSpace: "8.1 TB" }
    },
    { 
      id: 3,
      name: "Plex Media Server", 
      type: "plex", 
      host: "mediaserver.local",
      port: 32400,
      status: "offline",
      lastSeen: "Connection failed",
      stats: { users: 3, libraries: 5, playing: 0 }
    }
  ];

  const currentUser = {
    id: 1,
    name: "Zach Taylor",
    email: "zach@taylorhomelink.com",
    role: "admin"
  };

  const totalServices = mockServices.length;
  const onlineServices = mockServices.filter(s => s.status === 'online').length;

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
        {activeTab === 'services' && <ServicesTab services={mockServices} />}
        
        {activeTab === 'status' && (
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-4 text-green-400">Status Dashboard</h2>
            <p className="text-gray-400">Status components coming soon...</p>
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
            <p className="text-gray-400">Settings coming soon...</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
