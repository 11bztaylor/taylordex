const BaseService = require('../../utils/baseService');
const WebSocket = require('ws');
const EventEmitter = require('events');

class HomeAssistantService extends BaseService {
  constructor() {
    super('HomeAssistant');
    this.wsConnection = null;
    this.isConnected = false;
    this.eventEmitter = new EventEmitter();
    this.entities = new Map();
    this.messageId = 1;
    this.pendingRequests = new Map();
  }

  getHeaders(config) {
    return {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  async testConnection(config) {
    try {
      const url = this.buildUrl(config.host, config.port, '/api/');
      const response = await this.axios.get(url, {
        headers: this.getHeaders(config)
      });
      
      return {
        success: true,
        version: response.data.version || 'Unknown',
        message: `Connected to Home Assistant ${response.data.version}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error.response?.data?.message || 'Connection failed'
      };
    }
  }

  async getStats(config) {
    try {
      // Get basic system info
      const [configData, states, services] = await Promise.all([
        this.apiCall(config, '/api/config'),
        this.apiCall(config, '/api/states'),
        this.apiCall(config, '/api/services')
      ]);

      // Count entities by domain
      const entityCounts = {};
      const deviceStates = {
        online: 0,
        offline: 0,
        unavailable: 0
      };

      states.forEach(entity => {
        const domain = entity.entity_id.split('.')[0];
        entityCounts[domain] = (entityCounts[domain] || 0) + 1;

        // Count device states
        switch (entity.state) {
          case 'on':
          case 'home':
          case 'open':
            deviceStates.online++;
            break;
          case 'off':
          case 'away':
          case 'closed':
            deviceStates.offline++;
            break;
          case 'unavailable':
          case 'unknown':
            deviceStates.unavailable++;
            break;
        }
      });

      // Get automations count
      const automations = states.filter(e => e.entity_id.startsWith('automation.')).length;
      const scripts = states.filter(e => e.entity_id.startsWith('script.')).length;

      return {
        version: configData.version,
        location: configData.location_name,
        entities: {
          total: states.length,
          counts: entityCounts
        },
        devices: deviceStates,
        automations: {
          total: automations,
          enabled: states.filter(e => 
            e.entity_id.startsWith('automation.') && e.state === 'on'
          ).length
        },
        scripts: scripts,
        services: Object.keys(services).length,
        uptime: this.calculateUptime(configData),
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      console.error('HomeAssistant stats error:', error);
      throw error;
    }
  }

  calculateUptime(configData) {
    // Home Assistant doesn't directly provide uptime, estimate from version info
    return 'Available via WebSocket connection';
  }

  // WebSocket Implementation
  async connectWebSocket(config) {
    if (this.wsConnection && this.isConnected) {
      return true;
    }

    try {
      const wsUrl = `ws://${config.host}:${config.port}/api/websocket`;
      this.wsConnection = new WebSocket(wsUrl);

      return new Promise((resolve, reject) => {
        let authSent = false;

        this.wsConnection.on('open', () => {
          console.log('HomeAssistant WebSocket connected');
        });

        this.wsConnection.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'auth_required' && !authSent) {
            // Send authentication
            this.sendMessage({
              type: 'auth',
              access_token: config.apiKey
            });
            authSent = true;
          } else if (message.type === 'auth_ok') {
            this.isConnected = true;
            
            // Subscribe to state changes
            this.sendMessage({
              id: this.messageId++,
              type: 'subscribe_events',
              event_type: 'state_changed'
            });

            resolve(true);
          } else if (message.type === 'auth_invalid') {
            reject(new Error('Invalid Home Assistant token'));
          } else if (message.type === 'event') {
            this.handleStateChange(message.event);
          } else if (message.id && this.pendingRequests.has(message.id)) {
            // Handle response to our request
            const { resolve: resolveRequest, reject: rejectRequest } = this.pendingRequests.get(message.id);
            this.pendingRequests.delete(message.id);
            
            if (message.success) {
              resolveRequest(message.result);
            } else {
              rejectRequest(new Error(message.error?.message || 'Request failed'));
            }
          }
        });

        this.wsConnection.on('error', (error) => {
          console.error('HomeAssistant WebSocket error:', error);
          this.isConnected = false;
          reject(error);
        });

        this.wsConnection.on('close', () => {
          console.log('HomeAssistant WebSocket disconnected');
          this.isConnected = false;
          // Auto-reconnect after 5 seconds
          setTimeout(() => this.connectWebSocket(config), 5000);
        });
      });
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      throw error;
    }
  }

  sendMessage(message) {
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify(message));
    }
  }

  async sendWebSocketCommand(command) {
    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      this.pendingRequests.set(id, { resolve, reject });
      
      this.sendMessage({
        id,
        ...command
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('WebSocket command timeout'));
        }
      }, 10000);
    });
  }

  handleStateChange(event) {
    if (event.data && event.data.entity_id) {
      const entity = event.data.new_state;
      this.entities.set(entity.entity_id, entity);
      
      // Emit event for real-time updates
      this.eventEmitter.emit('entityChanged', {
        entity_id: entity.entity_id,
        state: entity.state,
        attributes: entity.attributes,
        last_changed: entity.last_changed
      });
    }
  }

  // Service Control Methods
  async callService(config, domain, service, entityId = null, serviceData = {}) {
    const data = {
      domain,
      service,
      service_data: serviceData
    };

    if (entityId) {
      data.service_data.entity_id = entityId;
    }

    if (this.isConnected) {
      // Use WebSocket for real-time response
      return this.sendWebSocketCommand({
        type: 'call_service',
        domain,
        service,
        service_data: data.service_data
      });
    } else {
      // Fallback to REST API
      return this.apiCall(config, '/api/services/' + domain + '/' + service, 'POST', data.service_data);
    }
  }

  // Common Home Assistant Commands
  async turnOnLight(config, entityId, brightness = null, color = null) {
    const serviceData = { entity_id: entityId };
    
    if (brightness !== null) {
      serviceData.brightness = brightness;
    }
    
    if (color !== null) {
      serviceData.rgb_color = color;
    }

    return this.callService(config, 'light', 'turn_on', null, serviceData);
  }

  async turnOffLight(config, entityId) {
    return this.callService(config, 'light', 'turn_off', entityId);
  }

  async runAutomation(config, entityId) {
    return this.callService(config, 'automation', 'trigger', entityId);
  }

  async runScript(config, entityId) {
    return this.callService(config, 'script', 'turn_on', entityId);
  }

  async executeShellCommand(config, command) {
    // Use Home Assistant's shell_command service
    return this.callService(config, 'shell_command', command);
  }

  async restartHomeAssistant(config) {
    return this.callService(config, 'homeassistant', 'restart');
  }

  async reloadConfiguration(config) {
    return this.callService(config, 'homeassistant', 'reload_core_config');
  }

  // Enhanced Stats for Real-time Dashboard
  async getEnhancedStats(config) {
    try {
      const basicStats = await this.getStats(config);
      
      if (this.isConnected) {
        // Get real-time entity states
        const currentStates = Array.from(this.entities.values());
        
        // Calculate recent activity (entities changed in last hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const recentActivity = currentStates.filter(entity => 
          entity.last_changed > oneHourAgo
        ).length;

        return {
          ...basicStats,
          realTime: {
            connected: true,
            entitiesTracked: this.entities.size,
            recentActivity,
            connectionUptime: this.isConnected ? 'Connected' : 'Disconnected'
          }
        };
      }

      return basicStats;
    } catch (error) {
      console.error('Enhanced stats error:', error);
      throw error;
    }
  }

  // Get specific entity states
  async getEntityStates(config, entityIds = []) {
    if (entityIds.length === 0) {
      return this.apiCall(config, '/api/states');
    }

    const states = await Promise.all(
      entityIds.map(id => this.apiCall(config, `/api/states/${id}`))
    );
    
    return states;
  }

  // Cleanup
  disconnect() {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
      this.isConnected = false;
    }
    this.entities.clear();
    this.pendingRequests.clear();
  }
}

module.exports = HomeAssistantService;