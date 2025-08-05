# Unraid Integration Guide

## Overview

TaylorDex now supports comprehensive Unraid server monitoring through the built-in GraphQL API introduced in Unraid 7.2.0-beta.1. This integration provides real-time monitoring of your Unraid server's array status, disk health, Docker containers, VMs, and system resources.

## Prerequisites

### Unraid Version Requirements
- **Unraid 7.2.0-beta.1 or later** (includes built-in API)
- For older versions: Install "Unraid Connect Plugin"

### API Setup

#### Option 1: Built-in API (Unraid 7.2.0+)
1. SSH into your Unraid server
2. Enable developer mode: `unraid-api developer`
3. Create API key: `unraid-api apikey --create`
4. Save the generated API key securely

#### Option 2: Unraid Connect Plugin (older versions)
1. Install "Unraid Connect Plugin" from Community Applications
2. Configure the plugin through Settings → Unraid Connect
3. Generate API key through plugin interface

## Adding Unraid to TaylorDex

### Step 1: Add Service
1. Go to **Services** tab in TaylorDex
2. Click **"Add New Service"**
3. Fill in the details:
   - **Name**: Your Unraid server name (e.g., "Main Server")
   - **Type**: Select "Unraid"
   - **Host**: Your Unraid server IP (e.g., 192.168.1.100)
   - **Port**: 
     - `443` for HTTPS
     - `80` for HTTP
     - Custom port if configured
   - **API Key**: Paste your generated API key

### Step 2: Test Connection
Click **"Test Connection"** to verify:
- API key is valid
- GraphQL endpoint is accessible
- Basic system info can be retrieved

### Step 3: Save & Monitor
Once connection test passes, save the service. TaylorDex will begin collecting comprehensive data every 30 seconds.

## What TaylorDex Monitors

### System Information
- **Uptime**: Server uptime duration
- **CPU**: Cores, model, current usage percentage
- **Memory**: Total, used, available, usage percentage
- **OS**: Platform, version information

### Array Status
- **Array State**: Started, stopped, maintenance mode
- **Protection**: Parity protection status
- **Capacity**: Total size, used space, free space, usage percentage
- **Disk Count**: Number of disks and devices in array

### Disk Health
- **Individual Disks**: Name, device, type, status, temperature
- **Health Summary**: Healthy/warning/error disk counts
- **Capacity per Disk**: Size, used, free space
- **Error Counts**: SMART errors per disk

### Docker Containers
- **Container Status**: Running, stopped, total counts
- **Resource Usage**: CPU and memory per container
- **Container Details**: Image, ports, creation date
- **Network Info**: Docker networks and configuration

### Virtual Machines
- **VM Status**: Running, stopped, total counts
- **Resource Allocation**: vCPUs, memory per VM
- **Autostart Status**: Which VMs start automatically

### Storage Shares
- **Share Information**: User shares and their sizes
- **Allocation Methods**: How shares are distributed
- **Usage Statistics**: Per-share storage consumption

### System Alerts
- **Notifications**: Unread notification count
- **Recent Alerts**: Latest system warnings/errors
- **Health Warnings**: Disk, array, or system issues

### Network Information
- **Interface Status**: Network interfaces and their status
- **Traffic Statistics**: RX/TX bytes per interface
- **Connection Types**: Interface speeds and types

## Service Card Display

The Unraid service card shows key metrics:

```
┌─────────────────────────────┐
│ [🖥️] Main Server           │
│ 192.168.1.100:443          │
│                             │
│ Uptime        15d 8h 23m    │
│ Containers         45/42    │
│ VMs                3/1      │
│ Array Status     started    │
│ Storage Used        67%     │
│                             │
│ Status          ● Online    │
└─────────────────────────────┘
```

## Status Dashboard Integration

### Overview Tab
Unraid data contributes to:
- **System Health**: Array status and disk health
- **Total Storage**: Combined array capacity
- **Active Services**: Container and VM counts

### Activity Tab
- **Container Events**: Starting/stopping containers
- **System Alerts**: Recent notifications and warnings
- **Resource Changes**: Storage usage updates

### Performance Tab
- **Resource Utilization**: CPU, memory, network usage
- **Disk Performance**: Temperature and error monitoring
- **Array Health**: Parity check status and disk errors

## API Endpoints

### Basic Stats
```bash
curl http://localhost:5000/api/unraid/1/stats
```

### Health Check
```bash
curl http://localhost:5000/api/unraid/1/health
```

### Debug Endpoints
```bash
curl http://localhost:5000/api/unraid/1/test-endpoints
```

## Troubleshooting

### Common Issues

#### 1. Connection Failed
**Error**: "Connection failed" or "Network error"

**Solutions**:
```bash
# Check if Unraid API is enabled
curl http://YOUR_UNRAID_IP/graphql

# Test from TaylorDex backend container
docker-compose exec backend curl http://YOUR_UNRAID_IP/graphql

# Verify port and protocol
# HTTPS: port 443
# HTTP: port 80 or custom
```

#### 2. Authentication Failed
**Error**: "Unauthorized" or "Invalid API key"

**Solutions**:
1. **Regenerate API Key**:
   ```bash
   # SSH into Unraid
   unraid-api apikey --list
   unraid-api apikey --delete OLD_KEY_ID
   unraid-api apikey --create
   ```

2. **Check API Key Format**:
   - Should be alphanumeric string
   - No extra spaces or characters
   - Case sensitive

3. **Verify Permissions**:
   - API key has proper role (admin/connect)
   - User has GraphQL access enabled

#### 3. Partial Data
**Error**: Some stats missing or "PARTIAL" status

**Common Causes**:
- **Insufficient Permissions**: API key lacks access to certain endpoints
- **Plugin Version**: Older Unraid Connect plugin with limited API
- **Array Stopped**: Some data unavailable when array is offline

**Solutions**:
```bash
# Check GraphQL schema availability
curl -X POST http://YOUR_UNRAID_IP/graphql \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'

# Test specific queries
curl -X POST http://YOUR_UNRAID_IP/graphql \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ info { os { version } } }"}'
```

#### 4. SSL/HTTPS Issues
**Error**: "SSL certificate" or "HTTPS connection failed"

**Solutions**:
1. **Use HTTP instead of HTTPS**:
   - Change port from 443 to 80
   - Disable SSL/TLS verification

2. **Accept Self-Signed Certificates**:
   - Unraid uses self-signed certificates by default
   - TaylorDex should accept these automatically

#### 5. Version Compatibility
**Error**: "Schema not found" or "Query not supported"

**Check Unraid Version**:
```bash
# SSH into Unraid
cat /etc/unraid-version

# Minimum: 7.2.0-beta.1 for built-in API
# Older versions: Requires Unraid Connect Plugin
```

### Debug Mode

Enable detailed logging in TaylorDex backend:

```bash
# View Unraid integration logs
docker-compose logs backend | grep -i unraid

# Test specific endpoints
curl http://localhost:5000/api/unraid/1/test-endpoints
```

### Network Troubleshooting

#### Test Connectivity
```bash
# From TaylorDex host
curl -v http://YOUR_UNRAID_IP/graphql

# From inside backend container
docker-compose exec backend curl -v http://YOUR_UNRAID_IP/graphql

# Check if GraphQL playground is accessible
# Open: http://YOUR_UNRAID_IP/graphql in browser
```

#### Firewall Issues
1. **Unraid Firewall**: Ensure ports 80/443 are open
2. **Network Firewall**: Check router/firewall rules
3. **Docker Networks**: Verify container can reach Unraid

### Performance Optimization

#### Reduce Query Frequency
For large Unraid servers, consider:

```javascript
// Adjust refresh interval in frontend
const refreshInterval = 60; // seconds instead of 30

// Limit concurrent queries
const maxConcurrentQueries = 3;
```

#### Query Optimization
```graphql
# Instead of fetching all data, query specific needs
query OptimizedQuery {
  info {
    cpu { usage }
    memory { percent }
  }
  array {
    status
    percentUsed
  }
  # Skip heavy queries like all containers
}
```

## Security Considerations

### API Key Security
1. **Store Securely**: API keys are stored encrypted in database
2. **Regular Rotation**: Regenerate API keys periodically
3. **Scope Limitation**: Use minimum required permissions

### Network Security
1. **HTTPS Preferred**: Use HTTPS when possible
2. **Local Network**: Keep Unraid on trusted network
3. **VPN Access**: Use VPN for remote monitoring

### Access Control
1. **Role-Based**: Configure appropriate API roles
2. **IP Restrictions**: Limit API access by IP if needed
3. **Audit Logs**: Monitor API usage in Unraid logs

## Advanced Configuration

### Custom GraphQL Queries
You can extend the Unraid integration with custom queries:

```javascript
// Add to unraid/service.js
const customQuery = `
  query CustomMetrics {
    plugins {
      name
      version
      status
    }
    system {
      load
      processes
    }
  }
`;
```

### Webhook Integration
Set up webhooks for real-time alerts:

```bash
# Configure Unraid to send webhooks to TaylorDex
# Settings → Notifications → Add webhook URL
http://YOUR_TAYLORDEX_IP:5000/api/webhooks/unraid
```

### Grafana Integration
Export metrics to Grafana:

```javascript
// Add Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
  // Export Unraid metrics in Prometheus format
});
```

## API Reference

### GraphQL Schema
The Unraid GraphQL API provides these main types:

- `info`: System information (CPU, memory, OS)
- `array`: Array status and capacity
- `disks`: Individual disk information
- `docker`: Container management
- `vms`: Virtual machine management
- `shares`: User share information
- `notifications`: System alerts
- `network`: Network interface data

### Example Queries

#### System Overview
```graphql
query SystemOverview {
  info {
    os { platform version uptime }
    cpu { cores model usage }
    memory { total used percent }
  }
  array {
    status protection
    size used free percentUsed
  }
}
```

#### Container Status
```graphql
query ContainerStatus {
  docker {
    containers {
      name image status state
      cpu memory
      ports { hostPort containerPort }
    }
  }
}
```

#### Disk Health
```graphql
query DiskHealth {
  disks {
    name device type status
    size used free temp errors
  }
}
```

## Support & Updates

### Getting Help
1. **Documentation**: Check latest Unraid API docs
2. **Forums**: Unraid community forums
3. **GitHub**: TaylorDex repository issues

### Version Updates
- Monitor Unraid release notes for API changes
- Update TaylorDex when new API features are available
- Test integration after Unraid updates

---

**Last Updated**: August 2025
**Unraid API Version**: 7.2.0+
**TaylorDex Version**: 1.1.0