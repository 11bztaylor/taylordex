import React from 'react';

const TabNavigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'services', label: 'Services', icon: '🔧' },
    { id: 'status', label: 'Status', icon: '📊' },
    { id: 'logs', label: 'Logs', icon: '📜' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  return (
    <nav className="bg-gray-900/50 backdrop-blur-sm px-4 sticky top-0 z-10 border-b border-gray-800">
      <div className="container mx-auto flex space-x-8 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-4 px-2 border-b-2 transition-all flex items-center space-x-2 whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-green-400 text-green-400' 
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default TabNavigation;
