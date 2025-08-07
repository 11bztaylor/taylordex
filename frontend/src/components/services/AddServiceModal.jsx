import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const AddServiceModal = ({ isOpen, onClose, onServiceAdded }) => {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    type: 'radarr',
    host: '',
    port: '',
    apiKey: ''
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);

  const serviceTypes = [
    { value: 'radarr', label: 'Radarr', defaultPort: 7878, icon: '/logos/radarr.svg' },
    { value: 'sonarr', label: 'Sonarr', defaultPort: 8989, icon: '/logos/sonarr.svg' },
    { value: 'bazarr', label: 'Bazarr', defaultPort: 6767, icon: '/logos/bazarr.svg' },
    { value: 'lidarr', label: 'Lidarr', defaultPort: 8686, icon: '/logos/lidarr.svg' },
    { value: 'readarr', label: 'Readarr', defaultPort: 8787, icon: '/logos/readarr.svg' },
    { value: 'prowlarr', label: 'Prowlarr', defaultPort: 9696, icon: '/logos/prowlarr.svg' },
    { value: 'plex', label: 'Plex', defaultPort: 32400, icon: '/logos/plex.svg' },
    { value: 'homeassistant', label: 'Home Assistant', defaultPort: 8123, icon: '/logos/homeassistant.svg' },
    { value: 'unraid', label: 'Unraid Server', defaultPort: 443, icon: '/logos/unraid.svg' }
  ];

  const handleTypeChange = (type) => {
    const service = serviceTypes.find(s => s.value === type);
    setFormData({
      ...formData,
      type,
      port: service?.defaultPort || ''
    });
  };

  const testConnection = async () => {
    console.log('🧪 AddServiceModal - Starting connection test with data:', formData);
    setTesting(true);
    setTestResult(null);
    setError(null);
    
    try {
      const testData = {
        type: formData.type,
        host: formData.host,
        port: parseInt(formData.port),
        apiKey: formData.apiKey
      };
      console.log('🧪 AddServiceModal - Sending test request:', testData);
      
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('http://localhost:5000/api/services/test', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(testData)
      });
      
      console.log('🧪 AddServiceModal - Test response status:', response.status);
      const result = await response.json();
      console.log('🧪 AddServiceModal - Test result:', result);
      setTestResult(result);
    } catch (error) {
      console.error('🧪 AddServiceModal - Test connection error:', error);
      setTestResult({ success: false, error: error.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('💾 AddServiceModal - Starting service creation with data:', formData);
    setSaving(true);
    setError(null);
    
    try {
      const serviceData = {
        name: formData.name,
        type: formData.type,
        host: formData.host,
        port: parseInt(formData.port),
        apiKey: formData.apiKey
      };
      console.log('💾 AddServiceModal - Sending create request:', serviceData);
      
      const createHeaders = { 'Content-Type': 'application/json' };
      if (token) {
        createHeaders['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('http://localhost:5000/api/services', {
        method: 'POST',
        headers: createHeaders,
        body: JSON.stringify(serviceData)
      });
      
      console.log('💾 AddServiceModal - Create response status:', response.status);
      const result = await response.json();
      console.log('💾 AddServiceModal - Create result:', result);
      
      if (result.success) {
        console.log('✅ AddServiceModal - Service created successfully:', result.service);
        onServiceAdded();
        onClose();
        setFormData({
          name: '',
          type: 'radarr',
          host: '',
          port: '7878',
          apiKey: ''
        });
        setTestResult(null);
      } else {
        console.error('❌ AddServiceModal - Service creation failed:', result.error);
        setError(result.error || 'Failed to add service');
      }
    } catch (error) {
      console.error('❌ AddServiceModal - Service creation error:', {
        error: error.message,
        stack: error.stack
      });
      setError('Failed to connect to backend');
    } finally {
      setSaving(false);
      console.log('🏁 AddServiceModal - Service creation completed');
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      type: 'radarr',
      host: '',
      port: '7878',
      apiKey: ''
    });
    setTestResult(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const selectedService = serviceTypes.find(s => s.value === formData.type);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-800">
        <h2 className="text-xl font-semibold mb-4 text-green-400">Add New Service</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Service Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-green-500 focus:outline-none"
              placeholder="e.g., Radarr - Movies"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Service Type</label>
            <div className="relative">
              <select
                value={formData.type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-green-500 focus:outline-none appearance-none pr-10"
              >
                {serviceTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {selectedService?.icon && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 w-6 h-6 pointer-events-none">
                  <img 
                    src={selectedService.icon} 
                    alt={selectedService.label}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Host</label>
            <input
              type="text"
              value={formData.host}
              onChange={(e) => setFormData({...formData, host: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-green-500 focus:outline-none"
              placeholder="e.g., 192.168.100.4 or hostname"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Port</label>
            <input
              type="number"
              value={formData.port}
              onChange={(e) => setFormData({...formData, port: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-green-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">API Key</label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-green-500 focus:outline-none"
              placeholder={formData.type === 'unraid' ? 'Unraid GraphQL API key' : 'Your service API key'}
              required={formData.type === 'unraid'}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.type === 'unraid' 
                ? 'Unraid GraphQL API key required. Enable API access in Unraid settings.' 
                : 'API keys are stored securely and never exposed'
              }
            </p>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-3 rounded-lg ${testResult.success ? 'bg-green-900/20 border-green-900' : 'bg-red-900/20 border-red-900'} border`}>
              <p className={`text-sm ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                {testResult.success ? `✓ Connected! Version: ${testResult.version}` : `✗ ${testResult.error}`}
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
              disabled={testing || !formData.host || !formData.port}
              className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              type="submit"
              disabled={!testResult?.success || saving || !formData.name}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors text-white font-medium"
            >
              {saving ? 'Saving...' : 'Add Service'}
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

export default AddServiceModal;
