# Installation Guide

This guide covers detailed installation and setup instructions for TaylorDx Docker Dashboard.

## 📋 Prerequisites

### System Requirements
- **RAM**: Minimum 2GB, Recommended 4GB+
- **Storage**: Minimum 5GB free space
- **CPU**: Any modern CPU (ARM64 and x86_64 supported)
- **Network**: Access to services you want to monitor

### Required Software
- **Docker**: Version 20.0.0 or higher
- **Docker Compose**: Version 2.0.0 or higher
- **Git**: For cloning the repository

### Supported Platforms
- Linux (Ubuntu, Debian, CentOS, RHEL, etc.)
- macOS (Intel and Apple Silicon)
- Windows (with WSL2 recommended)
- Unraid, TrueNAS, Synology NAS

## 🚀 Quick Installation

### Method 1: Docker Compose (Recommended)

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd docker-dashboard
   ```

2. **Start the Application**
   ```bash
   docker-compose up -d
   ```

3. **Access the Dashboard**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Method 2: Docker Run Commands

```bash
# Create network
docker network create taylordx_network

# Start PostgreSQL
docker run -d \
  --name taylordx-postgres \
  --network taylordx_network \
  -e POSTGRES_DB=taylordx \
  -e POSTGRES_USER=taylordx \
  -e POSTGRES_PASSWORD=password \
  -v taylordx_postgres_data:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:15-alpine

# Start Redis
docker run -d \
  --name taylordx-redis \
  --network taylordx_network \
  -p 6379:6379 \
  redis:7-alpine

# Start Backend
docker run -d \
  --name taylordx-backend \
  --network taylordx_network \
  -e DATABASE_URL=postgresql://taylordx:password@taylordx-postgres:5432/taylordx \
  -e REDIS_URL=redis://taylordx-redis:6379 \
  -p 5000:5000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  taylordx-backend

# Start Frontend
docker run -d \
  --name taylordx-frontend \
  --network taylordx_network \
  -p 3000:3000 \
  taylordx-frontend
```

## 🔧 Advanced Installation

### Custom Configuration

1. **Environment Variables**
   Create `.env` file in the project root:
   ```env
   # Database Configuration
   DATABASE_URL=postgresql://taylordx:password@postgres:5432/taylordx
   POSTGRES_DB=taylordx
   POSTGRES_USER=taylordx
   POSTGRES_PASSWORD=your_secure_password
   
   # Redis Configuration
   REDIS_URL=redis://redis:6379
   
   # Application Configuration
   NODE_ENV=production
   PORT=5000
   FRONTEND_PORT=3000
   
   # Security
   JWT_SECRET=your_jwt_secret_here
   API_RATE_LIMIT=100
   ```

2. **Custom Docker Compose**
   ```yaml
   version: '3.8'
   
   services:
     postgres:
       image: postgres:15-alpine
       environment:
         POSTGRES_DB: ${POSTGRES_DB}
         POSTGRES_USER: ${POSTGRES_USER}
         POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
       volumes:
         - postgres_data:/var/lib/postgresql/data
         - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
       ports:
         - "5432:5432"
       restart: unless-stopped
   
     redis:
       image: redis:7-alpine
       ports:
         - "6379:6379"
       restart: unless-stopped
   
     backend:
       build: ./backend
       environment:
         DATABASE_URL: ${DATABASE_URL}
         REDIS_URL: ${REDIS_URL}
         NODE_ENV: ${NODE_ENV}
       ports:
         - "${PORT}:5000"
       volumes:
         - /var/run/docker.sock:/var/run/docker.sock:ro
       depends_on:
         - postgres
         - redis
       restart: unless-stopped
   
     frontend:
       build: ./frontend
       ports:
         - "${FRONTEND_PORT}:3000"
       depends_on:
         - backend
       restart: unless-stopped
   
   volumes:
     postgres_data:
   ```

### Network Configuration

1. **Reverse Proxy Setup (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
       
       location /api {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

2. **Traefik Configuration**
   ```yaml
   labels:
     - "traefik.enable=true"
     - "traefik.http.routers.taylordx.rule=Host(`taylordx.yourdomain.com`)"
     - "traefik.http.routers.taylordx.entrypoints=websecure"
     - "traefik.http.routers.taylordx.tls.certresolver=letsencrypt"
   ```

## 🛠️ Platform-Specific Installation

### Unraid Installation

1. **Install Community Applications plugin**
2. **Add Docker Container Template**
   ```xml
   <?xml version="1.0"?>
   <Container version="2">
     <Name>TaylorDx-Dashboard</Name>
     <Repository>taylordx/docker-dashboard</Repository>
     <Registry>https://hub.docker.com/r/taylordx/docker-dashboard</Registry>
     <Network>bridge</Network>
     <Privileged>false</Privileged>
     <Support/>
     <Overview>Docker service monitoring dashboard</Overview>
     <WebUI>http://[IP]:[PORT:3000]</WebUI>
     <TemplateURL/>
     <Icon>https://raw.githubusercontent.com/taylordx/docker-dashboard/main/docs/images/TDX_Night.png</Icon>
     <Config Name="WebUI Port" Target="3000" Default="3000" Mode="tcp" Description="Web interface port" Type="Port" Display="always" Required="true"/>
     <Config Name="API Port" Target="5000" Default="5000" Mode="tcp" Description="Backend API port" Type="Port" Display="always" Required="true"/>
     <Config Name="Docker Socket" Target="/var/run/docker.sock" Default="/var/run/docker.sock" Mode="ro" Description="Docker socket for container management" Type="Path" Display="always" Required="true"/>
   </Container>
   ```

### Synology NAS Installation

1. **Install Docker Package**
2. **Download Images**
   ```bash
   # SSH into Synology
   sudo docker pull postgres:15-alpine
   sudo docker pull redis:7-alpine
   sudo docker pull taylordx/docker-dashboard:backend
   sudo docker pull taylordx/docker-dashboard:frontend
   ```

3. **Create Stack in Container Manager**
   - Use the provided docker-compose.yml
   - Configure port mappings for your network

### TrueNAS Installation

1. **Enable Apps (TrueNAS SCALE)**
2. **Custom App Installation**
   ```yaml
   # Use the provided docker-compose.yml as a custom app
   # Map volumes to TrueNAS datasets
   ```

### Portainer Installation

1. **Add Stack**
   - Copy docker-compose.yml content
   - Configure environment variables
   - Deploy stack

## 🔐 Security Considerations

### Docker Socket Access
```bash
# Create docker group and add user (Linux)
sudo groupadd docker
sudo usermod -aG docker $USER

# For rootless Docker
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/docker.sock
```

### Network Security
```yaml
# Restrict network access
networks:
  taylordx_internal:
    driver: bridge
    internal: true
  taylordx_external:
    driver: bridge
```

### SSL/TLS Setup
```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout taylordx.key -out taylordx.crt
```

## 📊 Database Setup

### PostgreSQL Initialization
```sql
-- Custom database initialization
CREATE DATABASE taylordx;
CREATE USER taylordx WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE taylordx TO taylordx;

-- Additional indexes for performance
CREATE INDEX idx_services_type ON services(type);
CREATE INDEX idx_service_stats_service_id ON service_stats(service_id);
```

### Database Migrations
```bash
# Run migrations manually if needed
docker exec -it taylordx-backend npm run migrate
```

## 🔧 Post-Installation Setup

### 1. Verify Installation
```bash
# Check container status
docker-compose ps

# Check logs
docker-compose logs -f

# Test API endpoints
curl http://localhost:5000/api/health
```

### 2. Initial Configuration
1. Access web interface at http://localhost:3000
2. Add your first service using the "Add Service" button
3. Configure network discovery settings
4. Set up service API keys

### 3. Service Discovery
- Use automatic network discovery for quick setup
- Manual configuration for specific services
- Import existing configurations

## 🔍 Verification and Testing

### Health Checks
```bash
# Backend health
curl http://localhost:5000/api/health

# Frontend accessibility
curl -I http://localhost:3000

# Database connection
docker exec taylordx-postgres pg_isready -U taylordx
```

### Service Integration Test
```bash
# Test service addition
curl -X POST http://localhost:5000/api/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Service",
    "type": "radarr",
    "host": "192.168.1.100",
    "port": 7878,
    "apiKey": "your-api-key"
  }'
```

## 🚨 Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check port usage
   netstat -tulpn | grep :3000
   netstat -tulpn | grep :5000
   
   # Change ports in docker-compose.yml
   ```

2. **Permission Issues**
   ```bash
   # Fix Docker socket permissions
   sudo chmod 666 /var/run/docker.sock
   ```

3. **Database Connection**
   ```bash
   # Check database logs
   docker-compose logs postgres
   
   # Reset database
   docker-compose down -v
   docker-compose up -d
   ```

### Log Analysis
```bash
# View all logs
docker-compose logs

# Follow specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Debug mode
NODE_ENV=development docker-compose up
```

## 📈 Performance Optimization

### Resource Limits
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

### Database Tuning
```bash
# PostgreSQL performance tuning
echo "shared_preload_libraries = 'pg_stat_statements'" >> postgresql.conf
echo "max_connections = 100" >> postgresql.conf
echo "shared_buffers = 256MB" >> postgresql.conf
```

## 🔄 Updates and Maintenance

### Update Process
```bash
# Pull latest changes
git pull origin main

# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Or using images
docker-compose pull
docker-compose up -d
```

### Backup Strategy
```bash
# Database backup
docker exec taylordx-postgres pg_dump -U taylordx taylordx > backup.sql

# Volume backup
docker run --rm -v taylordx_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data
```

---

For additional help, see [Troubleshooting Guide](TROUBLESHOOTING.md) or [Configuration Guide](CONFIGURATION.md).