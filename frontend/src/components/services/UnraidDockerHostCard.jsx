import React, { useState, useEffect } from 'react';
import { 
  ServerIcon, 
  PlayIcon, 
  StopIcon, 
  PauseIcon,
  ArrowPathIcon,
  EyeIcon,
  CircleStackIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  FolderIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

const UnraidDockerHostCard = ({ host, onRemove, onRefresh }) => {
  const [containers, setContainers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showContainers, setShowContainers] = useState(false);
  const [expandedContainer, setExpandedContainer] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);

  useEffect(() => {
    fetchUnraidData();
  }, [host.serviceId]);

  const fetchUnraidData = async () => {
    try {
      setLoading(true);
      // Fetch Unraid service stats to get container information
      const response = await fetch(`http://localhost:5000/api/unraid/${host.serviceId}/stats`);
      const data = await response.json();
      
      if (data.success && data.stats) {
        setStats(data.stats);
        console.log('Unraid stats received:', data.stats);
        
        // Convert Unraid container data to our format
        // Check multiple possible locations for container data
        let containerData = [];
        
        if (data.stats.docker?.containers) {
          containerData = data.stats.docker.containers;
          console.log('Found containers in docker.containers:', containerData);
        } else if (data.stats.containers) {
          containerData = data.stats.containers;
          console.log('Found containers in stats.containers:', containerData);
        }
        
        console.log('Raw container data structure:', containerData);
        if (containerData && containerData.length > 0) {
          console.log('First container sample:', JSON.stringify(containerData[0], null, 2));
        }
        
        if (containerData && Array.isArray(containerData)) {
          const containerList = containerData.map(container => {
            // Better status detection
            const rawState = container.state || container.status || '';
            const rawStatus = container.status || container.state || '';
            
            // Determine if container is running based on various possible values
            const isRunning = 
              rawState === 'running' || 
              rawStatus === 'running' || 
              rawState === 'Up' ||
              rawStatus === 'Up' ||
              (typeof rawStatus === 'string' && rawStatus.toLowerCase().includes('up')) ||
              (typeof rawState === 'string' && rawState.toLowerCase().includes('running'));
            
            console.log(`Container ${container.name}: rawState="${rawState}", rawStatus="${rawStatus}", isRunning=${isRunning}`);
            
            return {
              id: container.name || container.id || `container-${Math.random()}`,
              name: container.name || container.names?.[0]?.replace('/', '') || 'Unknown Container',
              image: container.image || 'unknown',
              state: isRunning ? 'running' : 'stopped',
              status: rawStatus || rawState || 'unknown',
              // Enhanced port mapping
              ports: container.ports || container.networkSettings?.ports || [],
              // Volume mounts
              mounts: container.mounts || container.hostConfig?.binds || container.volumes || [],
              // Network information
              networkMode: container.hostConfig?.networkMode || container.networkSettings?.networkMode || 'bridge',
              ipAddress: container.networkSettings?.ipAddress || container.networkSettings?.networks?.bridge?.ipAddress,
              // Configuration details
              created: container.created || new Date().toISOString(),
              command: container.command || container.config?.cmd?.join(' ') || container.args?.join(' '),
              restartPolicy: container.hostConfig?.restartPolicy?.name || container.restartPolicy,
              // Environment variables
              env: container.config?.env || container.env || []
            };
          });
          
          console.log('Processed containers:', containerList);
          setContainers(containerList);
        } else {
          console.log('No container data found in response');
          setContainers([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch Unraid data:', error);
      setContainers([]);
    } finally {
      setLoading(false);
    }
  };

  const controlContainer = async (containerName, action) => {
    try {
      setLoadingAction(`${containerName}-${action}`);
      console.log(`Attempting to ${action} container: ${containerName}`);
      
      // Use Unraid API to control containers
      const response = await fetch(
        `http://localhost:5000/api/unraid/${host.serviceId}/docker/${containerName}/${action}`,
        { method: 'POST' }
      );
      
      const result = await response.json();
      console.log(`Container ${action} response:`, result);
      console.log(`Response status: ${response.status}, Response OK: ${response.ok}`);
      
      if (response.ok && result.success) {
        // Show enhanced notification with verification info
        if (result.verification) {
          const verification = result.verification;
          if (verification.stateChanged) {
            showNotification(`✅ ${containerName} ${action} confirmed! ${verification.message}`, 'success');
          } else if (verification.commandSent) {
            showNotification(`📤 ${containerName} ${action} command sent via ${result.method}. Verification: ${verification.message}`, 'warning');
          } else {
            showNotification(`⚠️ ${containerName} ${action} sent but not verified. Check Unraid dashboard.`, 'warning');
          }
        } else {
          showNotification(`✅ Successfully ${action}ed ${containerName}`, 'success');
        }
        
        // Refresh data after action (wait longer if verification happened)
        const refreshDelay = result.verification ? 2000 : 1500;
        setTimeout(() => {
          fetchUnraidData();
        }, refreshDelay);
      } else {
        // Handle different types of errors
        if (result.userGuidance) {
          // Show detailed guidance for Unraid API limitations
          const guidance = result.userGuidance;
          const recommendedAlternative = guidance.alternatives?.find(alt => alt.recommended);
          
          if (result.developmentNote) {
            // Special handling for development/API limitation notes
            showNotification({
              title: '🔒 Container Control Limited',
              description: 'Unraid API limitations prevent remote container control. This feature will be enhanced when Unraid releases improved API capabilities.',
              recommendation: recommendedAlternative?.description || 'Use Unraid web interface directly'
            }, 'warning', true);
          } else {
            showNotification({
              title: guidance.title,
              description: guidance.message,
              recommendation: recommendedAlternative?.description || 'Use Unraid web interface directly'
            }, 'warning', true);
          }
        } else {
          // Show simple error message
          const errorMsg = result.error || result.message || `HTTP ${response.status}: ${response.statusText}`;
          console.error(`Failed to ${action} container ${containerName}:`, {
            status: response.status,
            statusText: response.statusText,
            response: result
          });
          showNotification(`❌ Failed to ${action} ${containerName}: ${errorMsg}`, 'error');
        }
      }
    } catch (error) {
      console.error(`Error ${action}ing container:`, error);
      showNotification(`❌ Error ${action}ing ${containerName}: ${error.message}`, 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const showNotification = (message, type, isDetailed = false) => {
    // Create a simple toast notification
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md transition-all duration-300 ${
      type === 'success' ? 'bg-green-900/90 border border-green-700 text-green-100' : 
      type === 'warning' ? 'bg-yellow-900/90 border border-yellow-700 text-yellow-100' :
      'bg-red-900/90 border border-red-700 text-red-100'
    }`;
    
    if (isDetailed) {
      notification.innerHTML = `
        <div class="text-sm font-medium mb-2">${message.title || 'Container Control Unavailable'}</div>
        <div class="text-xs opacity-90 mb-3">${message.description || ''}</div>
        <div class="text-xs font-medium">Recommended:</div>
        <div class="text-xs opacity-80 mt-1">${message.recommendation || 'Use Unraid web interface'}</div>
        <button onclick="this.parentElement.style.display='none'" class="absolute top-2 right-2 text-lg leading-none opacity-70 hover:opacity-100">&times;</button>
      `;
    } else {
      notification.textContent = message;
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after longer time for detailed messages
    const timeout = isDetailed ? 8000 : 4000;
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, timeout);
  };

  const runningContainers = containers.filter(c => c.state === 'running').length;

  return (
    <div className="bg-gradient-to-br from-orange-900/10 to-red-900/10 backdrop-blur-sm rounded-xl p-6 border border-orange-700/30 hover:border-orange-600/50 transition-all relative">
      {/* Auto-discovered Badge */}
      <div className="absolute top-4 right-4">
        <div className="flex items-center space-x-2">
          <span className="text-xs bg-orange-900/20 text-orange-300 px-2 py-1 rounded border border-orange-700/50">
            Auto-discovered
          </span>
          <button
            onClick={fetchUnraidData}
            className="p-1 text-orange-400 hover:text-orange-300 hover:bg-orange-900/20 rounded-lg transition-colors"
            title="Refresh"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-start mb-4 pr-24">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-500 shadow-lg`}>
            <ServerIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">{host.name}</h3>
            <p className="text-xs text-orange-300">{host.host}:{host.port}</p>
            <p className="text-xs text-gray-400">Unraid Docker Host</p>
          </div>
        </div>
      </div>

      {/* Docker Service Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${host.connected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className={`text-sm ${host.connected ? 'text-green-400' : 'text-red-400'}`}>
            Docker Service {host.connected ? 'Available' : 'Unavailable'}
          </span>
        </div>
        
        <div className="text-xs text-orange-300">
          {containers.length > 0 ? `${containers.length} containers found` : 'No containers'}
        </div>
      </div>

      {/* Docker Container Summary */}
      {!loading && (
        <div className="mb-4">
          <div 
            className="bg-blue-900/20 rounded-lg p-4 border border-blue-700/30 cursor-pointer hover:bg-blue-900/30 transition-colors"
            onClick={() => setShowContainers(!showContainers)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <CircleStackIcon className="w-5 h-5 text-blue-400" />
                <span className="text-lg font-medium text-blue-300">Docker Containers</span>
              </div>
              <EyeIcon className="w-4 h-4 text-blue-400" />
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-xl font-bold text-white">{containers.length}</div>
                <div className="text-xs text-gray-400">Total</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-400">{runningContainers}</div>
                <div className="text-xs text-gray-400">Running</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-red-400">{containers.length - runningContainers}</div>
                <div className="text-xs text-gray-400">Stopped</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-blue-400/70 text-center">
              Click to {showContainers ? 'hide' : 'show'} container details
            </div>
          </div>
        </div>
      )}

      {/* Expanded Container List */}
      {showContainers && !loading && (
        <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
          <div className="text-xs text-gray-400 mb-3 font-medium">Container Management</div>
          {containers.slice(0, 15).map((container) => (
            <div key={container.id} className="bg-gray-800/30 rounded-lg border border-gray-700/50 overflow-hidden">
              {/* Container Header */}
              <div 
                className="p-3 cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() => setExpandedContainer(expandedContainer === container.id ? null : container.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-white font-medium truncate">{container.name}</p>
                      {expandedContainer === container.id ? (
                        <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronUpIcon className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{container.image}</p>
                  </div>
                  
                  <div className="flex items-center space-x-1 ml-2">
                    {/* Status Indicator */}
                    <div className="flex items-center space-x-1 mr-2">
                      <div className={`w-3 h-3 rounded-full ${
                        container.state === 'running' ? 'bg-green-400' : 'bg-red-400'
                      }`}></div>
                      <span className={`text-xs ${
                        container.state === 'running' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {container.state === 'running' ? 'Running' : 'Stopped'}
                      </span>
                    </div>
                    
                    {/* Future: Action Buttons - Unraid Docker support being planned */}
                    {/* <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        controlContainer(container.name, 'restart');
                      }}
                      disabled={loadingAction === `${container.name}-restart`}
                      className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50"
                      title="Restart container"
                    >
                      <ArrowPathIcon className={`w-4 h-4 ${loadingAction === `${container.name}-restart` ? 'animate-spin' : ''}`} />
                    </button>
                    
                    {container.state === 'running' ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            controlContainer(container.name, 'pause');
                          }}
                          disabled={loadingAction === `${container.name}-pause`}
                          className="p-1.5 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20 rounded transition-colors disabled:opacity-50"
                          title="Pause container"
                        >
                          <PauseIcon className={`w-4 h-4 ${loadingAction === `${container.name}-pause` ? 'animate-pulse' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            controlContainer(container.name, 'stop');
                          }}
                          disabled={loadingAction === `${container.name}-stop`}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                          title="Stop container"
                        >
                          <StopIcon className={`w-4 h-4 ${loadingAction === `${container.name}-stop` ? 'animate-pulse' : ''}`} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          controlContainer(container.name, 'start');
                        }}
                        disabled={loadingAction === `${container.name}-start`}
                        className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-900/20 rounded transition-colors disabled:opacity-50"
                        title="Start container"
                      >
                        <PlayIcon className={`w-4 h-4 ${loadingAction === `${container.name}-start` ? 'animate-pulse' : ''}`} />
                      </button> */}
                    {/* )} */}
                    
                    {/* Placeholder for future Unraid Docker controls */}
                    <div className="text-xs text-gray-500 italic">
                      Docker controls planned
                    </div>
                  </div>
                </div>
                
                {/* Basic Status */}
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Status:</span>
                  <span className={`${container.state === 'running' ? 'text-green-400' : 'text-red-400'}`}>
                    {container.status}
                  </span>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedContainer === container.id && (
                <div className="border-t border-gray-700/50 bg-gray-800/50 p-2 space-y-2">
                  {/* Network & Ports - Only show if there's data */}
                  {(container.ports?.length > 0 || container.ipAddress || container.networkMode !== 'bridge') && (
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <GlobeAltIcon className="w-3 h-3 text-blue-400" />
                        <span className="text-xs font-medium text-blue-300">Network & Ports</span>
                      </div>
                        <div className="space-y-1">
                          {container.ports && container.ports.length > 0 && (
                            <div>
                              <span className="text-gray-400 text-xs">Ports:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Array.isArray(container.ports) ? (
                                  container.ports.slice(0, 3).map((port, idx) => (
                                    <span key={idx} className="bg-gray-700/40 px-2 py-0.5 rounded text-blue-300 text-xs">
                                      {typeof port === 'string' ? port : 
                                       `${port.hostPort || '?'}:${port.containerPort || port.privatePort || '?'}/${port.type || 'tcp'}`}
                                    </span>
                                  ))
                                ) : (
                                  <span className="bg-gray-700/40 px-2 py-0.5 rounded text-blue-300 text-xs">{container.ports}</span>
                                )}
                                {Array.isArray(container.ports) && container.ports.length > 3 && (
                                  <span className="text-gray-500 text-xs">+{container.ports.length - 3} more</span>
                                )}
                              </div>
                            </div>
                          )}
                          {container.networkMode && container.networkMode !== 'bridge' && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Network:</span>
                              <span className="text-blue-300">{container.networkMode}</span>
                            </div>
                          )}
                          {container.ipAddress && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">IP:</span>
                              <span className="text-blue-300">{container.ipAddress}</span>
                            </div>
                          )}
                        </div>
                    </div>
                  )}

                  {/* Volumes - Only show if there are actual mounts */}
                  {container.mounts && container.mounts.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <FolderIcon className="w-3 h-3 text-purple-400" />
                        <span className="text-xs font-medium text-purple-300">Volume Mounts ({container.mounts.length})</span>
                      </div>
                      <div className="ml-4 space-y-1">
                        {container.mounts.slice(0, 2).map((mount, index) => {
                          // Handle different mount formats
                          let hostPath, containerPath, mode;
                          
                          if (typeof mount === 'string') {
                            // Handle "host:container:mode" format
                            const parts = mount.split(':');
                            hostPath = parts[0];
                            containerPath = parts[1];
                            mode = parts[2] || 'rw';
                          } else if (typeof mount === 'object') {
                            hostPath = mount.source || mount.hostPath || mount.Source;
                            containerPath = mount.destination || mount.containerPath || mount.Destination;
                            mode = mount.mode || mount.Mode || 'rw';
                          }
                          
                          return (
                            <div key={index} className="bg-gray-700/30 p-1.5 rounded text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400 text-xs">Host:</span>
                                <span className="text-purple-300 truncate max-w-24" title={hostPath}>
                                  {hostPath || 'N/A'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400 text-xs">Container:</span>
                                <span className="text-purple-300 truncate max-w-24" title={containerPath}>
                                  {containerPath || 'N/A'}
                                </span>
                              </div>
                              {mode && mode !== 'rw' && (
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400 text-xs">Mode:</span>
                                  <span className="text-purple-300">{mode}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {container.mounts.length > 2 && (
                          <div className="text-gray-500 text-xs ml-1">... and {container.mounts.length - 2} more mounts</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Configuration - Only show if there's meaningful data */}
                  {(container.command || container.env?.length > 0 || container.restartPolicy) && (
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <CircleStackIcon className="w-3 h-3 text-green-400" />
                        <span className="text-xs font-medium text-green-300">Configuration</span>
                      </div>
                      <div className="ml-4 text-xs space-y-1">
                        {container.restartPolicy && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Policy:</span>
                            <span className="text-green-300">{container.restartPolicy}</span>
                          </div>
                        )}
                        {container.command && (
                          <div>
                            <span className="text-gray-400">Command:</span>
                            <div className="bg-gray-700/30 p-1 rounded text-green-300 font-mono text-xs mt-1 truncate" title={container.command}>
                              {container.command.length > 50 ? `${container.command.substring(0, 50)}...` : container.command}
                            </div>
                          </div>
                        )}
                        {container.env && container.env.length > 0 && (
                          <div>
                            <span className="text-gray-400">Environment ({container.env.length} vars):</span>
                            <div className="mt-1 space-y-1">
                              {container.env.slice(0, 2).map((envVar, idx) => (
                                <div key={idx} className="bg-gray-700/30 p-1 rounded text-green-300 font-mono text-xs truncate" title={typeof envVar === 'string' ? envVar : `${envVar.name}=${envVar.value}`}>
                                  {typeof envVar === 'string' ? (
                                    envVar.length > 30 ? `${envVar.substring(0, 30)}...` : envVar
                                  ) : (
                                    `${envVar.name}=${envVar.value}`.length > 30 ? `${envVar.name}=${envVar.value}`.substring(0, 30) + '...' : `${envVar.name}=${envVar.value}`
                                  )}
                                </div>
                              ))}
                              {container.env.length > 2 && (
                                <div className="text-gray-500 text-xs">... and {container.env.length - 2} more variables</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {containers.length > 15 && (
            <p className="text-xs text-gray-500 text-center py-2">
              ... and {containers.length - 15} more containers
            </p>
          )}
        </div>
      )}

      {loading && (
        <div className="bg-gray-800/50 rounded-lg p-3 animate-pulse mb-4">
          <div className="h-4 bg-gray-700 rounded mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-2/3"></div>
        </div>
      )}

      {/* Footer Info */}
      <div className="pt-4 border-t border-orange-800/30">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Managed via Unraid API</span>
          <span>{containers.length} containers total</span>
        </div>
      </div>
    </div>
  );
};

export default UnraidDockerHostCard;