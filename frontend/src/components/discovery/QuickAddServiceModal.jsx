import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

const QuickAddServiceModal = ({ isOpen, onClose, service, onServiceAdded }) => {
  const [formData, setFormData] = useState({
    name: service?.serviceName || service?.service || '',
    type: service?.service || '',
    host: service?.hostname || service?.ip || '',
    port: service?.port || '',
    ssl: service?.ssl || false,
    apiKey: '',
    enabled: true
  });
  
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [adding, setAdding] = useState(false);
  
  // Update form data when service changes
  React.useEffect(() => {
    if (service) {
      setFormData({
        name: service.serviceName || service.service || '',
        type: service.service || '',
        host: service.hostname || service.ip || '',
        port: service.port || '',
        ssl: service.ssl || false,
        apiKey: '',
        enabled: true
      });
    }
  }, [service]);
  
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, this would test the actual service
      setTestResult({
        success: true,
        message: 'Connection successful! Service is responding.'
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Connection failed. Please check your settings.'
      });
    } finally {
      setTesting(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setAdding(true);
    
    try {
      // In a real implementation, this would call the add service API
      const serviceData = {
        ...service,
        ...formData,
        discoveryInfo: {
          confidence: service?.confidence,
          detectionMethod: service?.detectionMethod,
          discoveredNetwork: service?.discoveredNetwork,
          discoveredAt: service?.discoveredAt
        }
      };
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onServiceAdded(serviceData);
      onClose();
    } catch (error) {
      console.error('Failed to add service:', error);
    } finally {
      setAdding(false);
    }
  };
  
  const getApiKeyInstructions = (serviceType) => {
    const instructions = {
      radarr: 'Settings → General → Security → API Key',
      sonarr: 'Settings → General → Security → API Key', 
      lidarr: 'Settings → General → Security → API Key',
      readarr: 'Settings → General → Security → API Key',
      bazarr: 'Settings → General → Security → API Key',
      prowlarr: 'Settings → General → Security → API Key',
      plex: 'Settings → Network → Show Advanced → Plex Media Server token',
      unraid: 'Settings → User Preferences → API Keys → Create new key'
    };
    
    return instructions[serviceType] || 'Check service documentation for API key location';
  };
  
  if (!service) return null;
  
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-75" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-900 border border-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-800/50 p-2 flex items-center justify-center">
                      <img 
                        src={`/logos/${service.service}.svg`} 
                        alt={service.service}
                        className="w-full h-full object-contain"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-white">
                        Quick Add Service
                      </Dialog.Title>
                      <p className="text-sm text-gray-400">
                        {service.serviceName} • {service.confidence}% confidence
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                
                {/* Detection Info */}
                <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-3 mb-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-green-300">Auto-detected Service</span>
                  </div>
                  <div className="text-xs text-green-400/70 space-y-1">
                    <div>Network: {service.discoveredNetwork}</div>
                    <div>Method: {service.detectionMethod}</div>
                    {service.version && <div>Version: {service.version}</div>}
                  </div>
                </div>
                
                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Service Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Service Type
                      </label>
                      <input
                        type="text"
                        value={formData.type}
                        readOnly
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-gray-300 rounded-md cursor-not-allowed"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Host
                      </label>
                      <input
                        type="text"
                        value={formData.host}
                        onChange={(e) => handleInputChange('host', e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Port
                      </label>
                      <input
                        type="number"
                        value={formData.port}
                        onChange={(e) => handleInputChange('port', e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      API Key *
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={formData.apiKey}
                        onChange={(e) => handleInputChange('apiKey', e.target.value)}
                        required
                        placeholder="Required for service integration"
                        className="w-full px-3 py-2 pr-10 bg-gray-800 border border-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                      >
                        {showApiKey ? (
                          <EyeSlashIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {getApiKeyInstructions(formData.type)}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.ssl}
                        onChange={(e) => handleInputChange('ssl', e.target.checked)}
                        className="rounded bg-gray-700 border-gray-600 text-green-600 focus:ring-green-500"
                      />
                      <span className="ml-2 text-sm text-gray-300">Use HTTPS</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.enabled}
                        onChange={(e) => handleInputChange('enabled', e.target.checked)}
                        className="rounded bg-gray-700 border-gray-600 text-green-600 focus:ring-green-500"
                      />
                      <span className="ml-2 text-sm text-gray-300">Enable service</span>
                    </label>
                  </div>
                  
                  {/* Test Connection */}
                  {formData.apiKey && (
                    <div className="border-t border-gray-800 pt-4">
                      <button
                        type="button"
                        onClick={testConnection}
                        disabled={testing}
                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center"
                      >
                        {testing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Testing Connection...
                          </>
                        ) : (
                          'Test Connection'
                        )}
                      </button>
                      
                      {testResult && (
                        <div className={`mt-3 p-3 rounded-lg flex items-center ${
                          testResult.success 
                            ? 'bg-green-900/20 border border-green-600/30' 
                            : 'bg-red-900/20 border border-red-500/50'
                        }`}>
                          {testResult.success ? (
                            <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2" />
                          ) : (
                            <ExclamationTriangleIcon className="w-4 h-4 text-red-400 mr-2" />
                          )}
                          <span className={`text-sm ${
                            testResult.success ? 'text-green-300' : 'text-red-300'
                          }`}>
                            {testResult.message}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Footer */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={adding || !formData.apiKey}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center"
                    >
                      {adding ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Adding Service...
                        </>
                      ) : (
                        'Add Service'
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default QuickAddServiceModal;