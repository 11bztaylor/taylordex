import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDownIcon, PlayIcon, PauseIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import { MagnifyingGlassIcon, FunnelIcon, ArrowDownTrayIcon, ClockIcon } from '@heroicons/react/24/outline';

const LogsTab = () => {
  // State management
  const [logs, setLogs] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  
  // Filter states
  const [selectedService, setSelectedService] = useState('all');
  const [selectedFacility, setSelectedFacility] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [timeRange, setTimeRange] = useState('1h');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableFacilities, setAvailableFacilities] = useState([]);
  
  // UI states
  const [expandedLogs, setExpandedLogs] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  
  // Refs
  const logsEndRef = useRef(null);
  const eventSourceRef = useRef(null);
  
  // Log levels with colors (industry standard - dark theme)
  const logLevels = {
    CRITICAL: { color: 'text-red-300 bg-red-900/50', label: 'Critical' },
    ERROR: { color: 'text-red-300 bg-red-900/30', label: 'Error' },
    WARNING: { color: 'text-yellow-300 bg-yellow-900/30', label: 'Warning' },
    INFO: { color: 'text-blue-300 bg-blue-900/30', label: 'Info' },
    DEBUG: { color: 'text-gray-400 bg-gray-800', label: 'Debug' },
    TRACE: { color: 'text-gray-500 bg-gray-800', label: 'Trace' }
  };
  
  // Time range options (industry standard)
  const timeRanges = [
    { value: '15m', label: 'Last 15 minutes' },
    { value: '1h', label: 'Last hour' },
    { value: '4h', label: 'Last 4 hours' },
    { value: '24h', label: 'Last 24 hours' },
    { value: 'custom', label: 'Custom range' }
  ];

  // Fetch services on component mount
  useEffect(() => {
    fetchServices();
  }, []);

  // Fetch logs when filters change
  useEffect(() => {
    fetchLogs();
  }, [selectedService, selectedFacility, selectedLevel, timeRange]);

  // Update facilities when service changes
  useEffect(() => {
    if (selectedService !== 'all') {
      fetchServiceFacilities(selectedService);
    } else {
      setAvailableFacilities([]);
      setSelectedFacility('all');
    }
  }, [selectedService]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Fetch available services
  const fetchServices = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/services');
      const data = await response.json();
      if (data.success) {
        setServices(data.services.filter(s => s.enabled));
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
    }
  };

  // Fetch service facilities
  const fetchServiceFacilities = async (serviceId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/logs/facilities/${serviceId}`);
      const data = await response.json();
      if (data.success) {
        setAvailableFacilities(data.facilities);
      }
    } catch (error) {
      console.error('Failed to fetch facilities:', error);
      setAvailableFacilities([]);
    }
  };

  // Fetch logs based on current filters
  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      let url = 'http://localhost:5000/api/logs/';
      const params = new URLSearchParams();
      
      if (selectedService === 'all') {
        url += 'all';
      } else {
        url += `service/${selectedService}`;
        if (selectedFacility !== 'all') {
          params.append('facility', selectedFacility);
        }
      }
      
      if (selectedLevel !== 'all') {
        params.append('level', selectedLevel);
      }
      
      params.append('limit', '200'); // Fetch more for better UX
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Start real-time log streaming
  const startStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const params = new URLSearchParams();
    if (selectedService !== 'all') {
      params.append('serviceId', selectedService);
      if (selectedFacility !== 'all') {
        params.append('facility', selectedFacility);
      }
    }
    if (selectedLevel !== 'all') {
      params.append('level', selectedLevel);
    }

    const url = `http://localhost:5000/api/logs/stream?${params.toString()}`;
    const eventSource = new EventSource(url);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'logs' && data.logs) {
          setLogs(prevLogs => {
            // Merge new logs with existing ones, avoiding duplicates
            const existingIds = new Set(prevLogs.map(log => log.id));
            const newLogs = data.logs.filter(log => !existingIds.has(log.id));
            return [...newLogs, ...prevLogs].slice(0, 500); // Keep last 500 entries
          });
        }
      } catch (error) {
        console.error('Failed to parse streaming data:', error);
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('Log stream error:', error);
      setStreaming(false);
    };
    
    eventSourceRef.current = eventSource;
    setStreaming(true);
  }, [selectedService, selectedFacility, selectedLevel]);

  // Stop streaming
  const stopStreaming = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStreaming(false);
  };

  // Toggle streaming
  const toggleStreaming = () => {
    if (streaming) {
      stopStreaming();
    } else {
      startStreaming();
    }
  };

  // Filter logs based on search query
  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      log.message.toLowerCase().includes(searchLower) ||
      log.service.toLowerCase().includes(searchLower) ||
      log.facility.toLowerCase().includes(searchLower)
    );
  });

  // Toggle log expansion
  const toggleLogExpansion = (logId) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  // Export logs
  const exportLogs = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T');
    const dateStr = timestamp[0];
    const timeStr = timestamp[1].split('-')[0];
    
    const header = `# TaylorDex System Logs Export
# Generated: ${new Date().toISOString()}
# Filters: Service=${selectedService === 'all' ? 'All' : services.find(s => s.id == selectedService)?.name || selectedService}, Facility=${selectedFacility}, Level=${selectedLevel}
# Total Logs: ${filteredLogs.length}
# ================================================

`;
    
    const logText = filteredLogs.map(log => 
      `${new Date(log.timestamp).toISOString()} [${log.level.padEnd(8)}] ${log.service}:${log.facility} - ${log.message}${log.exception ? `\n  EXCEPTION: ${log.exception}` : ''}`
    ).join('\n');
    
    const blob = new Blob([header + logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const filename = `taylordex-logs-${dateStr}-${timeStr}${selectedService !== 'all' ? `-${services.find(s => s.id == selectedService)?.name || selectedService}` : ''}.log`;
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-[800px] bg-gray-900 text-white">
      {/* Header with controls */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-green-400">System Logs</h2>
          
          <div className="flex items-center space-x-3">
            {/* Streaming control */}
            <button
              onClick={toggleStreaming}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                streaming 
                  ? 'bg-red-900/50 text-red-300 hover:bg-red-900/70' 
                  : 'bg-green-900/50 text-green-300 hover:bg-green-900/70'
              }`}
            >
              {streaming ? (
                <><PauseIcon className="w-4 h-4 mr-1" /> Pause Stream</>
              ) : (
                <><PlayIcon className="w-4 h-4 mr-1" /> Start Stream</>
              )}
            </button>

            {/* Auto-scroll toggle */}
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                autoScroll 
                  ? 'bg-blue-900/50 text-blue-300' 
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              <ArrowDownIcon className="w-4 h-4 mr-1" />
              Auto-scroll
            </button>

            {/* Export button */}
            <button
              onClick={exportLogs}
              className="flex items-center px-3 py-2 bg-gray-700 text-gray-300 rounded-md text-sm font-medium hover:bg-gray-600"
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
              Export
            </button>

          </div>
        </div>

        {/* Filters panel - Always visible */}
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-gray-800 rounded-lg">
            {/* Global log level filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Log Level (Global)
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Levels</option>
                {Object.entries(logLevels).map(([level, config]) => (
                  <option key={level} value={level}>{config.label}</option>
                ))}
              </select>
            </div>

            {/* Service filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Service
              </label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Services</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name} ({service.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Facility filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Facility
              </label>
              <select
                value={selectedFacility}
                onChange={(e) => setSelectedFacility(e.target.value)}
                disabled={selectedService === 'all' || availableFacilities.length === 0}
                className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-800 disabled:text-gray-500"
              >
                <option value="all">All Facilities</option>
                {availableFacilities.map(facility => (
                  <option key={facility} value={facility}>{facility}</option>
                ))}
              </select>
            </div>

            {/* Time range filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Time Range
              </label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {timeRanges.map(range => (
                  <option key={range.value} value={range.value}>{range.label}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 text-sm text-gray-300">
        <div className="flex items-center justify-between">
          <span>
            Showing {filteredLogs.length} logs
            {selectedService !== 'all' && (
              <> from {services.find(s => s.id == selectedService)?.name}</>
            )}
            {streaming && (
              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-900/50 text-green-300 border border-green-700">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></div>
                Live
              </span>
            )}
          </span>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Logs container */}
      <div className="flex-1 overflow-auto bg-gray-900">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-400">Loading logs...</p>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <ClockIcon className="w-12 h-12 text-gray-500 mx-auto" />
              <p className="mt-2 text-lg font-medium text-gray-300">No logs found</p>
              <p className="text-sm text-gray-400">
                Try adjusting your filters or start streaming to see new logs
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {filteredLogs.map((log, index) => (
              <LogEntry
                key={log.id || index}
                log={log}
                expanded={expandedLogs.has(log.id)}
                onToggleExpansion={() => toggleLogExpansion(log.id)}
                logLevels={logLevels}
                formatTimestamp={formatTimestamp}
              />
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

// Individual log entry component
const LogEntry = ({ log, expanded, onToggleExpansion, logLevels, formatTimestamp }) => {
  const levelConfig = logLevels[log.level] || { color: 'text-gray-600', label: log.level };
  
  return (
    <div 
      className="px-4 py-3 hover:bg-gray-800 cursor-pointer transition-colors"
      onClick={onToggleExpansion}
    >
      <div className="flex items-start space-x-3">
        {/* Timestamp */}
        <div className="text-xs text-gray-400 font-mono w-24 flex-shrink-0 pt-0.5">
          {formatTimestamp(log.timestamp)}
        </div>
        
        {/* Log level badge */}
        <div className={`px-2 py-1 rounded text-xs font-medium ${levelConfig.color} flex-shrink-0`}>
          {levelConfig.label}
        </div>
        
        {/* Service and facility */}
        <div className="text-xs text-gray-400 flex-shrink-0 pt-0.5">
          <span className="font-medium">{log.service}</span>
          {log.facility && <span className="text-gray-500">:{log.facility}</span>}
        </div>
        
        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-200 break-words">
            {expanded ? log.message : (
              log.message.length > 120 
                ? `${log.message.substring(0, 120)}...` 
                : log.message
            )}
          </p>
          
          {/* Expanded details */}
          {expanded && (
            <div className="mt-2 space-y-2">
              {log.exception && (
                <div className="bg-red-900/30 p-2 rounded text-xs">
                  <span className="font-medium text-red-300">Exception:</span>
                  <pre className="text-red-200 mt-1 whitespace-pre-wrap">{log.exception}</pre>
                </div>
              )}
              
              <div className="bg-gray-800 p-2 rounded text-xs space-y-1">
                <div><span className="font-medium">Full Timestamp:</span> {new Date(log.timestamp).toISOString()}</div>
                <div><span className="font-medium">Service ID:</span> {log.serviceId}</div>
                <div><span className="font-medium">Log ID:</span> {log.id}</div>
              </div>
            </div>
          )}
        </div>
        
        {/* Expansion indicator */}
        <div className="flex-shrink-0 pt-0.5">
          <ChevronDownIcon 
            className={`w-4 h-4 text-gray-500 transition-transform ${
              expanded ? 'transform rotate-180' : ''
            }`} 
          />
        </div>
      </div>
    </div>
  );
};

export default LogsTab;