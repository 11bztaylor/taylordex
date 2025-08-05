const BaseService = require('../../utils/baseService');

class UnraidService extends BaseService {
  constructor() {
    super('Unraid');
  }

  buildUrl(host, port, path) {
    // Unraid typically uses HTTPS on 443 or HTTP on 80/custom port
    const protocol = port === 443 ? 'https' : 'http';
    return `${protocol}://${host}:${port}${path}`;
  }

  getHeaders(config) {
    return {
      'x-api-key': config.api_key,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async testConnection(config) {
    try {
      console.log(`Testing Unraid connection to ${config.host}:${config.port}`);
      
      // Test with a simple GraphQL query to get system info
      // Start with basic fields that should exist in most Unraid GraphQL schemas
      const query = `
        query {
          info {
            os {
              platform
            }
          }
        }
      `;

      const url = this.buildUrl(config.host, config.port, '/graphql');
      console.log(`Attempting connection to: ${url}`);
      console.log(`Using headers:`, { ...this.getHeaders(config), 'x-api-key': '***hidden***' });
      
      const response = await this.axios.post(url, 
        { query },
        { 
          headers: this.getHeaders(config),
          timeout: 10000,
          validateStatus: function (status) {
            return status < 500; // Accept 4xx errors to see what's wrong
          }
        }
      );
      
      console.log(`Response status: ${response.status}`);
      console.log(`Response data:`, response.data);
      
      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      const systemInfo = response.data.data?.info;
      return {
        success: true,
        version: systemInfo?.os?.version || 'Unknown',
        message: `Connected to Unraid ${systemInfo?.os?.platform || 'Server'}`,
        details: {
          cores: systemInfo?.cpu?.cores,
          platform: systemInfo?.os?.platform
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error.response?.data || 'Connection failed'
      };
    }
  }

  async getStats(config) {
    try {
      console.log(`Fetching comprehensive Unraid stats from ${config.host}:${config.port}`);
      
      // Comprehensive GraphQL query for system monitoring using correct Unraid schema
      const query = `
        query {
          info {
            os {
              platform
            }
            cpu {
              cores
            }
            memory {
              total
              used
            }
          }
          array {
            state
          }
          docker {
            containers {
              names
              image
              status
              state
            }
          }
        }
      `;

      const url = this.buildUrl(config.host, config.port, '/graphql');
      
      // Use shorter timeout and better error handling
      const response = await this.axios.post(url, 
        { query },
        { 
          headers: this.getHeaders(config),
          timeout: 8000, // Shorter timeout to prevent hanging
          validateStatus: status => status < 500 // Accept 4xx errors
        }
      );
      
      console.log(`GraphQL response status: ${response.status}`);
      
      if (response.status >= 400) {
        throw new Error(`GraphQL request failed with status ${response.status}`);
      }
      
      if (response.data.errors) {
        console.error('GraphQL errors:', response.data.errors);
        // Continue with partial data if available
      }

      const data = response.data.data || {};
      
      // Process and format the data
      const stats = this.processUnraidData(data);
      
      return {
        ...stats,
        status: 'online',
        version: data.info?.os?.version || 'Unknown',
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching Unraid stats:', error.message);
      
      // Return fallback data instead of empty object
      return {
        status: 'error',
        error: error.message,
        serverName: 'Unraid Server (Connection Error)',
        system: {
          serverName: 'Unraid Server',
          version: 'Connection Error',
          uptime: 0,
          cpuCores: 0,
          cpuModel: 'Unknown',
          cpuUsage: 0
        },
        memory: {
          total: '0 B',
          used: '0 B', 
          available: '0 B',
          percent: 0
        },
        docker: {
          totalContainers: 0,
          runningContainers: 0,
          stoppedContainers: 0,
          containers: [],
          networks: []
        },
        arrays: 0,
        containers: 0,
        runningContainers: 0,
        totalVMs: 0,
        runningVMs: 0,
        uptime: '0 seconds',
        lastUpdate: new Date().toISOString()
      };
    }
  }

  processUnraidData(data) {
    const { info, array, docker } = data;
    
    // System Information
    const systemInfo = {
      serverName: info?.os?.platform || 'Unraid Server',
      version: 'Connected via GraphQL API',
      uptime: 0,
      cpuCores: info?.cpu?.cores || 0,
      cpuModel: 'Unknown',
      cpuUsage: 0
    };

    // Memory Information - calculate percentage
    const memTotal = info?.memory?.total || 0;
    const memUsed = info?.memory?.used || 0;
    const memPercent = memTotal > 0 ? ((memUsed / memTotal) * 100).toFixed(1) : 0;
    
    const memoryInfo = {
      total: this.formatBytes(memTotal),
      used: this.formatBytes(memUsed),
      available: this.formatBytes(memTotal - memUsed),
      percent: memPercent
    };

    // Array Information
    const arrayInfo = {
      status: array?.state || 'Unknown',
      protection: 'Unknown',
      numDisks: 0,
      numDevices: 0,
      size: 'Unknown',
      used: 'Unknown', 
      free: 'Unknown',
      percentUsed: 0
    };

    // Docker Information - parse container names and status
    const containers = docker?.containers || [];
    const runningContainers = containers.filter(c => 
      c.status && c.status.toLowerCase().includes('up')
    ).length;
    
    const dockerInfo = {
      totalContainers: containers.length,
      runningContainers: runningContainers,
      stoppedContainers: containers.length - runningContainers,
      containers: containers.slice(0, 20).map(container => ({
        name: container.names?.[0]?.replace('/', '') || 'Unknown',
        image: container.image || 'Unknown',
        status: container.status || 'Unknown',
        state: container.state || 'Unknown',
        ports: [],
        created: 'Unknown',
        started: 'Unknown',
        cpu: 0,
        memory: 'Unknown'
      })),
      networks: []
    };

    return {
      system: systemInfo,
      memory: memoryInfo,
      array: arrayInfo,
      docker: dockerInfo,
      
      // Summary stats for dashboard
      serverName: systemInfo.serverName,
      arrays: 1, // Unraid typically has one array
      containers: dockerInfo.totalContainers,
      runningContainers: dockerInfo.runningContainers,
      totalVMs: 0,
      runningVMs: 0,
      totalStorage: 'Unknown',
      usedStorage: 'Unknown', 
      freeStorage: 'Unknown',
      storagePercent: 0,
      uptime: this.formatUptime(0),
      alerts: 0,
      cpuCores: systemInfo.cpuCores,
      memoryPercent: memoryInfo.percent,
      arrayStatus: arrayInfo.status
    };
  }

  formatUptime(seconds) {
    if (!seconds) return '0 seconds';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    if (!bytes) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Docker container control methods
  // NOTE: Unraid's current API architecture has significant limitations for remote container control
  // See: https://docs.unraid.net/API/upcoming-features/
  // - Single user limitation makes secure API access challenging
  // - Current Connect API doesn't expose full Docker control capabilities
  // - Future API improvements may enable proper container management
  async controlDockerContainer(config, containerName, action) {
    console.log(`Docker container control requested: ${action} on ${containerName}`);
    console.log(`Note: Unraid API limitations prevent reliable remote container control`);
    
    return {
      success: false,
      error: "Remote container control temporarily disabled",
      message: `Container control for ${containerName} is not available remotely due to Unraid API limitations.`,
      action,
      container: containerName,
      method: 'unraid-api-limitation',
      developmentNote: {
        title: "Feature Under Development",
        message: "Remote Docker container control is limited by Unraid's current API architecture.",
        details: [
          "Unraid Connect API has single-user limitations that affect security",
          "Current GraphQL schema doesn't reliably expose Docker control mutations", 
          "Direct Docker API access typically requires SSH or unsafe port exposure",
          "Unraid is working on improved API features for future releases"
        ],
        reference: "https://docs.unraid.net/API/upcoming-features/",
        eta: "To be revisited when Unraid releases enhanced API capabilities"
      },
      userGuidance: {
        title: "Use Unraid Web Interface",
        message: "For now, please use Unraid's built-in Docker management interface.",
        alternatives: [
          {
            method: "Unraid Web UI",
            description: `Navigate to http://${config.host}${config.port !== 80 ? ':' + config.port : ''} → Docker tab → Find ${containerName} → Click ${action.charAt(0).toUpperCase() + action.slice(1)}`,
            recommended: true
          },
          {
            method: "Unraid Mobile App",
            description: "Use the official Unraid mobile app for container management",
            recommended: true
          },
          {
            method: "SSH Access (Advanced)",
            description: `SSH into server and run: docker ${action} ${containerName}`,
            recommended: false
          }
        ],
        statusNote: "Container status and information will continue to update automatically in this dashboard."
      }
    };
  }

  // New SSH method for more reliable container control
  async controlDockerContainerSSH(config, containerName, action) {
    // For now, return not implemented - this would require SSH credentials
    // In a future version, we could add SSH support
    return { 
      success: false, 
      error: 'SSH method not yet implemented - would need SSH credentials configured' 
    };
  }

  async controlDockerContainerGraphQL(config, containerName, action) {
    const actionMutations = {
      'start': ['startContainer', 'dockerStart', 'containerStart'],
      'stop': ['stopContainer', 'dockerStop', 'containerStop'], 
      'restart': ['restartContainer', 'dockerRestart', 'containerRestart'],
      'pause': ['pauseContainer', 'dockerPause', 'containerPause'],
      'unpause': ['unpauseContainer', 'dockerUnpause', 'containerUnpause']
    };

    const possibleMutations = actionMutations[action] || [action + 'Container'];
    
    for (const mutation of possibleMutations) {
      try {
        const query = `
          mutation {
            ${mutation}(name: "${containerName}") {
              success
              message
            }
          }
        `;

        const url = this.buildUrl(config.host, config.port, '/graphql');
        const response = await this.axios.post(url, 
          { query },
          { 
            headers: this.getHeaders(config),
            timeout: 10000,
            validateStatus: status => status < 500
          }
        );

        if (response.status >= 400) {
          continue;
        }

        if (response.data.errors) {
          console.log(`GraphQL mutation ${mutation} errors:`, response.data.errors[0]?.message);
          continue;
        }

        const result = response.data.data?.[mutation];
        if (result && result.success !== false) {
          return {
            success: true,
            message: result.message || `Container ${action} completed via GraphQL`,
            action,
            container: containerName
          };
        }
      } catch (error) {
        // Continue to next mutation
        continue;
      }
    }
    
    return { success: false, error: 'No working GraphQL mutations found' };
  }

  async controlDockerContainerSocket(config, containerName, action) {
    // Try to access Docker socket through various Unraid endpoints
    const endpoints = [
      `/api/docker/container/${containerName}/${action}`,
      `/plugins/dynamix.docker.manager/include/DockerClient.php?action=${action}&container=${containerName}`,
      `/webGui/include/DockerClient.php?action=${action}&container=${containerName}`
    ];
    
    for (const endpoint of endpoints) {
      try {
        const url = this.buildUrl(config.host, config.port, endpoint);
        const response = await this.axios.post(url, {}, {
          headers: this.getHeaders(config),
          timeout: 10000,
          validateStatus: status => status < 500
        });
        
        if (response.status >= 200 && response.status < 300) {
          return {
            success: true,
            message: `Container ${action} completed via Unraid endpoint`,
            action,
            container: containerName
          };
        }
      } catch (error) {
        continue;
      }
    }
    
    return { success: false, error: 'No working Unraid endpoints found' };
  }

  async controlDockerContainerREST(config, containerName, action) {
    // Try direct Docker API if exposed
    const dockerMethods = [
      // Try Docker API on common ports
      { port: 2375, path: `/containers/${containerName}/${action}` },
      { port: 2376, path: `/containers/${containerName}/${action}` },
      // Try Docker via Unraid's webGui (more likely to work)
      { port: config.port, path: `/webGui/scripts/docker_control.php`, params: { action, container: containerName } },
      // Try Unraid's dynamix plugin endpoint
      { port: config.port, path: `/plugins/dynamix.docker.manager/scripts/docker_control.php`, params: { action, container: containerName } }
    ];
    
    const dockerActions = {
      'start': 'start',
      'stop': 'stop', 
      'restart': 'restart',
      'pause': 'pause',
      'unpause': 'unpause'
    };
    
    const dockerAction = dockerActions[action];
    if (!dockerAction) {
      return { success: false, error: 'Unsupported Docker action' };
    }
    
    for (const method of dockerMethods) {
      try {
        let url, requestOptions;
        
        if (method.params) {
          // For Unraid web endpoints, use form data
          url = `http://${config.host}:${method.port}${method.path}`;
          const formData = new URLSearchParams();
          formData.append('action', dockerAction);
          formData.append('container', containerName);
          
          requestOptions = {
            headers: {
              ...this.getHeaders(config),
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 10000,
            validateStatus: status => status < 500
          };
          
          console.log(`Trying Unraid web endpoint: ${url} with action=${dockerAction}, container=${containerName}`);
          const response = await this.axios.post(url, formData, requestOptions);
          
          // Check if response indicates success
          if (response.status >= 200 && response.status < 400) {
            const responseText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
            console.log(`Unraid web endpoint response: ${responseText.substring(0, 200)}`);
            
            // Check for actual success indicators, not just HTML responses
            if (responseText.toLowerCase().includes('success') || 
                responseText.toLowerCase().includes('completed') ||
                (responseText.toLowerCase().includes('ok') && !responseText.toLowerCase().includes('html'))) {
              return {
                success: true,
                message: `Container ${action} completed via Unraid web interface`,
                action,
                container: containerName
              };
            } else if (responseText.toLowerCase().includes('html') || responseText.toLowerCase().includes('<!doctype')) {
              // This is an HTML page, not a successful API response
              console.log(`Got HTML response, not API success: ${responseText.substring(0, 100)}`);
              continue;
            }
          }
        } else {
          // For direct Docker API
          url = `http://${config.host}:${method.port}${method.path}`;
          console.log(`Trying Docker API: ${url}`);
          
          const response = await this.axios.post(url, {}, {
            timeout: 8000,
            validateStatus: status => status < 500
          });
          
          if (response.status >= 200 && response.status < 300) {
            console.log(`Docker API success: ${response.status}`);
            return {
              success: true,
              message: `Container ${action} completed via Docker API port ${method.port}`,
              action,
              container: containerName
            };
          }
        }
      } catch (error) {
        console.log(`Method ${JSON.stringify(method)} failed: ${error.message}`);
        continue;
      }
    }
    
    return { success: false, error: 'No working Docker control methods found' };
  }



  async getDockerContainerLogs(config, containerName, lines = 100) {
    try {
      const query = `
        query {
          containerLogs(name: "${containerName}", lines: ${lines}) {
            logs
            timestamp
          }
        }
      `;

      const url = this.buildUrl(config.host, config.port, '/graphql');
      const response = await this.axios.post(url, 
        { query },
        { 
          headers: this.getHeaders(config),
          timeout: 15000
        }
      );

      if (response.data.errors) {
        throw new Error(response.data.errors[0]?.message || 'Failed to fetch logs');
      }

      return response.data.data?.containerLogs || { logs: 'No logs available', timestamp: new Date().toISOString() };

    } catch (error) {
      console.error(`Error fetching logs for container ${containerName}:`, error.message);
      return {
        logs: `Error fetching logs: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new UnraidService();