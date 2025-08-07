import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import UserManagement from './UserManagement';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');

  // Only admins can access this component
  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
          <p className="text-gray-300">You need admin privileges to access this area.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'users',
      name: 'Users',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      )
    },
    {
      id: 'resources',
      name: 'Resources',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M19 11H5m14-4v12a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2zM9 7v4m6-4v4" />
        </svg>
      )
    },
    {
      id: 'settings',
      name: 'Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />;
      case 'resources':
        return <ResourceManagement />;
      case 'settings':
        return <SystemSettings />;
      default:
        return <UserManagement />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-800">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-gray-300">System administration and user management</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">Logged in as:</span>
              <span className="text-sm font-medium text-white">{user.username}</span>
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-500 text-white">
                Admin
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Tab Navigation */}
          <div className="mb-8">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {tab.icon}
                  <span className="ml-2">{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div>
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Placeholder components for other tabs
const ResourceManagement = () => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-800 p-6">
      <h3 className="text-lg font-medium text-white mb-4">Resource Management</h3>
      <p className="text-gray-300 mb-6">Manage system resources, services, and integrations.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M19 11H5m14-4v12a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2zM9 7v4m6-4v4" />
          </svg>
          <h4 className="mt-4 text-sm font-medium text-white">Services</h4>
          <p className="mt-2 text-xs text-gray-300">Manage all system services</p>
        </div>

        <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h4 className="mt-4 text-sm font-medium text-white">Docker</h4>
          <p className="mt-2 text-xs text-gray-300">Container management</p>
        </div>

        <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h4 className="mt-4 text-sm font-medium text-white">APIs</h4>
          <p className="mt-2 text-xs text-gray-300">API integrations</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm text-gray-400">
          🚧 Resource management interface coming soon. For now, use the CLI tool for advanced resource management.
        </p>
        <div className="mt-2 bg-gray-800 border border-gray-700 p-3 rounded text-sm font-mono text-gray-300">
          docker-compose exec backend node user-manager.js help
        </div>
      </div>
    </div>
  );
};

const SystemSettings = () => {
  return (
    <div className="space-y-6">
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-800 p-6">
        <h3 className="text-lg font-medium text-white mb-4">System Settings</h3>
        <p className="text-gray-300 mb-6">Configure system-wide settings and preferences.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-md font-medium text-white">Authentication</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Authentication Enabled</span>
                <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Session Timeout</span>
                <span className="text-sm text-gray-400">7 days</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">User Registration</span>
                <span className="text-sm bg-red-100 text-red-800 px-2 py-1 rounded">Disabled</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-md font-medium text-white">System Info</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Database</span>
                <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Redis Cache</span>
                <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Resource System</span>
                <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">Unified</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm text-gray-400">
            🚧 Advanced settings interface coming soon. For now, use environment variables or CLI tools.
          </p>
        </div>
      </div>

      {/* CLI Commands Reference */}
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-800 p-6">
        <h3 className="text-lg font-medium text-white mb-4">Quick CLI Commands</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-300 mb-1">List all users:</p>
            <div className="bg-gray-800 border border-gray-700 p-2 rounded text-sm font-mono text-gray-300">
              docker-compose exec backend node user-manager.js list
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300 mb-1">Create new user:</p>
            <div className="bg-gray-800 border border-gray-700 p-2 rounded text-sm font-mono text-gray-300">
              docker-compose exec backend node user-manager.js create username email@domain.com password role
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300 mb-1">Grant media permissions:</p>
            <div className="bg-gray-800 border border-gray-700 p-2 rounded text-sm font-mono text-gray-300">
              docker-compose exec backend node user-manager.js grant-tag username category media '&#123;"read":true,"control":true&#125;'
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;