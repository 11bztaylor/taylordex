import React from 'react';
import { 
  ServerIcon, 
  ChartBarIcon, 
  DocumentTextIcon, 
  UsersIcon, 
  Cog6ToothIcon 
} from '@heroicons/react/24/outline';

const TabNavigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'services', label: 'Services', icon: ServerIcon },
    { id: 'status', label: 'Status', icon: ChartBarIcon },
    { id: 'logs', label: 'Logs', icon: DocumentTextIcon },
    { id: 'users', label: 'Users', icon: UsersIcon },
    { id: 'settings', label: 'Settings', icon: Cog6ToothIcon }
  ];

  return (
    <nav className="bg-gray-900/50 backdrop-blur-sm px-4 sticky top-0 z-10 border-b border-gray-800">
      <div className="container mx-auto flex space-x-8 overflow-x-auto">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-2 border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'border-green-400 text-green-400' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <IconComponent className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default TabNavigation;
