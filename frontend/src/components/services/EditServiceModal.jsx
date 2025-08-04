import React, { useState, useEffect } from 'react';

const EditServiceModal = ({ isOpen, onClose, service, onServiceUpdated }) => {
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: '',
    apiKey: '',
    enabled: true
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState(null);

  // Load service data when modal opens
  useEffect(() => {
    if (service && isOpen) {
      setFormData({
        name: service.name || '',
        host: service.host || '',
        port: service.port || '',
        apiKey: '', // Don't pre-fill API key for security
        enabled: service.enabled !== false
      });
      setTestResult(null);
      setError(null);
    }
  }, [service, isOpen]);

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/services/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: service.type,
          host: formData.host,
          port: parseInt(formData.port),
          apiKey: formData.apiKey || service.apiKey // Use new key if provided, otherwise existing
        })
      });
      
      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      // Only send fields that have been modified
      const updates = {};
      if (formData.name !== service.name) updates.name = formData.name;
      if (formData.host !== service.host) updates.host = formData.host;
      if (formData.port !== service.port) updates.port = parseInt(formData.port);
      if (formData.apiKey) updates.apiKey = formData.apiKey; // Only update if new key provided
      if (formData.enabled !== service.enabled) updates.enabled = formData.enabled;

      const response = await fetch(`http://localhost:5000/api/services/${service.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      const result = await response.json();
      
      if (result.success) {
        onServiceUpdated();
        onClose();
      } else {
        setError(result.error || 'Failed to update service');
      }
    } catch (error) {
      console.error('Failed to update service:', error);
      setError('Failed to connect to backend');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      host: '',
      port: '',
      apiKey: '',
      enabled: true
    });
    setTestResult(null);
    setError(null);
    onClose();
  };

  if (!isOpen || !service) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-800">
        <h2 className="text-xl font-semibold mb-4 text-green-400">
          Edit {service.name}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Service Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-green-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Service Type</label>
            <input
              type="text"
              value={service.type}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-gray-400 cursor-not-allowed"
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">Service type cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Host</label>
            <input
              type="text"
              value={formData.host}
              onChange={(e) => setFormData({...formData, host: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-green-500 focus:outline-none"
              placeholder="e.g., 192.168.100.4"
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
            <label className="block text-sm text-gray-400 mb-1">API Key (leave blank to keep current)</label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-green-500 focus:outline-none"
              placeholder="Enter new API key or leave blank"
            />
            <p className="text-xs text-gray-500 mt-1">Only enter if you want to change the API key</p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({...formData, enabled: e.target.checked})}
              className="w-4 h-4 bg-gray-800 border-gray-600 rounded focus:ring-green-500 focus:ring-2"
            />
            <label htmlFor="enabled" className="text-sm text-gray-400">
              Service enabled
            </label>
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
              disabled={saving || !formData.name}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg transition-colors text-white font-medium"
            >
              {saving ? 'Saving...' : 'Save Changes'}
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

export default EditServiceModal;
