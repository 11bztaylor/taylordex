const HomeAssistantService = require('./service');

const homeAssistantService = new HomeAssistantService();

class HomeAssistantController {
  
  // Test connection
  async testConnection(req, res) {
    try {
      const config = req.body;
      const result = await homeAssistantService.testConnection(config);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get basic stats
  async getStats(req, res) {
    try {
      const { id } = req.params;
      const service = req.services?.find(s => s.id == id);
      
      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }

      const stats = await homeAssistantService.getStats(service);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get enhanced stats with real-time data
  async getEnhancedStats(req, res) {
    try {
      const { id } = req.params;
      const service = req.services?.find(s => s.id == id);
      
      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }

      const stats = await homeAssistantService.getEnhancedStats(service);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Connect WebSocket
  async connectWebSocket(req, res) {
    try {
      const { id } = req.params;
      const service = req.services?.find(s => s.id == id);
      
      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }

      const connected = await homeAssistantService.connectWebSocket(service);
      res.json({ 
        success: connected,
        message: connected ? 'WebSocket connected' : 'Failed to connect WebSocket'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Call Home Assistant service
  async callService(req, res) {
    try {
      const { id } = req.params;
      const { domain, service, entityId, serviceData } = req.body;
      
      const serviceConfig = req.services?.find(s => s.id == id);
      if (!serviceConfig) {
        return res.status(404).json({ error: 'Service not found' });
      }

      const result = await homeAssistantService.callService(
        serviceConfig, 
        domain, 
        service, 
        entityId, 
        serviceData
      );
      
      res.json({ 
        success: true, 
        result,
        message: `Called ${domain}.${service}` 
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Light controls
  async controlLight(req, res) {
    try {
      const { id } = req.params;
      const { entityId, action, brightness, color } = req.body;
      
      const service = req.services?.find(s => s.id == id);
      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }

      let result;
      if (action === 'turn_on') {
        result = await homeAssistantService.turnOnLight(service, entityId, brightness, color);
      } else if (action === 'turn_off') {
        result = await homeAssistantService.turnOffLight(service, entityId);
      } else {
        return res.status(400).json({ error: 'Invalid action. Use turn_on or turn_off' });
      }

      res.json({ 
        success: true, 
        result,
        message: `Light ${entityId} ${action}` 
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Automation controls
  async runAutomation(req, res) {
    try {
      const { id } = req.params;
      const { entityId } = req.body;
      
      const service = req.services?.find(s => s.id == id);
      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }

      const result = await homeAssistantService.runAutomation(service, entityId);
      res.json({ 
        success: true, 
        result,
        message: `Automation ${entityId} triggered` 
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Script controls
  async runScript(req, res) {
    try {
      const { id } = req.params;
      const { entityId } = req.body;
      
      const service = req.services?.find(s => s.id == id);
      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }

      const result = await homeAssistantService.runScript(service, entityId);
      res.json({ 
        success: true, 
        result,
        message: `Script ${entityId} executed` 
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // System controls
  async systemControl(req, res) {
    try {
      const { id } = req.params;
      const { action } = req.body;
      
      const service = req.services?.find(s => s.id == id);
      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }

      let result;
      let message;

      switch (action) {
        case 'restart':
          result = await homeAssistantService.restartHomeAssistant(service);
          message = 'Home Assistant restart initiated';
          break;
        case 'reload_config':
          result = await homeAssistantService.reloadConfiguration(service);
          message = 'Configuration reloaded';
          break;
        default:
          return res.status(400).json({ error: 'Invalid action' });
      }

      res.json({ 
        success: true, 
        result,
        message 
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Execute shell command
  async executeCommand(req, res) {
    try {
      const { id } = req.params;
      const { command } = req.body;
      
      const service = req.services?.find(s => s.id == id);
      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }

      const result = await homeAssistantService.executeShellCommand(service, command);
      res.json({ 
        success: true, 
        result,
        message: `Command '${command}' executed` 
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get entity states
  async getEntityStates(req, res) {
    try {
      const { id } = req.params;
      const { entities } = req.query; // comma-separated entity IDs
      
      const service = req.services?.find(s => s.id == id);
      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }

      const entityIds = entities ? entities.split(',') : [];
      const states = await homeAssistantService.getEntityStates(service, entityIds);
      
      res.json({ 
        success: true,
        states,
        count: states.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Get WebSocket connection status
  async getConnectionStatus(req, res) {
    try {
      res.json({
        connected: homeAssistantService.isConnected,
        entitiesTracked: homeAssistantService.entities.size,
        lastUpdate: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new HomeAssistantController();