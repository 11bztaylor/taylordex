const Docker = require('dockerode');
const { EventEmitter } = require('events');

/**
 * Docker Service - Manages Docker containers across multiple hosts
 * Supports local socket, remote TCP, and SSH connections
 */
class DockerService extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map();
    this.stats = new Map();
    this.monitoring = new Map();
  }

  /**
   * Add a Docker host connection
   * @param {string} name - Connection name
   * @param {Object} options - Connection options
   */
  async addDockerHost(name, options) {
    try {
      let docker;
      
      switch (options.type) {
        case 'socket':
          // Local Docker socket (most common for Unraid)
          docker = new Docker({ 
            socketPath: options.socketPath || '/var/run/docker.sock' 
          });
          break;
          
        case 'tcp':
          // Remote Docker TCP (requires Docker daemon config)
          docker = new Docker({
            host: options.host,
            port: options.port || 2375,
            protocol: options.tls ? 'https' : 'http',
            ...(options.tls && {
              ca: options.ca,
              cert: options.cert,
              key: options.key
            })
          });
          break;
          
        case 'ssh':
          // SSH connection (requires ssh agent)
          docker = new Docker({
            protocol: 'ssh',
            host: options.host,
            port: options.port || 22,
            username: options.username,
            ...(options.privateKey && { sshOptions: { privateKey: options.privateKey } })
          });
          break;
          
        default:
          throw new Error(`Unknown connection type: ${options.type}`);
      }
      
      // Test connection
      await docker.ping();
      const info = await docker.info();
      
      this.connections.set(name, {
        docker,
        options,
        info,
        connected: true,
        lastSeen: new Date()
      });
      
      // Start monitoring if requested
      if (options.monitor) {
        this.startMonitoring(name);
      }
      
      this.emit('host:connected', { name, info });
      
      return {
        success: true,
        message: `Docker host '${name}' connected successfully`,
        info: {
          version: info.ServerVersion,
          containers: info.Containers,
          images: info.Images,
          os: info.OperatingSystem
        }
      };
    } catch (error) {
      this.emit('host:error', { name, error: error.message });
      throw error;
    }
  }

  /**
   * Get all containers from a host
   * @param {string} hostName - Host name
   * @param {Object} options - List options
   */
  async getContainers(hostName, options = {}) {
    const connection = this.connections.get(hostName);
    if (!connection) throw new Error(`Host '${hostName}' not found`);
    
    try {
      const containers = await connection.docker.listContainers({
        all: options.all !== false,
        filters: options.filters
      });
      
      // Enhance with additional details
      const enhanced = await Promise.all(containers.map(async (container) => {
        const inspect = await connection.docker.getContainer(container.Id).inspect().catch(() => null);
        
        return {
          id: container.Id,
          name: container.Names[0].replace('/', ''),
          image: container.Image,
          imageId: container.ImageID,
          state: container.State,
          status: container.Status,
          created: new Date(container.Created * 1000),
          ports: this.formatPorts(container.Ports),
          labels: container.Labels,
          mounts: container.Mounts,
          networkMode: container.HostConfig?.NetworkMode,
          restartPolicy: inspect?.HostConfig?.RestartPolicy,
          environment: this.sanitizeEnvironment(inspect?.Config?.Env),
          health: inspect?.State?.Health,
          stats: this.stats.get(`${hostName}:${container.Id}`)
        };
      }));
      
      return enhanced;
    } catch (error) {
      this.emit('host:error', { name: hostName, error: error.message });
      throw error;
    }
  }

  /**
   * Control a container (start, stop, restart, etc.)
   * @param {string} hostName - Host name
   * @param {string} containerId - Container ID or name
   * @param {string} action - Action to perform
   */
  async controlContainer(hostName, containerId, action) {
    const connection = this.connections.get(hostName);
    if (!connection) throw new Error(`Host '${hostName}' not found`);
    
    const container = connection.docker.getContainer(containerId);
    
    try {
      let result;
      
      switch (action) {
        case 'start':
          result = await container.start();
          this.emit('container:started', { hostName, containerId });
          break;
          
        case 'stop':
          result = await container.stop({ t: 10 }); // 10 second timeout
          this.emit('container:stopped', { hostName, containerId });
          break;
          
        case 'restart':
          result = await container.restart({ t: 10 });
          this.emit('container:restarted', { hostName, containerId });
          break;
          
        case 'pause':
          result = await container.pause();
          this.emit('container:paused', { hostName, containerId });
          break;
          
        case 'unpause':
          result = await container.unpause();
          this.emit('container:unpaused', { hostName, containerId });
          break;
          
        case 'remove':
          result = await container.remove({ force: true, v: true });
          this.emit('container:removed', { hostName, containerId });
          break;
          
        case 'kill':
          result = await container.kill();
          this.emit('container:killed', { hostName, containerId });
          break;
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      return {
        success: true,
        action,
        containerId,
        result
      };
    } catch (error) {
      this.emit('container:error', { hostName, containerId, action, error: error.message });
      throw error;
    }
  }

  /**
   * Get container stats
   * @param {string} hostName - Host name
   * @param {string} containerId - Container ID
   */
  async getContainerStats(hostName, containerId) {
    const connection = this.connections.get(hostName);
    if (!connection) throw new Error(`Host '${hostName}' not found`);
    
    const container = connection.docker.getContainer(containerId);
    
    try {
      const stats = await container.stats({ stream: false });
      
      const processed = {
        cpu: this.calculateCPUPercent(stats),
        memory: this.calculateMemoryStats(stats),
        network: this.calculateNetworkStats(stats),
        blockIO: this.calculateBlockIOStats(stats),
        pids: stats.pids_stats?.current || 0,
        timestamp: new Date()
      };
      
      // Cache stats
      this.stats.set(`${hostName}:${containerId}`, processed);
      
      return processed;
    } catch (error) {
      if (error.statusCode === 409) {
        // Container not running
        return null;
      }
      throw error;
    }
  }

  /**
   * Get container logs
   * @param {string} hostName - Host name
   * @param {string} containerId - Container ID
   * @param {Object} options - Log options
   */
  async getContainerLogs(hostName, containerId, options = {}) {
    const connection = this.connections.get(hostName);
    if (!connection) throw new Error(`Host '${hostName}' not found`);
    
    const container = connection.docker.getContainer(containerId);
    
    try {
      const stream = await container.logs({
        stdout: true,
        stderr: true,
        tail: options.tail || 100,
        timestamps: true,
        follow: false,
        since: options.since || 0
      });
      
      return this.parseDockerLogs(stream);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Execute command in container
   * @param {string} hostName - Host name
   * @param {string} containerId - Container ID
   * @param {Array} cmd - Command to execute
   */
  async execInContainer(hostName, containerId, cmd) {
    const connection = this.connections.get(hostName);
    if (!connection) throw new Error(`Host '${hostName}' not found`);
    
    const container = connection.docker.getContainer(containerId);
    
    try {
      const exec = await container.exec({
        Cmd: cmd,
        AttachStdout: true,
        AttachStderr: true
      });
      
      const stream = await exec.start();
      const output = await new Promise((resolve, reject) => {
        let data = '';
        stream.on('data', chunk => data += chunk.toString());
        stream.on('end', () => resolve(data));
        stream.on('error', reject);
      });
      
      return {
        success: true,
        output
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new container
   * @param {string} hostName - Host name
   * @param {Object} config - Container configuration
   */
  async createContainer(hostName, config) {
    const connection = this.connections.get(hostName);
    if (!connection) throw new Error(`Host '${hostName}' not found`);
    
    try {
      // Pull image if needed
      if (config.pullImage !== false) {
        await this.pullImage(hostName, config.Image);
      }
      
      const container = await connection.docker.createContainer(config);
      
      this.emit('container:created', { 
        hostName, 
        containerId: container.id,
        name: config.name 
      });
      
      return {
        success: true,
        containerId: container.id,
        warnings: container.Warnings
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Pull Docker image
   * @param {string} hostName - Host name
   * @param {string} image - Image name
   */
  async pullImage(hostName, image) {
    const connection = this.connections.get(hostName);
    if (!connection) throw new Error(`Host '${hostName}' not found`);
    
    return new Promise((resolve, reject) => {
      connection.docker.pull(image, (err, stream) => {
        if (err) return reject(err);
        
        connection.docker.modem.followProgress(stream, (err, res) => {
          if (err) return reject(err);
          resolve(res);
        }, (event) => {
          this.emit('image:pull:progress', { hostName, image, event });
        });
      });
    });
  }

  /**
   * Start monitoring container stats
   * @param {string} hostName - Host name
   */
  startMonitoring(hostName) {
    if (this.monitoring.has(hostName)) return;
    
    const interval = setInterval(async () => {
      try {
        const containers = await this.getContainers(hostName, { all: false });
        
        for (const container of containers) {
          if (container.state === 'running') {
            await this.getContainerStats(hostName, container.id).catch(() => {});
          }
        }
      } catch (error) {
        console.error(`Monitoring error for ${hostName}:`, error.message);
      }
    }, 5000); // Every 5 seconds
    
    this.monitoring.set(hostName, interval);
  }

  /**
   * Stop monitoring
   * @param {string} hostName - Host name
   */
  stopMonitoring(hostName) {
    const interval = this.monitoring.get(hostName);
    if (interval) {
      clearInterval(interval);
      this.monitoring.delete(hostName);
    }
  }

  // Helper methods
  formatPorts(ports) {
    return ports.map(p => ({
      container: p.PrivatePort,
      host: p.PublicPort,
      protocol: p.Type,
      ip: p.IP || '0.0.0.0'
    }));
  }

  sanitizeEnvironment(env) {
    if (!env) return [];
    
    // Hide sensitive values
    const sensitive = ['PASSWORD', 'TOKEN', 'KEY', 'SECRET', 'API'];
    
    return env.map(e => {
      const [key, value] = e.split('=');
      const shouldHide = sensitive.some(s => key.toUpperCase().includes(s));
      
      return {
        key,
        value: shouldHide ? '********' : value
      };
    });
  }

  calculateCPUPercent(stats) {
    if (!stats.cpu_stats || !stats.precpu_stats) return 0;
    
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - 
                     stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - 
                        stats.precpu_stats.system_cpu_usage;
    const cpuCount = stats.cpu_stats.online_cpus || 1;
    
    if (systemDelta > 0 && cpuDelta > 0) {
      return ((cpuDelta / systemDelta) * cpuCount * 100).toFixed(2);
    }
    return 0;
  }

  calculateMemoryStats(stats) {
    if (!stats.memory_stats) return { used: 0, limit: 0, percent: 0 };
    
    const used = stats.memory_stats.usage - (stats.memory_stats.stats?.cache || 0);
    const limit = stats.memory_stats.limit;
    
    return {
      used,
      limit,
      percent: limit > 0 ? ((used / limit) * 100).toFixed(2) : 0,
      available: limit - used
    };
  }

  calculateNetworkStats(stats) {
    const networks = stats.networks || {};
    let rx = 0, tx = 0;
    
    Object.values(networks).forEach(net => {
      rx += net.rx_bytes || 0;
      tx += net.tx_bytes || 0;
    });
    
    return { rx, tx, interfaces: Object.keys(networks).length };
  }

  calculateBlockIOStats(stats) {
    const io = stats.blkio_stats?.io_service_bytes_recursive || [];
    let read = 0, write = 0;
    
    io.forEach(stat => {
      if (stat.op === 'Read') read += stat.value;
      if (stat.op === 'Write') write += stat.value;
    });
    
    return { read, write };
  }

  parseDockerLogs(buffer) {
    const logs = [];
    const lines = buffer.toString('utf8').split('\n').filter(line => line);
    
    lines.forEach(line => {
      // Docker log format: 8-byte header + content
      if (line.length > 8) {
        const content = line.substring(8);
        const match = content.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z)\s+(.*)$/);
        
        if (match) {
          logs.push({
            timestamp: match[1],
            message: match[2],
            stream: line.charCodeAt(0) === 1 ? 'stdout' : 'stderr'
          });
        } else {
          logs.push({
            timestamp: new Date().toISOString(),
            message: content,
            stream: 'unknown'
          });
        }
      }
    });
    
    return logs;
  }

  /**
   * Get all connected hosts
   */
  getHosts() {
    const hosts = [];
    
    for (const [name, connection] of this.connections) {
      hosts.push({
        name,
        type: connection.options.type,
        connected: connection.connected,
        lastSeen: connection.lastSeen,
        info: {
          version: connection.info?.ServerVersion,
          containers: connection.info?.Containers,
          images: connection.info?.Images,
          os: connection.info?.OperatingSystem
        }
      });
    }
    
    return hosts;
  }

  /**
   * Disconnect from a host
   * @param {string} hostName - Host name
   */
  disconnectHost(hostName) {
    this.stopMonitoring(hostName);
    this.connections.delete(hostName);
    
    // Clear cached stats
    for (const [key] of this.stats) {
      if (key.startsWith(`${hostName}:`)) {
        this.stats.delete(key);
      }
    }
    
    this.emit('host:disconnected', { name: hostName });
  }
}

module.exports = DockerService;