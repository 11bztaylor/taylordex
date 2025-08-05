# Unraid & Docker Integration Plan

## 🚀 **Unraid Integration Options**

### **1. Unraid API Plugin (Recommended)**
The Unraid API provides REST endpoints for system management without SSH:

```bash
# Install Unraid API plugin from Community Applications
# Provides endpoints like:
GET /api/system/info
GET /api/docker/containers
GET /api/array/status
GET /api/shares
POST /api/docker/container/{name}/start
POST /api/docker/container/{name}/stop
```

### **2. Docker Socket Mounting (Direct Access)**
Mount the Docker socket into TaylorDex container:

```yaml
# docker-compose.yml addition
services:
  backend:
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - DOCKER_HOST=unix:///var/run/docker.sock
```

This enables:
- Direct Docker API access
- No SSH needed
- Real-time container stats
- Start/stop/restart containers
- View logs directly

### **3. Docker Remote API (Network Access)**
Enable Docker TCP socket for remote access:

```bash
# On Docker host, enable TCP socket
# /etc/docker/daemon.json
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2375"]
}
```

Security options:
- Use TLS certificates for secure access
- Restrict to local network only
- Use Docker Context for authentication

### **4. Portainer Agent (Lightweight)**
Deploy Portainer Agent on each Docker host:

```yaml
# On each Docker host
services:
  portainer_agent:
    image: portainer/agent:latest
    ports:
      - "9001:9001"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
```

Benefits:
- Secure agent-based access
- No SSH required
- Minimal resource usage
- Supports multiple Docker hosts

## 📊 **Implementation Strategy**

### **Phase 1: Unraid API Integration**
```javascript
// UnraidService.js
class UnraidService extends BaseService {
  async getSystemInfo(config) {
    const response = await this.apiCall(config, '/api/system/info');
    return {
      version: response.version,
      uptime: response.uptime,
      model: response.model,
      cpu: response.cpu,
      memory: response.memory
    };
  }
  
  async getDockerContainers(config) {
    const response = await this.apiCall(config, '/api/docker/containers');
    return response.containers.map(container => ({
      id: container.Id,
      name: container.Name,
      state: container.State,
      status: container.Status,
      image: container.Image,
      ports: container.Ports,
      created: container.Created
    }));
  }
  
  async controlContainer(config, containerName, action) {
    return await this.apiCall(
      config, 
      `/api/docker/container/${containerName}/${action}`,
      'POST'
    );
  }
}
```

### **Phase 2: Docker API Integration**
```javascript
// DockerService.js
const Docker = require('dockerode');

class DockerService {
  constructor() {
    // Multiple connection options
    this.connections = new Map();
  }
  
  addDockerHost(name, options) {
    let docker;
    
    if (options.type === 'socket') {
      // Local socket connection
      docker = new Docker({ socketPath: '/var/run/docker.sock' });
    } else if (options.type === 'tcp') {
      // Remote TCP connection
      docker = new Docker({
        host: options.host,
        port: options.port || 2375,
        ca: options.ca,
        cert: options.cert,
        key: options.key
      });
    } else if (options.type === 'portainer') {
      // Portainer agent connection
      docker = new DockerPortainerAdapter(options);
    }
    
    this.connections.set(name, docker);
  }
  
  async getContainers(hostName) {
    const docker = this.connections.get(hostName);
    const containers = await docker.listContainers({ all: true });
    
    return containers.map(container => ({
      id: container.Id,
      name: container.Names[0].replace('/', ''),
      image: container.Image,
      state: container.State,
      status: container.Status,
      ports: container.Ports,
      created: new Date(container.Created * 1000),
      labels: container.Labels
    }));
  }
  
  async getContainerStats(hostName, containerId) {
    const docker = this.connections.get(hostName);
    const container = docker.getContainer(containerId);
    const stats = await container.stats({ stream: false });
    
    return {
      cpu: this.calculateCPUPercent(stats),
      memory: this.calculateMemoryUsage(stats),
      network: this.calculateNetworkStats(stats),
      blockIO: stats.blkio_stats
    };
  }
  
  async controlContainer(hostName, containerId, action) {
    const docker = this.connections.get(hostName);
    const container = docker.getContainer(containerId);
    
    switch(action) {
      case 'start':
        return await container.start();
      case 'stop':
        return await container.stop();
      case 'restart':
        return await container.restart();
      case 'pause':
        return await container.pause();
      case 'unpause':
        return await container.unpause();
    }
  }
  
  async getContainerLogs(hostName, containerId, options = {}) {
    const docker = this.connections.get(hostName);
    const container = docker.getContainer(containerId);
    
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: options.tail || 100,
      timestamps: true
    });
    
    return this.parseDockerLogs(logs);
  }
}
```

### **Phase 3: Multi-Host Dashboard**
```javascript
// Enhanced UI for Docker management
const DockerHostDashboard = () => {
  return (
    <div className="docker-hosts-grid">
      {dockerHosts.map(host => (
        <DockerHostCard key={host.id}>
          <h3>{host.name}</h3>
          <div className="stats">
            <div>Containers: {host.containerCount}</div>
            <div>Running: {host.runningCount}</div>
            <div>CPU: {host.cpuUsage}%</div>
            <div>Memory: {host.memoryUsage}%</div>
          </div>
          <div className="containers">
            {host.containers.map(container => (
              <ContainerCard 
                key={container.id}
                container={container}
                onAction={(action) => handleContainerAction(host.id, container.id, action)}
              />
            ))}
          </div>
        </DockerHostCard>
      ))}
    </div>
  );
};
```

## 🔒 **Security Best Practices**

### **1. Read-Only Access by Default**
```yaml
# Mount socket as read-only
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
```

### **2. Use Docker Secrets**
```yaml
# Store credentials securely
secrets:
  docker_tls_ca:
    file: ./certs/ca.pem
  docker_tls_cert:
    file: ./certs/cert.pem
  docker_tls_key:
    file: ./certs/key.pem
```

### **3. Network Isolation**
```yaml
# Create isolated network for management
networks:
  management:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

### **4. RBAC Implementation**
```javascript
// Role-based container control
const canControlContainer = (user, container, action) => {
  if (user.role === 'admin') return true;
  if (user.role === 'operator' && ['start', 'stop', 'restart'].includes(action)) return true;
  if (user.role === 'viewer') return false;
  return false;
};
```

## 📦 **NPM Packages Needed**

```json
{
  "dockerode": "^3.3.5",        // Docker API client
  "node-unraid": "^1.0.0",      // Unraid API client (if available)
  "ws": "^8.16.0",              // WebSocket for real-time updates
  "docker-stats": "^1.0.0"      // Container stats parsing
}
```

## 🎯 **Quick Implementation Path**

### **Option 1: Socket Mount (Fastest)**
1. Add socket mount to docker-compose
2. Install dockerode
3. Create DockerService class
4. Add container management endpoints
5. Build UI for container control

### **Option 2: Portainer Agent (Most Flexible)**
1. Deploy Portainer agents on each host
2. Connect via Portainer API
3. Aggregate data in TaylorDex
4. Unified management interface

### **Option 3: Unraid API (Most Native)**
1. Install Unraid API plugin
2. Configure API access
3. Build Unraid-specific features
4. Integrate with existing services

## 💡 **Advanced Features**

### **Container Auto-Discovery**
```javascript
// Automatically detect and categorize containers
const categorizeContainer = (container) => {
  const labels = container.labels;
  const image = container.image.toLowerCase();
  
  if (image.includes('radarr')) return { type: 'radarr', category: 'media' };
  if (image.includes('sonarr')) return { type: 'sonarr', category: 'media' };
  if (image.includes('plex')) return { type: 'plex', category: 'media' };
  if (image.includes('postgres')) return { type: 'database', category: 'infrastructure' };
  
  return { type: 'unknown', category: 'other' };
};
```

### **Container Templates**
```javascript
// Quick-deploy templates
const containerTemplates = {
  radarr: {
    image: 'lscr.io/linuxserver/radarr:latest',
    environment: {
      PUID: 1000,
      PGID: 1000,
      TZ: 'America/New_York'
    },
    volumes: [
      '/config:/config',
      '/movies:/movies',
      '/downloads:/downloads'
    ],
    ports: ['7878:7878']
  }
};
```

### **Health Monitoring**
```javascript
// Container health checks
const checkContainerHealth = async (container) => {
  const inspect = await container.inspect();
  
  return {
    healthy: inspect.State.Health?.Status === 'healthy',
    running: inspect.State.Running,
    restartCount: inspect.RestartCount,
    uptime: Date.now() - new Date(inspect.State.StartedAt),
    exitCode: inspect.State.ExitCode
  };
};
```

## 🚀 **Next Steps**

1. **Choose Integration Method**: Socket mount vs Remote API vs Portainer
2. **Install Dependencies**: dockerode and related packages
3. **Create Service Module**: Build Docker/Unraid service classes
4. **Add API Endpoints**: Container management routes
5. **Build UI Components**: Container cards with actions
6. **Test Security**: Ensure proper access control

**Which approach interests you most? Socket mounting would be the quickest to implement!**