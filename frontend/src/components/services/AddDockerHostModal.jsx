import React, { useState } from 'react';
import { ServerIcon } from '@heroicons/react/24/outline';

const AddDockerHostModal = ({ isOpen, onClose, onHostAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'socket',
    host: '',
    port: '',
    monitor: true
  });
  const [testing, setTesting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);

  const hostTypes = [
    { 
      value: 'socket', 
      label: 'Docker Socket', 
      description: 'Local Docker socket (requires socket mount)',
      defaultPort: '',
      icon: '🔌'
    },
    { 
      value: 'tcp', 
      label: 'Remote TCP', 
      description: 'Remote Docker API via TCP',
      defaultPort: 2375,
      icon: '🌐'
    },
    { 
      value: 'ssh', 
      label: 'SSH Connection', 
      description: 'Connect via SSH (secure)',
      defaultPort: 22,
      icon: '🔐'
    }
  ];

  const handleTypeChange = (type) => {
    const hostType = hostTypes.find(h => h.value === type);
    setFormData({
      ...formData,
      type,
      port: hostType?.defaultPort || ''
    });
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/docker/hosts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `test-${Date.now()}`, // Temporary name for testing
          type: formData.type,
          host: formData.host,
          port: formData.port ? parseInt(formData.port) : undefined,
          socketPath: formData.type === 'socket' ? '/var/run/docker.sock' : undefined,
          monitor: false // Don't start monitoring during test
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Remove the test connection
        await fetch(`http://localhost:5000/api/docker/hosts/test-${Date.now()}`, {
          method: 'DELETE'
        }).catch(() => {}); // Ignore cleanup errors
        
        setTestResult(result);
      } else {
        setTestResult({ success: false, error: result.details || result.error });
      }
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAdding(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/docker/hosts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          host: formData.host,
          port: formData.port ? parseInt(formData.port) : undefined,
          socketPath: formData.type === 'socket' ? '/var/run/docker.sock' : undefined,
          monitor: formData.monitor
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        onHostAdded();
        handleClose();
      } else {
        setError(result.details || result.error || 'Failed to add Docker host');
      }
    } catch (error) {
      console.error('Failed to add Docker host:', error);
      setError('Failed to connect to backend');
    } finally {
      setAdding(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      type: 'socket',
      host: '',
      port: '',
      monitor: true
    });
    setTestResult(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const selectedType = hostTypes.find(h => h.value === formData.type);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-800">
        <div className="flex items-center space-x-3 mb-4">
          <ServerIcon className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Add Docker Host</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Host Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
              placeholder="e.g., Unraid Server, Local Docker"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Connection Type</label>
            <div className="space-y-2">
              {hostTypes.map(type => (
                <label key={type.value} className="flex items-center space-x-3 p-3 border border-gray-700 rounded-lg hover:border-gray-600 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value={type.value}
                    checked={formData.type === type.value}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="text-blue-500 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{type.icon}</span>
                      <span className="text-white font-medium">{type.label}</span>
                    </div>
                    <p className="text-xs text-gray-400">{type.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {formData.type !== 'socket' && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Host</label>
                <input
                  type="text"
                  value={formData.host}
                  onChange={(e) => setFormData({...formData, host: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., 192.168.15.5 or unraid.local"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Port</label>
                <input
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData({...formData, port: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  placeholder={selectedType?.defaultPort?.toString()}
                />
              </div>
            </>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="monitor"
              checked={formData.monitor}
              onChange={(e) => setFormData({...formData, monitor: e.target.checked})}
              className="rounded text-blue-500 focus:ring-blue-500"
            />
            <label htmlFor="monitor" className="text-sm text-gray-300">
              Enable automatic monitoring
            </label>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-3 rounded-lg ${testResult.success ? 'bg-green-900/20 border-green-900' : 'bg-red-900/20 border-red-900'} border`}>
              <p className={`text-sm ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                {testResult.success ? `✓ Connected! Found ${testResult.info?.containers || 0} containers` : `✗ ${testResult.error}`}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-900/20 border-red-900 border">
              <p className="text-sm text-red-400">✗ {error}</p>
            </div>
          )}

          <div className="flex space-x-2 pt-4">
            <button
              type="button"
              onClick={testConnection}
              disabled={testing || (formData.type !== 'socket' && (!formData.host || !formData.port))}
              className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              type="submit"
              disabled={!testResult?.success || adding || !formData.name}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors text-white font-medium"
            >
              {adding ? 'Adding...' : 'Add Host'}
            </button>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-full text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddDockerHostModal;