import React, { useState, useEffect } from 'react';
import { Dialog, Transition, RadioGroup } from '@headlessui/react';
import { Fragment } from 'react';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  WifiIcon,
  ServerIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import QuickAddServiceModal from './QuickAddServiceModal';
import { useAuth } from '../../contexts/AuthContext';

const NetworkDiscoveryModal = ({ isOpen, onClose, onServicesFound }) => {
  const { token } = useAuth();
  const [step, setStep] = useState('configure'); // configure, scanning, results, setup
  const [scanType, setScanType] = useState('auto');
  const [networkInput, setNetworkInput] = useState('');
  const [rangeStart, setRangeStart] = useState('192.168.1.1');
  const [rangeEnd, setRangeEnd] = useState('192.168.1.50');
  
  // Multi-network scanning
  const [networkQueue, setNetworkQueue] = useState([]);
  const [currentNetworkIndex, setCurrentNetworkIndex] = useState(0);
  const [allDiscoveredServices, setAllDiscoveredServices] = useState([]);
  const [scanHistory, setScanHistory] = useState([]);
  
  // Scan options
  const [scanOptions, setScanOptions] = useState({
    timeout: 3000,
    includeNonStandard: false,
    deepDetection: true
  });
  
  // Scan state
  const [currentScan, setCurrentScan] = useState(null);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [discoveredServices, setDiscoveredServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState(new Set());
  const [discoveryLog, setDiscoveryLog] = useState([]);
  const [error, setError] = useState(null);
  
  // Results filtering and display
  const [confidenceFilter, setConfidenceFilter] = useState(70); // Minimum confidence
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddService, setQuickAddService] = useState(null);
  
  // Configuration step state
  const [servicesToConfigure, setServicesToConfigure] = useState([]);
  const [serviceConfigs, setServiceConfigs] = useState({});
  const [serviceTestResults, setServiceTestResults] = useState({});
  const [testingServices, setTestingServices] = useState(new Set());
  const [addingServices, setAddingServices] = useState(new Set());
  const [addedServices, setAddedServices] = useState(new Set());
  const [processedServices, setProcessedServices] = useState(new Set());
  const [successfullyAdded, setSuccessfullyAdded] = useState([]);
  
  // Scan type options
  const scanTypes = [
    {
      id: 'auto',
      name: 'Auto-detect Network',
      description: 'Automatically detect and scan your local network'
    },
    {
      id: 'cidr',
      name: 'CIDR Notation',
      description: 'Specify network using CIDR (e.g., 192.168.1.0/24)'
    },
    {
      id: 'range',
      name: 'IP Range',
      description: 'Specify start and end IP addresses'
    },
    {
      id: 'single',
      name: 'Single Host',
      description: 'Scan a specific IP address'
    }
  ];
  
  // Reset modal state when opening
  useEffect(() => {
    if (isOpen) {
      setStep('configure');
      setError(null);
      // Don't reset discovered services - keep them persistent
      setSelectedServices(new Set());
      setCurrentScan(null);
      setCurrentNetworkIndex(0);
      
      // Reset setup-related state
      setProcessedServices(new Set());
      setSuccessfullyAdded([]);
      setServiceTestResults({});
      setAddedServices(new Set());
      setAddingServices(new Set());
      setTestingServices(new Set());
      
      // Load saved results from localStorage
      const savedResults = localStorage.getItem('taylordx-discovery-results');
      if (savedResults) {
        try {
          const parsed = JSON.parse(savedResults);
          setAllDiscoveredServices(parsed.services || []);
          setScanHistory(parsed.history || []);
          setDiscoveredServices(parsed.services || []);
        } catch (error) {
          console.error('Failed to load saved discovery results:', error);
        }
      }
    }
  }, [isOpen]);
  
  // Save results to localStorage whenever they change
  useEffect(() => {
    const results = {
      services: allDiscoveredServices,
      history: scanHistory,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('taylordx-discovery-results', JSON.stringify(results));
  }, [allDiscoveredServices, scanHistory]);
  
  // Poll scan progress
  useEffect(() => {
    let interval;
    
    if (currentScan && step === 'scanning') {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`http://localhost:5000/api/discovery/scan/${currentScan.scanId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await response.json();
          
          if (data.success) {
            setScanProgress(data.scan.progress);
            setDiscoveryLog(data.scan.discoveryLog || []);
            
            if (data.scan.status === 'completed') {
              const newServices = data.scan.results || [];
              
              // Add to all discovered services with network info
              const servicesWithNetwork = newServices.map(service => ({
                ...service,
                discoveredNetwork: networkQueue[currentNetworkIndex] || 'Unknown',
                discoveredAt: new Date().toISOString()
              }));
              
              setAllDiscoveredServices(prev => {
                const updated = [...prev, ...servicesWithNetwork];
                // Check if more networks to scan
                if (currentNetworkIndex < networkQueue.length - 1) {
                  // More networks to scan, don't update discoveredServices yet
                } else {
                  // All networks scanned, update discoveredServices
                  setDiscoveredServices(updated);
                }
                return updated;
              });
              
              // Add to scan history
              setScanHistory(prev => [...prev, {
                network: networkQueue[currentNetworkIndex] || 'Unknown',
                timestamp: new Date().toISOString(),
                servicesFound: newServices.length,
                scanId: currentScan.scanId
              }]);
              
              // Check if more networks to scan
              if (currentNetworkIndex < networkQueue.length - 1) {
                setCurrentNetworkIndex(prev => prev + 1);
                // Start next network scan
                startNextNetworkScan();
              } else {
                // All networks scanned
                setStep('results');
                clearInterval(interval);
              }
            } else if (data.scan.status === 'failed') {
              setError(data.scan.error || 'Scan failed');
              setStep('configure');
              clearInterval(interval);
            }
          }
        } catch (error) {
          console.error('Failed to get scan progress:', error);
          setError('Failed to get scan progress');
          setStep('configure');
          clearInterval(interval);
        }
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentScan, step]);
  
  const addNetworkToQueue = () => {
    try {
      setError(null);
      
      // Build network range string
      let range;
      switch (scanType) {
        case 'auto':
          range = 'auto';
          break;
        case 'cidr':
          range = networkInput;
          break;
        case 'range':
          range = `${rangeStart}-${rangeEnd}`;
          break;
        case 'single':
          range = networkInput;
          break;
        default:
          throw new Error('Invalid scan type');
      }
      
      if (!range || (scanType !== 'auto' && !networkInput && scanType !== 'range')) {
        setError('Please specify a network range');
        return;
      }
      
      // Add to network queue
      setNetworkQueue(prev => [...prev, range]);
      
      // Clear inputs for next network
      setNetworkInput('');
      setRangeStart('192.168.1.1');
      setRangeEnd('192.168.1.50');
      setScanType('auto');
      
    } catch (error) {
      setError(error.message);
    }
  };
  
  const removeNetworkFromQueue = (index) => {
    setNetworkQueue(prev => prev.filter((_, i) => i !== index));
  };
  
  const startAllScans = async () => {
    if (networkQueue.length === 0) {
      setError('Please add at least one network to scan');
      return;
    }
    
    setCurrentNetworkIndex(0);
    setStep('scanning');
    setDiscoveryLog([]); // Clear previous discovery logs
    await startNetworkScan(networkQueue[0]);
  };
  
  const startNetworkScan = async (range) => {
    try {
      // Check if backend is available
      const backendAvailable = await fetch('http://localhost:5000/api/health').then(r => r.ok).catch(() => false);
      
      if (!backendAvailable) {
        // Demo mode - simulate network scanning
        console.log('Backend not available, running in demo mode');
        return await startDemoScan(range);
      }
      
      const response = await fetch('http://localhost:5000/api/discovery/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          range,
          options: scanOptions
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCurrentScan(data.scan);
        setScanProgress({ current: 0, total: data.scan.totalHosts, percentage: 0 });
      } else {
        setError(data.error || 'Failed to start scan');
        setStep('configure');
      }
    } catch (error) {
      console.error('Failed to start scan:', error);
      // Fallback to demo mode
      return await startDemoScan(range);
    }
  };
  
  const startDemoScan = async (range) => {
    console.log(`Backend not available for network discovery. Range: ${range}`);
    setError('Network discovery requires backend connection. Please ensure the backend server is running.');
    setStep('configure');
  };
  
  
  const startNextNetworkScan = async () => {
    const nextNetwork = networkQueue[currentNetworkIndex];
    if (nextNetwork) {
      await startNetworkScan(nextNetwork);
    }
  };
  
  const cancelScan = async () => {
    if (currentScan) {
      try {
        await fetch(`http://localhost:5000/api/discovery/scan/${currentScan.scanId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Failed to cancel scan:', error);
      }
    }
    
    setStep('configure');
    setCurrentScan(null);
  };
  
  const toggleServiceSelection = (serviceId) => {
    const newSelected = new Set(selectedServices);
    if (newSelected.has(serviceId)) {
      newSelected.delete(serviceId);
    } else {
      newSelected.add(serviceId);
    }
    setSelectedServices(newSelected);
  };
  
  const addSelectedServices = () => {
    const servicesToAdd = discoveredServices.filter(service => 
      selectedServices.has(service.id)
    );
    
    // Initialize configuration for each selected service
    const initialConfigs = {};
    servicesToAdd.forEach(service => {
      initialConfigs[service.id] = {
        name: service.serviceName || service.service || '',
        type: service.service || '',
        host: service.hostname || service.ip || '',
        port: service.port || '',
        ssl: service.ssl || false,
        apiKey: '',
        enabled: true
      };
    });
    
    setServicesToConfigure(servicesToAdd);
    setServiceConfigs(initialConfigs);
    setStep('setup');
  };
  
  const updateServiceConfig = (serviceId, field, value) => {
    setServiceConfigs(prev => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        [field]: value
      }
    }));
  };
  
  const testService = async (service) => {
    const serviceId = service.id;
    const config = serviceConfigs[serviceId];
    
    if (!config) return;
    
    setTestingServices(prev => new Set([...prev, serviceId]));
    setServiceTestResults(prev => ({ ...prev, [serviceId]: null }));
    
    try {
      // Test connection with real backend API
      const testData = {
        host: config.host,
        port: config.port,
        apiKey: config.apiKey,
        username: config.username,
        password: config.password,
        ssl: config.ssl
      };
      
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`http://localhost:5000/api/${config.type}/test`, {
        method: 'POST',
        headers,
        body: JSON.stringify(testData)
      });
      
      const result = await response.json();
      
      setServiceTestResults(prev => ({
        ...prev,
        [serviceId]: {
          success: result.success,
          message: result.success 
            ? 'Connection successful! Service is responding.' 
            : result.error || 'Test failed. Please check your authentication details.',
          timestamp: new Date().toISOString()
        }
      }));
      
    } catch (error) {
      setServiceTestResults(prev => ({
        ...prev,
        [serviceId]: {
          success: false,
          message: 'Connection failed. Please check your settings and ensure the backend is running.',
          error: error.message,
          timestamp: new Date().toISOString()
        }
      }));
    } finally {
      setTestingServices(prev => {
        const newSet = new Set(prev);
        newSet.delete(serviceId);
        return newSet;
      });
    }
  };

  const addService = async (service) => {
    const serviceId = service.id;
    const config = serviceConfigs[serviceId];
    
    if (!config) return;
    
    setAddingServices(prev => new Set([...prev, serviceId]));
    
    try {
      // Prepare service data for API call
      const serviceData = {
        name: config.name,
        type: config.type,
        host: config.host,
        port: parseInt(config.port),
        apiKey: config.apiKey || undefined,
        username: config.username || undefined,
        password: config.password || undefined,
        ssl: config.ssl || false,
        enabled: config.enabled !== false
      };
      
      console.log('💾 NetworkDiscovery - Adding service:', serviceData);
      
      const createHeaders = { 'Content-Type': 'application/json' };
      if (token) {
        createHeaders['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('http://localhost:5000/api/services', {
        method: 'POST',
        headers: createHeaders,
        body: JSON.stringify(serviceData)
      });
      
      console.log('💾 NetworkDiscovery - Create response status:', response.status);
      const result = await response.json();
      console.log('💾 NetworkDiscovery - Create result:', result);
      
      if (result.success) {
        console.log('✅ NetworkDiscovery - Service created successfully:', result.service);
        
        // Mark as successfully added
        setAddedServices(prev => new Set([...prev, serviceId]));
        setSuccessfullyAdded(prev => [...prev, result.service]);
        
        // Update test results to show success
        setServiceTestResults(prev => ({
          ...prev,
          [serviceId]: {
            success: true,
            message: 'Service added successfully!',
            timestamp: new Date().toISOString()
          }
        }));
        
        // Immediately trigger refresh for this service
        console.log('🔄 NetworkDiscovery - Triggering immediate refresh for successful service');
        onServicesFound([result.service]);
        
      } else {
        console.error('❌ NetworkDiscovery - Service creation failed:', result.error);
        // Set error result for this service
        setServiceTestResults(prev => ({
          ...prev,
          [serviceId]: {
            success: false,
            message: result.error || 'Failed to add service to database',
            timestamp: new Date().toISOString()
          }
        }));
      }
      
    } catch (error) {
      console.error('❌ NetworkDiscovery - Service creation error:', {
        error: error.message,
        stack: error.stack
      });
      
      // Set error result for this service
      setServiceTestResults(prev => ({
        ...prev,
        [serviceId]: {
          success: false,
          message: 'Failed to connect to backend',
          timestamp: new Date().toISOString()
        }
      }));
      
    } finally {
      setAddingServices(prev => {
        const newSet = new Set(prev);
        newSet.delete(serviceId);
        return newSet;
      });
      
      // Mark service as processed (success or failure)
      setProcessedServices(prev => {
        const newProcessed = new Set([...prev, serviceId]);
        
        // Log completion when all services are processed  
        if (newProcessed.size === servicesToConfigure.length) {
          console.log(`✅ NetworkDiscovery - All ${servicesToConfigure.length} services processed`);
        }
        
        return newProcessed;
      });
      console.log('🏁 NetworkDiscovery - Service creation completed');
    }
  };

  const allServicesProcessed = () => {
    return servicesToConfigure.every(service => 
      processedServices.has(service.id)
    );
  };
  
  const getProcessingSummary = () => {
    const total = servicesToConfigure.length;
    const processed = processedServices.size;
    const successful = addedServices.size;
    const failed = processed - successful;
    
    return { total, processed, successful, failed };
  };

  const clearAllResults = () => {
    setAllDiscoveredServices([]);
    setDiscoveredServices([]);
    setScanHistory([]);
    setSelectedServices(new Set());
    localStorage.removeItem('taylordx-discovery-results');
  };
  
  // Helper functions for discovery log styling
  const getLogEntryStyle = (type) => {
    switch (type) {
      case 'service_detected':
        return 'bg-green-900/20 border-l-2 border-green-500';
      case 'ports_found':
        return 'bg-blue-900/20 border-l-2 border-blue-500';
      case 'host_scan':
        return 'bg-gray-800/30';
      case 'external_load':
        return 'bg-purple-900/20 border-l-2 border-purple-500';
      case 'scan_start':
        return 'bg-yellow-900/20 border-l-2 border-yellow-500';
      default:
        return 'bg-gray-800/20';
    }
  };
  
  const getLogDotColor = (type) => {
    switch (type) {
      case 'service_detected':
        return 'bg-green-400';
      case 'ports_found':
        return 'bg-blue-400';
      case 'host_scan':
        return 'bg-gray-400';
      case 'external_load':
        return 'bg-purple-400';
      case 'scan_start':
        return 'bg-yellow-400';
      default:
        return 'bg-gray-400';
    }
  };
  
  const openQuickAdd = (service) => {
    setQuickAddService(service);
    setShowQuickAdd(true);
  };
  
  const handleQuickAdd = async (serviceData) => {
    try {
      console.log('Quick adding service:', serviceData);
      
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('http://localhost:5000/api/services', {
        method: 'POST',
        headers,
        body: JSON.stringify(serviceData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Quick add successful:', result.service);
        onServicesFound([result.service]);
      } else {
        console.error('❌ Quick add failed:', result.error);
        setError(result.error || 'Failed to add service');
      }
      
      setShowQuickAdd(false);
      setQuickAddService(null);
    } catch (error) {
      console.error('Failed to quick add service:', error);
      setError('Failed to connect to backend for service addition');
    }
  };
  
  // Filter services based on confidence and type
  const filteredDiscoveredServices = discoveredServices.filter(service => {
    const meetsConfidence = service.confidence >= confidenceFilter;
    const meetsType = serviceTypeFilter === 'all' || service.service === serviceTypeFilter;
    return meetsConfidence && meetsType;
  });
  
  // Get unique service types for filtering
  const availableServiceTypes = [...new Set(discoveredServices.map(s => s.service))].sort();
  
  // Get high confidence services (80%+)
  const highConfidenceServices = discoveredServices.filter(s => s.confidence >= 80);

  const getApiKeyInstructions = (serviceType) => {
    const instructions = {
      radarr: 'Settings → General → Security → API Key',
      sonarr: 'Settings → General → Security → API Key', 
      lidarr: 'Settings → General → Security → API Key',
      readarr: 'Settings → General → Security → API Key',
      bazarr: 'Settings → General → Security → API Key',
      prowlarr: 'Settings → General → Security → API Key',
      plex: 'Settings → Network → Show Advanced → Plex Media Server token',
      unraid: 'Settings → User Preferences → API Keys → Create new key',
      qbittorrent: 'Username and password from Web UI settings'
    };
    
    return instructions[serviceType] || 'Check service documentation for authentication details';
  };

  const renderSetupStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Configure Selected Services</h3>
        <p className="text-gray-400">
          Enter authentication details for {servicesToConfigure.length} selected service{servicesToConfigure.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-6">
        {servicesToConfigure.map((service, index) => {
          const config = serviceConfigs[service.id] || {};
          
          return (
            <div key={service.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              {/* Service Header */}
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gray-700/50 p-2 flex items-center justify-center">
                  <img 
                    src={`/logos/${service.service}.svg`} 
                    alt={service.service}
                    className="w-full h-full object-contain"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
                <div>
                  <h4 className="font-medium text-white">{service.serviceName}</h4>
                  <p className="text-sm text-gray-400">{service.ip}:{service.port} • {service.confidence}% confidence</p>
                </div>
              </div>

              {/* Configuration Form */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Service Name</label>
                  <input
                    type="text"
                    value={config.name || ''}
                    onChange={(e) => updateServiceConfig(service.id, 'name', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Port</label>
                  <input
                    type="number"
                    value={config.port || ''}
                    onChange={(e) => updateServiceConfig(service.id, 'port', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* API Key / Authentication */}
              {['radarr', 'sonarr', 'lidarr', 'readarr', 'bazarr', 'prowlarr'].includes(service.service) && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    API Key *
                  </label>
                  <input
                    type="password"
                    value={config.apiKey || ''}
                    onChange={(e) => updateServiceConfig(service.id, 'apiKey', e.target.value)}
                    placeholder="Required for service integration"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {getApiKeyInstructions(service.service)}
                  </p>
                </div>
              )}

              {/* Username/Password for services like qBittorrent */}
              {['qbittorrent'].includes(service.service) && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                    <input
                      type="text"
                      value={config.username || ''}
                      onChange={(e) => updateServiceConfig(service.id, 'username', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                    <input
                      type="password"
                      value={config.password || ''}
                      onChange={(e) => updateServiceConfig(service.id, 'password', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              )}

              {/* Options */}
              <div className="flex items-center space-x-4 mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.ssl || false}
                    onChange={(e) => updateServiceConfig(service.id, 'ssl', e.target.checked)}
                    className="rounded bg-gray-700 border-gray-600 text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-300">Use HTTPS</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={config.enabled !== false}
                    onChange={(e) => updateServiceConfig(service.id, 'enabled', e.target.checked)}
                    className="rounded bg-gray-700 border-gray-600 text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-300">Enable service</span>
                </label>
              </div>

              {/* Test Results Display */}
              {serviceTestResults[service.id] && (
                <div className={`mt-4 p-3 rounded-lg flex items-center ${
                  serviceTestResults[service.id].success 
                    ? 'bg-green-900/20 border border-green-600/30' 
                    : 'bg-red-900/20 border border-red-500/50'
                }`}>
                  {serviceTestResults[service.id].success ? (
                    <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2 flex-shrink-0" />
                  ) : (
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-400 mr-2 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <span className={`text-sm ${
                      serviceTestResults[service.id].success ? 'text-green-300' : 'text-red-300'
                    }`}>
                      {serviceTestResults[service.id].message}
                    </span>
                    {serviceTestResults[service.id].timestamp && (
                      <div className="text-xs text-gray-500 mt-1">
                        Tested: {new Date(serviceTestResults[service.id].timestamp).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 mt-4 pt-4 border-t border-gray-700">
                {addedServices.has(service.id) ? (
                  <div className="flex items-center space-x-2 text-green-400">
                    <CheckCircleIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Added Successfully</span>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => testService(service)}
                      disabled={testingServices.has(service.id)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center text-sm"
                    >
                      {testingServices.has(service.id) ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Testing...
                        </>
                      ) : (
                        'Test Connection'
                      )}
                    </button>
                    
                    <button
                      onClick={() => addService(service)}
                      disabled={
                        addingServices.has(service.id) || 
                        !serviceTestResults[service.id]?.success ||
                        (!config.apiKey && !config.username && service.service !== 'unknown')
                      }
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center text-sm"
                    >
                      {addingServices.has(service.id) ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Adding...
                        </>
                      ) : (
                        'Add Service'
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
  
  const renderConfigureStep = () => (
    <div className="space-y-6">
      {/* Network Range Selection */}
      <div>
        <label className="text-base font-medium text-white">Network Range</label>
        <p className="text-sm text-gray-400 mb-4">Choose how to specify the network to scan</p>
        
        <RadioGroup value={scanType} onChange={setScanType}>
          <div className="space-y-3">
            {scanTypes.map((type) => (
              <RadioGroup.Option
                key={type.id}
                value={type.id}
                className={({ checked }) =>
                  `${checked ? 'bg-green-600/20 border-green-500 ring-2 ring-green-500' : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'}
                   relative flex cursor-pointer rounded-lg px-4 py-3 border focus:outline-none transition-all`
                }
              >
                {({ checked }) => (
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {/* Radio button indicator */}
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        checked ? 'border-green-500 bg-green-500' : 'border-gray-500'
                      }`}>
                        {checked && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                      
                      <div className="text-sm">
                        <RadioGroup.Label
                          as="p"
                          className={`font-medium ${checked ? 'text-white' : 'text-gray-300'}`}
                        >
                          {type.name}
                        </RadioGroup.Label>
                        <RadioGroup.Description
                          as="span"
                          className={`inline ${checked ? 'text-green-100' : 'text-gray-500'}`}
                        >
                          {type.description}
                        </RadioGroup.Description>
                      </div>
                    </div>
                    
                    {checked && (
                      <div className="shrink-0 text-green-500">
                        <CheckCircleIcon className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                )}
              </RadioGroup.Option>
            ))}
          </div>
        </RadioGroup>
      </div>
      
      {/* Network Input Fields */}
      {scanType !== 'auto' && (
        <div className="space-y-4">
          {scanType === 'cidr' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                CIDR Notation
              </label>
              <input
                type="text"
                value={networkInput}
                onChange={(e) => setNetworkInput(e.target.value)}
                placeholder="192.168.1.0/24"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          )}
          
          {scanType === 'range' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start IP
                </label>
                <input
                  type="text"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  placeholder="192.168.1.1"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End IP
                </label>
                <input
                  type="text"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  placeholder="192.168.1.50"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          )}
          
          {scanType === 'single' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                IP Address
              </label>
              <input
                type="text"
                value={networkInput}
                onChange={(e) => setNetworkInput(e.target.value)}
                placeholder="192.168.1.10"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          )}
        </div>
      )}
      
      {/* Advanced Options */}
      <details className="bg-gray-800/30 rounded-lg">
        <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-300 hover:text-white">
          Advanced Options
        </summary>
        <div className="px-4 pb-4 space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Timeout (milliseconds)
            </label>
            <select
              value={scanOptions.timeout}
              onChange={(e) => setScanOptions({...scanOptions, timeout: parseInt(e.target.value)})}
              className="w-full px-3 py-1 bg-gray-700 border border-gray-600 text-white rounded text-sm"
            >
              <option value="2000">2 seconds</option>
              <option value="3000">3 seconds</option>
              <option value="5000">5 seconds</option>
              <option value="10000">10 seconds</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={scanOptions.includeNonStandard}
                onChange={(e) => setScanOptions({...scanOptions, includeNonStandard: e.target.checked})}
                className="rounded bg-gray-700 border-gray-600 text-green-600 focus:ring-green-500"
              />
              <span className="ml-2 text-sm text-gray-300">Include non-standard ports</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={scanOptions.deepDetection}
                onChange={(e) => setScanOptions({...scanOptions, deepDetection: e.target.checked})}
                className="rounded bg-gray-700 border-gray-600 text-green-600 focus:ring-green-500"
              />
              <span className="ml-2 text-sm text-gray-300">Deep service detection</span>
            </label>
          </div>
        </div>
      </details>
      
      {/* Network Queue */}
      {networkQueue.length > 0 && (
        <div className="bg-gray-800/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white">Networks to Scan ({networkQueue.length})</h4>
            <button
              onClick={() => setNetworkQueue([])}
              className="text-xs text-gray-400 hover:text-red-400 transition-colors"
            >
              Clear All
            </button>
          </div>
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {networkQueue.map((network, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-700/50 rounded px-3 py-2">
                <span className="text-sm text-gray-300 font-mono">{network}</span>
                <button
                  onClick={() => removeNetworkFromQueue(index)}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Scan History */}
      {scanHistory.length > 0 && (
        <div className="bg-gray-800/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white">Previous Scans ({scanHistory.length})</h4>
            <div className="text-xs text-gray-400">
              {allDiscoveredServices.length} services found
            </div>
          </div>
          
          <div className="space-y-2 max-h-24 overflow-y-auto">
            {scanHistory.slice(-3).map((scan, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-mono">{scan.network}</span>
                <span className="text-gray-500">
                  {scan.servicesFound} services • {new Date(scan.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 flex items-center">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mr-2" />
          <span className="text-red-300 text-sm">{error}</span>
        </div>
      )}
    </div>
  );
  
  const renderScanningStep = () => (
    <div className="space-y-6">
      {/* Scanning Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin"></div>
            <MagnifyingGlassIcon className="w-8 h-8 text-green-400 absolute inset-0 m-auto" />
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Scanning Networks...</h3>
          <p className="text-gray-400">
            Network {currentNetworkIndex + 1} of {networkQueue.length}: {networkQueue[currentNetworkIndex]}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Checking {scanProgress.total} hosts for services
          </p>
        </div>
      </div>
      
      {/* Live Discovery Log */}
      {discoveryLog.length > 0 && (
        <div className="bg-gray-900 rounded-lg border border-gray-800">
          <div className="px-4 py-3 border-b border-gray-800">
            <h4 className="text-sm font-medium text-white flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
              Live Discovery Activity
            </h4>
          </div>
          <div className="max-h-64 overflow-y-auto p-4 space-y-2">
            {discoveryLog
              .filter(log => ['external_load', 'ports_found', 'service_detected', 'scan_start'].includes(log.type))
              .slice(-6)
              .map((log, index) => (
              <div 
                key={`${log.timestamp}-${index}`}
                className={`flex items-start space-x-3 text-sm p-2 rounded ${getLogEntryStyle(log.type)}`}
              >
                <span className="text-gray-500 text-xs w-16 flex-shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString().slice(-8)}
                </span>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${getLogDotColor(log.type)}`}></span>
                <span className="flex-1 text-gray-200">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Overall Progress */}
      {networkQueue.length > 1 && (
        <div className="space-y-2">
          <div className="text-sm text-gray-400">Overall Progress</div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentNetworkIndex) / networkQueue.length) * 100}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500">
            {currentNetworkIndex} of {networkQueue.length} networks completed
          </div>
        </div>
      )}
      
      {/* Current Network Progress */}
      <div className="space-y-2">
        <div className="text-sm text-gray-400">Current Network</div>
        <div className="w-full bg-gray-800 rounded-full h-3">
          <div 
            className="bg-green-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${scanProgress.percentage}%` }}
          ></div>
        </div>
        <div className="text-sm text-gray-400">
          {scanProgress.current} of {scanProgress.total} hosts scanned ({scanProgress.percentage}%)
        </div>
      </div>
      
      {scanProgress.currentHost && (
        <div className="text-xs text-gray-500">
          Currently scanning: {scanProgress.currentHost}
        </div>
      )}
      
      {/* Services found so far */}
      {allDiscoveredServices.length > 0 && (
        <div className="bg-gray-800/30 rounded-lg p-3">
          <div className="text-sm text-green-400">
            {allDiscoveredServices.length} services discovered so far
          </div>
        </div>
      )}
    </div>
  );
  
  const renderResultsStep = () => (
    <div className="space-y-4">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Discovery Results ({filteredDiscoveredServices.length})
          </h3>
          <div className="text-sm text-gray-400 mt-1">
            {highConfidenceServices.length} high confidence • {scanHistory.length} networks scanned
          </div>
        </div>
        
        <div className="flex space-x-2">
          {filteredDiscoveredServices.length > 0 && (
            <button
              onClick={() => {
                const allIds = new Set(filteredDiscoveredServices.map(s => s.id));
                setSelectedServices(selectedServices.size === filteredDiscoveredServices.length ? new Set() : allIds);
              }}
              className="text-sm text-green-400 hover:text-green-300"
            >
              {selectedServices.size === filteredDiscoveredServices.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
          
          {allDiscoveredServices.length > 0 && (
            <button
              onClick={clearAllResults}
              className="text-sm text-red-400 hover:text-red-300"
            >
              Clear Results
            </button>
          )}
        </div>
      </div>
      
      {/* High Confidence Quick Add */}
      {highConfidenceServices.length > 0 && (
        <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-semibold text-green-300">High Confidence Detections</h4>
              <p className="text-xs text-green-400/70">Services detected with 80%+ confidence</p>
            </div>
            <button
              onClick={() => {
                const highConfidenceIds = new Set(highConfidenceServices.map(s => s.id));
                onServicesFound(highConfidenceServices);
                onClose();
              }}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
            >
              Quick Add All ({highConfidenceServices.length})
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {highConfidenceServices.slice(0, 6).map(service => (
              <div key={service.id} className="flex items-center justify-between bg-gray-800/50 rounded px-2 py-1">
                <div className="flex items-center space-x-2">
                  <img 
                    src={`/logos/${service.service}.svg`} 
                    alt={service.service}
                    className="w-4 h-4"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                  <span className="text-xs text-white">{service.serviceName}</span>
                </div>
                <button
                  onClick={() => openQuickAdd(service)}
                  className="text-xs text-green-400 hover:text-green-300"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
          
          {highConfidenceServices.length > 6 && (
            <div className="text-xs text-green-400/70 mt-2">
              +{highConfidenceServices.length - 6} more services
            </div>
          )}
        </div>
      )}
      
      {/* Filters */}
      <div className="flex space-x-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Min Confidence</label>
          <select
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(parseInt(e.target.value))}
            className="px-3 py-1 bg-gray-800 border border-gray-700 text-white text-sm rounded"
          >
            <option value="0">All (0%+)</option>
            <option value="50">Medium (50%+)</option>
            <option value="70">Good (70%+)</option>
            <option value="80">High (80%+)</option>
            <option value="90">Very High (90%+)</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs text-gray-400 mb-1">Service Type</label>
          <select
            value={serviceTypeFilter}
            onChange={(e) => setServiceTypeFilter(e.target.value)}
            className="px-3 py-1 bg-gray-800 border border-gray-700 text-white text-sm rounded"
          >
            <option value="all">All Types</option>
            {availableServiceTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {filteredDiscoveredServices.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <ServerIcon className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          {discoveredServices.length === 0 ? (
            <>
              <p>No services were discovered on the scanned networks.</p>
              <p className="text-sm mt-2">Try expanding the network range or enabling non-standard ports.</p>
            </>
          ) : (
            <>
              <p>No services match the current filters.</p>
              <p className="text-sm mt-2">Try adjusting the confidence threshold or service type filter.</p>
            </>
          )}
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto space-y-3">
          {filteredDiscoveredServices.map(service => (
            <div
              key={service.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedServices.has(service.id)
                  ? 'border-green-500 bg-green-900/20'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              }`}
              onClick={() => toggleServiceSelection(service.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedServices.has(service.id)}
                    onChange={() => toggleServiceSelection(service.id)}
                    className="rounded bg-gray-700 border-gray-600 text-green-600 focus:ring-green-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  {/* Service Icon */}
                  <div className="w-10 h-10 rounded-lg bg-gray-700/50 p-2 flex items-center justify-center">
                    {service.service !== 'unknown' ? (
                      <img 
                        src={`/logos/${service.service}.svg`} 
                        alt={service.service}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                    ) : null}
                    <ServerIcon className="w-6 h-6 text-gray-400" style={{display: service.service !== 'unknown' ? 'none' : 'block'}} />
                  </div>
                  
                  {/* Service Info */}
                  <div>
                    <div className="font-medium text-white">
                      {service.serviceName || service.service || 'Unknown Service'}
                    </div>
                    <div className="text-sm text-gray-400">
                      {service.hostname || service.ip}:{service.port}
                    </div>
                    {service.version && (
                      <div className="text-xs text-gray-500">
                        Version: {service.version}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Service Details */}
                <div className="text-right">
                  <div className="text-sm font-medium text-green-400">
                    {service.confidence}% confidence
                  </div>
                  <div className="text-xs text-gray-400">
                    {service.ssl ? 'HTTPS' : 'HTTP'} • {service.responseTime}ms
                  </div>
                </div>
              </div>
              
              {service.details && (
                <div className="mt-2 text-xs text-gray-500 border-t border-gray-700 pt-2">
                  {service.details}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
  
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => {}}>
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gray-900 border border-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-green-600/20 rounded-lg">
                      <WifiIcon className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-white">
                        Network Discovery
                      </Dialog.Title>
                      <p className="text-sm text-gray-400">
                        {step === 'configure' && 'Configure and start network scan'}
                        {step === 'scanning' && 'Scanning network for services'}
                        {step === 'results' && 'Select services to add'}
                        {step === 'setup' && 'Configure selected services'}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={step === 'scanning' ? cancelScan : onClose}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                
                {/* Content */}
                <div className="mb-6">
                  {step === 'configure' && renderConfigureStep()}
                  {step === 'scanning' && renderScanningStep()}
                  {step === 'results' && renderResultsStep()}
                  {step === 'setup' && renderSetupStep()}
                </div>
                
                {/* Footer */}
                <div className="flex justify-end space-x-3">
                  {step === 'configure' && (
                    <>
                      <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      
                      <button
                        onClick={addNetworkToQueue}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center"
                      >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Add Network
                      </button>
                      
                      <button
                        onClick={startAllScans}
                        disabled={networkQueue.length === 0}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center"
                      >
                        <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                        Start Discovery ({networkQueue.length})
                      </button>
                    </>
                  )}
                  
                  {step === 'scanning' && (
                    <button
                      onClick={cancelScan}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      Cancel Scan
                    </button>
                  )}
                  
                  {step === 'results' && (
                    <>
                      <button
                        onClick={() => setStep('configure')}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                      >
                        Scan More Networks
                      </button>
                      
                      {selectedServices.size > 0 && (
                        <button
                          onClick={addSelectedServices}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          Add Selected Services ({selectedServices.size})
                        </button>
                      )}
                      
                      <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                      >
                        Done
                      </button>
                    </>
                  )}
                  
                  {step === 'setup' && (
                    <>
                      <button
                        onClick={() => setStep('results')}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                      >
                        Back to Results
                      </button>
                      
                      {allServicesProcessed() ? (
                        <>
                          {(() => {
                            const summary = getProcessingSummary();
                            return (
                              <div className="flex items-center space-x-4">
                                {summary.failed > 0 && (
                                  <div className="px-3 py-2 text-sm text-yellow-400 bg-yellow-900/20 rounded">
                                    {summary.successful} added, {summary.failed} failed
                                  </div>
                                )}
                                <button
                                  onClick={onClose}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                >
                                  Done ({summary.successful} Added)
                                </button>
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <div className="px-4 py-2 text-sm text-gray-400">
                          {processedServices.size} of {servicesToConfigure.length} services processed
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
        
        {/* Quick Add Service Modal */}
        <QuickAddServiceModal 
          isOpen={showQuickAdd}
          onClose={() => {
            setShowQuickAdd(false);
            setQuickAddService(null);
          }}
          service={quickAddService}
          onServiceAdded={handleQuickAdd}
        />
      </Dialog>
    </Transition>
  );
};

export default NetworkDiscoveryModal;