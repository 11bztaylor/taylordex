import React, { useState } from 'react';

function App() {
  const [activeTab, setActiveTab] = useState('services');

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">TaylorDex</h1>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-gray-800 px-4">
        <div className="container mx-auto flex space-x-8">
          <button 
            onClick={() => setActiveTab('services')}
            className={`py-4 px-2 border-b-2 ${activeTab === 'services' ? 'border-blue-500 text-blue-500' : 'border-transparent'}`}
          >
            Services
          </button>
          <button 
            onClick={() => setActiveTab('status')}
            className={`py-4 px-2 border-b-2 ${activeTab === 'status' ? 'border-blue-500 text-blue-500' : 'border-transparent'}`}
          >
            Status
          </button>
        </div>
      </nav>

      {/* Tab Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'services' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Services</h2>
            <p>Service management will go here</p>
          </div>
        )}
        
        {activeTab === 'status' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Status</h2>
            <p>Service status details will go here</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
