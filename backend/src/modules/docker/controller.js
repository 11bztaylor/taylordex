const DockerService = require('./DockerService');

/**
 * Docker Controller - Manages Docker containers across multiple hosts
 */
class DockerController {
  constructor() {
    this.dockerService = new DockerService();
  }

  /**
   * Add a new Docker host connection
   * POST /api/docker/hosts
   */
  addHost = async (req, res) => {
    try {
      const { name, type, ...options } = req.body;

      if (!name || !type) {
        return res.status(400).json({
          error: 'Name and type are required'
        });
      }

      const result = await this.dockerService.addDockerHost(name, { type, ...options });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to add Docker host',
        details: error.message
      });
    }
  };

  /**
   * Get all connected Docker hosts
   * GET /api/docker/hosts
   */
  getHosts = async (req, res) => {
    try {
      const hosts = this.dockerService.getHosts();
      
      res.json({
        success: true,
        hosts
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get Docker hosts',
        details: error.message
      });
    }
  };

  /**
   * Get containers from a specific host
   * GET /api/docker/hosts/:hostName/containers
   */
  getContainers = async (req, res) => {
    try {
      const { hostName } = req.params;
      const { all = true, filters } = req.query;

      const containers = await this.dockerService.getContainers(hostName, { 
        all: all === 'true' || all === true,
        filters: filters ? JSON.parse(filters) : undefined
      });
      
      res.json({
        success: true,
        hostName,
        containers
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get containers',
        details: error.message
      });
    }
  };

  /**
   * Control a container (start, stop, restart, etc.)
   * POST /api/docker/hosts/:hostName/containers/:containerId/:action
   */
  controlContainer = async (req, res) => {
    try {
      const { hostName, containerId, action } = req.params;

      const validActions = ['start', 'stop', 'restart', 'pause', 'unpause', 'remove', 'kill'];
      if (!validActions.includes(action)) {
        return res.status(400).json({
          error: `Invalid action. Valid actions: ${validActions.join(', ')}`
        });
      }

      const result = await this.dockerService.controlContainer(hostName, containerId, action);
      
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: `Failed to ${req.params.action} container`,
        details: error.message
      });
    }
  };

  /**
   * Get container stats
   * GET /api/docker/hosts/:hostName/containers/:containerId/stats
   */
  getContainerStats = async (req, res) => {
    try {
      const { hostName, containerId } = req.params;

      const stats = await this.dockerService.getContainerStats(hostName, containerId);
      
      if (stats === null) {
        return res.status(409).json({
          error: 'Container is not running'
        });
      }

      res.json({
        success: true,
        hostName,
        containerId,
        stats
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get container stats',
        details: error.message
      });
    }
  };

  /**
   * Get container logs
   * GET /api/docker/hosts/:hostName/containers/:containerId/logs
   */
  getContainerLogs = async (req, res) => {
    try {
      const { hostName, containerId } = req.params;
      const { tail = 100, since = 0 } = req.query;

      const logs = await this.dockerService.getContainerLogs(hostName, containerId, {
        tail: parseInt(tail),
        since: parseInt(since)
      });
      
      res.json({
        success: true,
        hostName,
        containerId,
        logs
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get container logs',
        details: error.message
      });
    }
  };

  /**
   * Execute command in container
   * POST /api/docker/hosts/:hostName/containers/:containerId/exec
   */
  execInContainer = async (req, res) => {
    try {
      const { hostName, containerId } = req.params;
      const { command } = req.body;

      if (!command || !Array.isArray(command)) {
        return res.status(400).json({
          error: 'Command must be an array of strings'
        });
      }

      const result = await this.dockerService.execInContainer(hostName, containerId, command);
      
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to execute command in container',
        details: error.message
      });
    }
  };

  /**
   * Create a new container
   * POST /api/docker/hosts/:hostName/containers
   */
  createContainer = async (req, res) => {
    try {
      const { hostName } = req.params;
      const config = req.body;

      if (!config.Image) {
        return res.status(400).json({
          error: 'Image is required'
        });
      }

      const result = await this.dockerService.createContainer(hostName, config);
      
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to create container',
        details: error.message
      });
    }
  };

  /**
   * Pull Docker image
   * POST /api/docker/hosts/:hostName/images/pull
   */
  pullImage = async (req, res) => {
    try {
      const { hostName } = req.params;
      const { image } = req.body;

      if (!image) {
        return res.status(400).json({
          error: 'Image name is required'
        });
      }

      // Set up SSE for progress updates
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      // Listen for progress events
      const progressHandler = (event) => {
        if (event.hostName === hostName && event.image === image) {
          res.write(`data: ${JSON.stringify({
            type: 'progress',
            ...event.event
          })}\n\n`);
        }
      };

      this.dockerService.on('image:pull:progress', progressHandler);

      try {
        await this.dockerService.pullImage(hostName, image);
        
        res.write(`data: ${JSON.stringify({
          type: 'complete',
          success: true,
          message: `Image ${image} pulled successfully`
        })}\n\n`);
      } catch (error) {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: error.message
        })}\n\n`);
      } finally {
        this.dockerService.off('image:pull:progress', progressHandler);
        res.end();
      }
    } catch (error) {
      res.status(500).json({
        error: 'Failed to pull image',
        details: error.message
      });
    }
  };

  /**
   * Start monitoring a host
   * POST /api/docker/hosts/:hostName/monitor/start
   */
  startMonitoring = async (req, res) => {
    try {
      const { hostName } = req.params;

      this.dockerService.startMonitoring(hostName);
      
      res.json({
        success: true,
        message: `Started monitoring host ${hostName}`
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to start monitoring',
        details: error.message
      });
    }
  };

  /**
   * Stop monitoring a host
   * POST /api/docker/hosts/:hostName/monitor/stop
   */
  stopMonitoring = async (req, res) => {
    try {
      const { hostName } = req.params;

      this.dockerService.stopMonitoring(hostName);
      
      res.json({
        success: true,
        message: `Stopped monitoring host ${hostName}`
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to stop monitoring',
        details: error.message
      });
    }
  };

  /**
   * Disconnect from a host
   * DELETE /api/docker/hosts/:hostName
   */
  disconnectHost = async (req, res) => {
    try {
      const { hostName } = req.params;

      this.dockerService.disconnectHost(hostName);
      
      res.json({
        success: true,
        message: `Disconnected from host ${hostName}`
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to disconnect from host',
        details: error.message
      });
    }
  };

  /**
   * Get real-time container updates via SSE
   * GET /api/docker/hosts/:hostName/stream
   */
  getContainerStream = async (req, res) => {
    try {
      const { hostName } = req.params;

      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      // Send initial connection message
      res.write(`data: ${JSON.stringify({
        type: 'connected',
        message: `Connected to ${hostName} event stream`
      })}\n\n`);

      // Set up event handlers
      const eventHandlers = {
        'host:connected': (data) => {
          if (data.name === hostName) {
            res.write(`data: ${JSON.stringify({ type: 'host:connected', ...data })}\n\n`);
          }
        },
        'host:error': (data) => {
          if (data.name === hostName) {
            res.write(`data: ${JSON.stringify({ type: 'host:error', ...data })}\n\n`);
          }
        },
        'container:started': (data) => {
          if (data.hostName === hostName) {
            res.write(`data: ${JSON.stringify({ type: 'container:started', ...data })}\n\n`);
          }
        },
        'container:stopped': (data) => {
          if (data.hostName === hostName) {
            res.write(`data: ${JSON.stringify({ type: 'container:stopped', ...data })}\n\n`);
          }
        },
        'container:created': (data) => {
          if (data.hostName === hostName) {
            res.write(`data: ${JSON.stringify({ type: 'container:created', ...data })}\n\n`);
          }
        },
        'container:removed': (data) => {
          if (data.hostName === hostName) {
            res.write(`data: ${JSON.stringify({ type: 'container:removed', ...data })}\n\n`);
          }
        }
      };

      // Register event listeners
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        this.dockerService.on(event, handler);
      });

      // Clean up on disconnect
      req.on('close', () => {
        Object.entries(eventHandlers).forEach(([event, handler]) => {
          this.dockerService.off(event, handler);
        });
      });

    } catch (error) {
      res.status(500).json({
        error: 'Failed to establish event stream',
        details: error.message
      });
    }
  };
}

module.exports = new DockerController();