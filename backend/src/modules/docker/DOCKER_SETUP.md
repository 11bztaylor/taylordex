# Docker Integration Setup Guide

## 🚀 **Complete Docker Management Implementation**

TaylorDex now includes comprehensive Docker container management across multiple hosts! Here's everything you need to know about the implementation and setup.

## 📦 **What's Been Implemented**

### **1. DockerService Class** (`DockerService.js`)
- **Multi-host container management** - Connect to multiple Docker hosts simultaneously
- **Multiple connection types** - Socket, TCP, SSH, and Portainer agent support
- **Real-time monitoring** - Container stats, events, and health monitoring
- **Container lifecycle management** - Start, stop, restart, pause, unpause, remove, kill
- **Image management** - Pull images with progress tracking
- **Log collection** - Retrieve container logs with filtering
- **Command execution** - Execute commands inside containers
- **Event-driven architecture** - Real-time updates via EventEmitter

### **2. REST API Endpoints** (`controller.js` & `routes.js`)
All endpoints are now available at `/api/docker/`:

#### **Host Management**
```bash
POST   /api/docker/hosts                    # Add Docker host
GET    /api/docker/hosts                    # List all hosts  
DELETE /api/docker/hosts/:hostName          # Disconnect host
```

#### **Container Management**
```bash
GET    /api/docker/hosts/:hostName/containers                    # List containers
POST   /api/docker/hosts/:hostName/containers/:id/:action        # Control container
GET    /api/docker/hosts/:hostName/containers/:id/stats          # Get stats
GET    /api/docker/hosts/:hostName/containers/:id/logs           # Get logs
POST   /api/docker/hosts/:hostName/containers/:id/exec           # Execute command
POST   /api/docker/hosts/:hostName/containers                    # Create container
```

#### **Image & Monitoring**
```bash
POST   /api/docker/hosts/:hostName/images/pull                   # Pull image
POST   /api/docker/hosts/:hostName/monitor/start                 # Start monitoring
POST   /api/docker/hosts/:hostName/monitor/stop                  # Stop monitoring
GET    /api/docker/hosts/:hostName/stream                        # Real-time events
```

### **3. Backend Integration**
- ✅ Routes integrated into main Express app
- ✅ dockerode dependency added to package.json
- ✅ Backend rebuilt with Docker API support
- ✅ Health endpoint updated to show Docker module

## 🔧 **Setup Instructions**

### **Option 1: Docker Socket Mount (Recommended for Local)**

1. **Update docker-compose.yml** (✅ Already done):
```yaml
backend:
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock:ro
```

2. **Add a local Docker host**:
```bash
curl -X POST http://localhost:5000/api/docker/hosts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "local",
    "type": "socket",
    "socketPath": "/var/run/docker.sock",
    "monitor": true
  }'
```

### **Option 2: Remote Docker API (For External Hosts)**

1. **Enable Docker TCP on target host**:
```bash
# /etc/docker/daemon.json
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2375"]
}
```

2. **Add remote Docker host**:
```bash
curl -X POST http://localhost:5000/api/docker/hosts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "unraid-server",
    "type": "tcp",
    "host": "192.168.1.100",
    "port": 2375,
    "monitor": true
  }'
```

### **Option 3: Portainer Agent (Most Flexible)**

1. **Deploy Portainer Agent on target host**:
```yaml
version: '3.8'
services:
  portainer_agent:
    image: portainer/agent:latest
    ports:
      - "9001:9001"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
```

2. **Add Portainer host**:
```bash
curl -X POST http://localhost:5000/api/docker/hosts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "portainer-host",
    "type": "portainer",
    "host": "192.168.1.100",
    "port": 9001,
    "monitor": true
  }'
```

## 🧪 **Testing the API**

### **1. Check Docker Module Status**
```bash
curl http://localhost:5000/api/health
# Should show "docker" in modules array
```

### **2. List Docker Hosts**
```bash
curl http://localhost:5000/api/docker/hosts
```

### **3. Get Containers** (after adding a host)
```bash
curl http://localhost:5000/api/docker/hosts/local/containers
```

### **4. Control a Container**
```bash
# Start container
curl -X POST http://localhost:5000/api/docker/hosts/local/containers/myapp/start

# Stop container  
curl -X POST http://localhost:5000/api/docker/hosts/local/containers/myapp/stop

# Get container stats
curl http://localhost:5000/api/docker/hosts/local/containers/myapp/stats
```

### **5. Stream Real-time Updates**
```bash
curl http://localhost:5000/api/docker/hosts/local/stream
# This will provide Server-Sent Events for real-time container updates
```

## 🐛 **Troubleshooting**

### **Socket Permission Issues (WSL2/Docker Desktop)**
If you get "connect ENOENT /var/run/docker.sock":

1. **Ensure Docker Desktop is running**
2. **Check WSL2 integration is enabled** in Docker Desktop settings
3. **Try restarting Docker Desktop**
4. **Alternative**: Use Docker Context:
```bash
# Inside container
docker context ls
export DOCKER_HOST=unix:///var/run/docker.sock
```

### **Remote API Connection Issues**
- Ensure firewall allows port 2375/2376
- For production, use TLS (port 2376) with certificates
- Test connection: `curl http://host:2375/version`

### **Container Already Exists**
Our API handles existing containers gracefully - you can manage any container that Docker can see.

## 📊 **Example Responses**

### **Container List Response**
```json
{
  "success": true,
  "hostName": "local",
  "containers": [{
    "id": "abc123",
    "name": "taylordx-backend",
    "image": "docker-dashboard-backend",
    "state": "running",
    "status": "Up 2 hours",
    "ports": [{"container": 5000, "host": 5000, "protocol": "tcp"}],
    "created": "2024-08-05T10:30:00.000Z",
    "stats": {
      "cpu": "2.5",
      "memory": {"used": 67108864, "limit": 2147483648, "percent": "3.12"}
    }
  }]
}
```

### **Container Stats Response**
```json
{
  "success": true,
  "stats": {
    "cpu": "1.23",
    "memory": {"used": 67108864, "limit": 2147483648, "percent": "3.12"},
    "network": {"rx": 1024, "tx": 2048},
    "blockIO": {"read": 4096, "write": 8192},
    "pids": 15,
    "timestamp": "2024-08-05T10:35:00.000Z"
  }
}
```

## 🎯 **Next Steps**

1. **Frontend Components** - Create React components for Docker management
2. **Dashboard Integration** - Add Docker widgets to main dashboard  
3. **Container Templates** - Quick-deploy common container configurations
4. **Compose Support** - Docker Compose file management
5. **Volume Management** - Docker volume operations
6. **Network Management** - Docker network operations

## 🔒 **Security Features**

- **Read-only socket mounting** by default
- **Environment variable sanitization** (hides passwords/keys)
- **Container action logging** via EventEmitter
- **Role-based access control** ready for implementation
- **TLS support** for remote connections

## 💡 **Usage Examples**

The Docker integration enables you to:
- **Monitor all your Docker containers** from one dashboard
- **Start/stop containers** across multiple hosts
- **View real-time resource usage** (CPU, memory, network)  
- **Access container logs** with filtering
- **Execute commands** in running containers
- **Pull new images** with progress tracking
- **Get instant notifications** when containers start/stop/fail

Perfect for managing Unraid Docker containers, VPS containers, and any other Docker hosts in your homelab! 🏠

---

**The complete Docker management system is ready to use!** 🎉

Just add your Docker hosts and start managing containers through the TaylorDex API.