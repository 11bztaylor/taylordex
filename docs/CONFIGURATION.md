# Configuration Guide

This guide covers detailed configuration options for TaylorDx Docker Dashboard, including service integrations, environment variables, and advanced settings.

## 🔧 Environment Configuration

### Core Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://taylordx:password@postgres:5432/taylordx
POSTGRES_DB=taylordx
POSTGRES_USER=taylordx
POSTGRES_PASSWORD=your_secure_password

# Redis Configuration (for caching and sessions)
REDIS_URL=redis://redis:6379

# Application Configuration
NODE_ENV=production
PORT=5000
FRONTEND_PORT=3000

# Security
JWT_SECRET=your_jwt_secret_here_minimum_32_characters
API_RATE_LIMIT=100
CORS_ORIGIN=http://localhost:3000

# Docker Integration
DOCKER_SOCKET_PATH=/var/run/docker.sock
DOCKER_API_VERSION=1.41

# Logging
LOG_LEVEL=info
LOG_FORMAT=combined

# Feature Flags
ENABLE_NETWORK_DISCOVERY=true
ENABLE_DOCKER_MANAGEMENT=true
ENABLE_REAL_TIME_UPDATES=true
```

### Development vs Production

**Development (.env.development)**
```env
NODE_ENV=development
LOG_LEVEL=debug
CORS_ORIGIN=*
DATABASE_URL=postgresql://taylordx:password@localhost:5432/taylordx_dev
```

**Production (.env.production)**
```env
NODE_ENV=production
LOG_LEVEL=warn
CORS_ORIGIN=https://your-domain.com
DATABASE_URL=postgresql://taylordx:secure_password@postgres:5432/taylordx
JWT_SECRET=your_very_secure_jwt_secret_at_least_32_characters_long
```

## 🎯 Service Integrations

### Supported Services and Configuration

#### Radarr (Movie Management)
```json
{
  "name": "Radarr",
  "type": "radarr",
  "host": "192.168.1.100",
  "port": 7878,
  "apiKey": "your-radarr-api-key",
  "ssl": false,
  "testEndpoint": "/api/v3/system/status"
}
```

**API Key Location**: Settings → General → Security → API Key

**Required Permissions**:
- Read access to system status
- Read access to movies and queue
- Read access to disk space information

#### Sonarr (TV Series Management)
```json
{
  "name": "Sonarr",
  "type": "sonarr", 
  "host": "192.168.1.101",
  "port": 8989,
  "apiKey": "your-sonarr-api-key",
  "ssl": false,
  "testEndpoint": "/api/v3/system/status"
}
```

**API Key Location**: Settings → General → Security → API Key

#### Plex Media Server
```json
{
  "name": "Plex",
  "type": "plex",
  "host": "192.168.1.102", 
  "port": 32400,
  "apiKey": "your-plex-token",
  "ssl": false,
  "testEndpoint": "/identity"
}
```

**Token Location**: Account → Plex Web → More → Account → Privacy & Online Media Sources → Show Advanced → Get Token

#### Prowlarr (Indexer Management)
```json
{
  "name": "Prowlarr",
  "type": "prowlarr",
  "host": "192.168.1.103",
  "port": 9696, 
  "apiKey": "your-prowlarr-api-key",
  "ssl": false,
  "testEndpoint": "/api/v1/system/status"
}
```

#### Unraid Server
```json
{
  "name": "Unraid",
  "type": "unraid",
  "host": "192.168.1.1",
  "port": 80,
  "apiKey": "your-unraid-connect-api-key",
  "ssl": false,
  "testEndpoint": "/graphql"
}
```

**Setup Instructions for Unraid**:
1. Install Unraid Connect plugin
2. Enable API access
3. Create API key with "Connect" role
4. Configure permissions for Docker management

### Service-Specific Settings

#### Advanced Radarr Configuration
```json
{
  "name": "Radarr",
  "type": "radarr",
  "host": "192.168.1.100",
  "port": 7878,
  "apiKey": "your-api-key",
  "settings": {
    "updateInterval": 300,
    "enableQueueMonitoring": true,
    "enableHealthChecks": true,
    "maxRetries": 3,
    "timeout": 10000,
    "enableDetailedStats": true
  }
}
```

#### Docker Host Configuration
```json
{
  "name": "Docker Host",
  "type": "docker",
  "connection": {
    "type": "socket",
    "path": "/var/run/docker.sock"
  }
}
```

**Alternative Docker Configurations**:
```json
// TCP Connection
{
  "name": "Remote Docker",
  "type": "docker", 
  "connection": {
    "type": "tcp",
    "host": "192.168.1.200",
    "port": 2376,
    "ssl": true,
    "cert": "/path/to/cert.pem",
    "key": "/path/to/key.pem",
    "ca": "/path/to/ca.pem"
  }
}

// SSH Connection
{
  "name": "SSH Docker",
  "type": "docker",
  "connection": {
    "type": "ssh",
    "host": "192.168.1.201",
    "port": 22,
    "username": "user",
    "privateKey": "/path/to/private/key"
  }
}
```

## 🌐 Network Discovery Configuration

### Discovery Settings
```json
{
  "networkDiscovery": {
    "enabled": true,
    "scanIntervals": {
      "quick": 300000,
      "full": 3600000
    },
    "networkRanges": [
      "192.168.1.0/24",
      "10.0.0.0/24"
    ],
    "portRanges": [
      {"start": 7878, "end": 7878, "service": "radarr"},
      {"start": 8989, "end": 8989, "service": "sonarr"},
      {"start": 32400, "end": 32400, "service": "plex"},
      {"start": 9696, "end": 9696, "service": "prowlarr"}
    ],
    "timeout": 5000,
    "maxConcurrent": 50
  }
}
```

### Custom Service Detection
```javascript
// backend/src/modules/discovery/ServiceDetector.js
const customDetectionRules = {
  'jellyfin': {
    ports: [8096, 8920],
    paths: ['/web/index.html', '/system/info'],
    identifiers: ['Jellyfin', 'jellyfin']
  },
  'overseerr': {
    ports: [5055],
    paths: ['/api/v1/status'],
    identifiers: ['Overseerr']
  }
};
```

## 🔐 Security Configuration

### Authentication Settings
```env
# JWT Configuration
JWT_SECRET=your_minimum_32_character_jwt_secret
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# API Security
API_RATE_LIMIT=100
API_RATE_WINDOW=900000
ENABLE_API_LOGGING=true

# CORS Settings
CORS_ORIGIN=https://your-domain.com
CORS_CREDENTIALS=true
```

### SSL/TLS Configuration
```yaml
# docker-compose.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
```

**nginx.conf**:
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /api {
        proxy_pass http://backend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📊 Database Configuration

### PostgreSQL Settings
```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: taylordx
      POSTGRES_USER: taylordx
      POSTGRES_PASSWORD: secure_password
      POSTGRES_INITDB_ARGS: "--encoding=UTF8 --locale=C"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/postgresql.conf:/etc/postgresql/postgresql.conf
    command: ["postgres", "-c", "config_file=/etc/postgresql/postgresql.conf"]
```

**postgresql.conf**:
```ini
# Performance tuning
shared_buffers = 256MB
max_connections = 100
work_mem = 4MB
maintenance_work_mem = 64MB

# Logging
log_statement = 'mod'
log_duration = on
log_min_duration_statement = 1000

# Monitoring
shared_preload_libraries = 'pg_stat_statements'
track_activity_query_size = 2048
```

### Redis Configuration
```yaml
services:
  redis:
    image: redis:7-alpine
    volumes:
      - ./redis.conf:/usr/local/etc/redis/redis.conf
    command: ["redis-server", "/usr/local/etc/redis/redis.conf"]
```

**redis.conf**:
```ini
# Memory management
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Security
requirepass your_redis_password
```

## 🔄 Monitoring and Alerts

### Health Check Configuration
```json
{
  "healthChecks": {
    "interval": 60000,
    "timeout": 5000,
    "retries": 3,
    "services": {
      "database": {
        "enabled": true,
        "query": "SELECT 1"
      },
      "redis": {
        "enabled": true,
        "command": "PING"
      },
      "docker": {
        "enabled": true,
        "endpoint": "/version"
      }
    }
  }
}
```

### Notification Settings
```json
{
  "notifications": {
    "enabled": true,
    "channels": {
      "email": {
        "enabled": true,
        "smtp": {
          "host": "smtp.gmail.com",
          "port": 587,
          "secure": false,
          "auth": {
            "user": "your-email@gmail.com",
            "pass": "your-app-password"
          }
        }
      },
      "webhook": {
        "enabled": true,
        "url": "https://discord.com/api/webhooks/...",
        "headers": {
          "Content-Type": "application/json"
        }
      }
    }
  }
}
```

## 🎨 UI Configuration

### Theme Settings
```json
{
  "theme": {
    "mode": "dark",
    "colors": {
      "primary": "#10b981",
      "secondary": "#6b7280",
      "accent": "#f59e0b",
      "background": "#111827",
      "surface": "#1f2937"
    },
    "typography": {
      "fontFamily": "Inter, system-ui, sans-serif",
      "fontSize": {
        "base": "14px",
        "lg": "16px"
      }
    }
  }
}
```

### Dashboard Layout
```json
{
  "dashboard": {
    "layout": "grid",
    "columns": 3,
    "autoRefresh": true,
    "refreshInterval": 30000,
    "enableAnimations": true,
    "compactMode": false
  }
}
```

## 🔧 Advanced Configuration

### Custom Service Integration
```javascript
// backend/src/modules/custom-service/service.js
const BaseService = require('../../utils/baseService');

class CustomService extends BaseService {
  constructor() {
    super('CustomService');
  }

  async testConnection(config) {
    // Implementation
  }

  async getStats(config) {
    // Implementation
  }
}

module.exports = new CustomService();
```

### Plugin System
```json
{
  "plugins": {
    "enabled": true,
    "directory": "./plugins",
    "autoload": true,
    "whitelist": [
      "backup-plugin",
      "monitoring-plugin"
    ]
  }
}
```

## 📝 Configuration Validation

### Validation Schema
```javascript
const configSchema = {
  database: {
    url: { type: 'string', required: true },
    poolSize: { type: 'number', default: 10 }
  },
  services: {
    type: 'array',
    items: {
      name: { type: 'string', required: true },
      type: { type: 'string', required: true },
      host: { type: 'string', required: true },
      port: { type: 'number', required: true },
      apiKey: { type: 'string' }
    }
  }
};
```

### Configuration Testing
```bash
# Validate configuration
npm run config:validate

# Test service connections
npm run services:test

# Generate sample configuration
npm run config:generate
```

## 🔄 Configuration Management

### Environment-Specific Configs
```
config/
├── default.json
├── development.json
├── production.json
├── test.json
└── local.json
```

### Dynamic Configuration Updates
```javascript
// Runtime configuration updates
const configManager = require('./config/manager');

// Update service configuration
configManager.updateService('radarr', {
  apiKey: 'new-api-key',
  enabled: true
});

// Reload configuration
configManager.reload();
```

---

For troubleshooting configuration issues, see [Troubleshooting Guide](TROUBLESHOOTING.md).