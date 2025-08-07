# qBittorrent Integration Guide

Complete documentation for the qBittorrent service integration in TaylorDex.

## Overview

The qBittorrent integration provides comprehensive torrent management statistics and monitoring capabilities, implemented from scratch to support the newly discovered qBittorrent instances.

## Features Implemented

### Core Statistics
- **Torrent Counts**: Total, active, downloading, seeding, completed, paused
- **Transfer Rates**: Real-time download/upload speeds
- **Global Metrics**: Overall ratio, total data transferred
- **Storage Usage**: Download directory space utilization

### Enhanced Features
- **Active Downloads**: Progress tracking with ETAs and speeds
- **Recent Completions**: Last 7 days of completed torrents
- **Category Breakdown**: Organization by torrent categories
- **Status Distribution**: Breakdown by torrent states
- **Storage Paths**: Docker-aware path detection

## Authentication

### Web UI Requirements
qBittorrent requires Web UI authentication:
- **Username**: Default is usually 'admin'
- **Password**: Set in qBittorrent preferences
- **Web UI**: Must be enabled in qBittorrent settings

### Configuration in TaylorDex
During network discovery configuration:
1. **Username Field**: Enter Web UI username
2. **Password Field**: Enter Web UI password  
3. **Test Connection**: Verify credentials before adding

## API Integration Details

### Authentication Flow
```javascript
// 1. Login with credentials
POST /api/v2/auth/login
Body: username=admin&password=yourpassword

// 2. Store session cookies
// 3. Use cookies for subsequent API calls
```

### Core API Endpoints Used
- `/api/v2/torrents/info` - Torrent list and details
- `/api/v2/transfer/info` - Global transfer statistics  
- `/api/v2/app/preferences` - Application settings
- `/api/v2/app/version` - Version information

### Statistics Collection
Runs every 5 minutes as part of the global stats collection cycle.

## Service Card Display

### Primary Metrics Shown
1. **Torrents**: Total number of torrents
2. **Active**: Currently active torrents  
3. **Download Speed**: Current download rate
4. **Upload Speed**: Current upload rate

### Color Coding
- **Green**: Torrent count (primary metric)
- **Blue**: Active torrents (activity indicator)
- **Yellow**: Download speed (download activity)
- **Purple**: Upload speed (seeding activity)

## Service Detail Modal

### Overview Tab
- Basic statistics summary
- Transfer rate charts
- Global ratio display
- Storage utilization

### Activity Tab  
- **Active Downloads**:
  - Progress bars with percentage
  - Download speeds and ETAs
  - File sizes and quality info
  - Seeder/peer counts
- **Recent Completions**:
  - Last 7 days of finished torrents
  - Completion dates and ratios
  - File sizes and categories

### Storage Tab
- **Download Paths**: Shows configured download directories
- **Space Usage**: Available vs used space
- **Docker Detection**: Identifies containerized setups
- **Duplicate Handling**: Same storage deduplication as *arr services

### Categories Tab
- **Category Breakdown**: Torrents organized by categories
- **Status Distribution**: State-based torrent counts
- **Performance Metrics**: Success rates and health indicators

## Error Handling

### Common Issues

#### Authentication Failures
- **Cause**: Incorrect username/password
- **Solution**: Verify Web UI credentials
- **Prevention**: Test connection during setup

#### Connection Timeouts
- **Cause**: Web UI disabled or unreachable
- **Solution**: Enable Web UI in qBittorrent preferences
- **Fallback**: Service marked as offline with error message

#### API Changes
- **Cause**: qBittorrent version incompatibility
- **Solution**: Update API endpoint mappings
- **Detection**: Version checking during stats collection

### Error States
```javascript
// Example error response
{
  torrents: 0,
  active: 0,
  downloadSpeed: '0 B/s',
  uploadSpeed: '0 B/s',
  status: 'error',
  error: 'Authentication failed'
}
```

## Data Processing

### Torrent State Mapping
```javascript
const statusMap = {
  'downloading': 'Downloading',
  'uploading': 'Seeding', 
  'stalledUP': 'Seeding (Stalled)',
  'stalledDL': 'Downloading (Stalled)',
  'queuedUP': 'Queued (Seed)',
  'queuedDL': 'Queued (Download)',
  'pausedUP': 'Paused (Seed)',
  'pausedDL': 'Paused (Download)',
  'error': 'Error'
}
```

### Speed Formatting
```javascript
formatSpeed(bytesPerSecond) {
  // Converts bytes/second to human readable format
  // Examples: 1048576 → "1.0 MB/s"
  //          524288 → "512.0 KB/s"
}
```

### ETA Calculation  
```javascript
formatETA(seconds) {
  // Converts seconds to readable time format
  // Examples: 3600 → "1h"
  //          8640000 → "∞" (infinite)
  //          120 → "2m"
}
```

## Performance Considerations

### API Call Optimization
- **Parallel Requests**: Core data fetched simultaneously
- **Timeout Handling**: 5-second timeouts prevent hanging
- **Error Isolation**: Failures don't crash other services

### Data Limitations
- **Active Downloads**: Limited to 10 items for performance
- **Recent Completions**: Last 7 days, max 10 items
- **Categories**: All categories shown (typically < 20)

### Memory Usage
- **Cookie Management**: Session cookies stored temporarily
- **Data Caching**: Stats cached for 5-minute intervals
- **Connection Pooling**: Reuses HTTP connections

## Docker Integration

### Path Detection
Automatically detects Docker mount patterns:
```javascript
isDockerMount: downloadPath.startsWith('/') && 
               !downloadPath.startsWith('/mnt') &&
               !downloadPath.startsWith('/media')
```

### Host Detection
```javascript  
dockerHost: config.host !== 'localhost' && 
            config.host !== '127.0.0.1' ? config.host : null
```

### Storage Deduplication
Uses the same enhanced storage path detection as *arr services:
- Identifies duplicate mount points
- Shows primary vs secondary paths
- Calculates accurate space usage

## Configuration Examples

### Standard Docker Setup
```yaml
# docker-compose.yml
qbittorrent:
  image: lscr.io/linuxserver/qbittorrent
  ports:
    - "8080:8080"
  environment:
    - WEBUI_PORT=8080
  volumes:
    - ./config:/config
    - ./downloads:/downloads
```

**TaylorDx Configuration:**
- Host: 192.168.100.1
- Port: 8080  
- Username: admin
- Password: (set in qBittorrent)

### Unraid Setup
```
Container: qBittorrent
Repository: lscr.io/linuxserver/qbittorrent  
WebUI: http://[IP]:[PORT:8080]
Path: /downloads → /mnt/user/downloads
```

**TaylorDx Configuration:**
- Host: [Unraid IP]
- Port: 8080
- Username: admin  
- Password: (configured in container)

## Troubleshooting

### Setup Issues

#### Web UI Not Accessible
1. Check qBittorrent is running
2. Verify Web UI is enabled in Preferences
3. Check port bindings in Docker
4. Test direct browser access

#### Authentication Fails
1. Verify username (usually 'admin')
2. Check password in qBittorrent preferences
3. Try resetting Web UI password
4. Check for IP restrictions in qBittorrent

#### Stats Not Loading
1. Check TaylorDx backend logs
2. Verify network connectivity
3. Test manual API calls
4. Check qBittorrent version compatibility

### Debugging Commands

#### Test API Access
```bash
# Test login
curl -c cookies.txt -d "username=admin&password=yourpass" \
     http://192.168.100.1:8080/api/v2/auth/login

# Test torrent list  
curl -b cookies.txt \
     http://192.168.100.1:8080/api/v2/torrents/info
```

#### Check Service Status
```bash
# Backend logs
docker-compose logs backend | grep qbittorrent

# Service stats endpoint
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:5000/api/services/ID/stats
```

## Version Compatibility  

### Tested Versions
- **qBittorrent**: 4.3.x - 4.6.x
- **API Version**: v2.x (current standard)
- **Web UI**: All recent versions

### Known Issues
- **Older Versions**: May lack some API endpoints
- **Development Versions**: API changes may break integration
- **Custom Builds**: Non-standard API behavior

## Security Notes

### Credential Handling
- Passwords never stored in plaintext
- Session cookies temporary only
- API calls over HTTPS when possible
- Authentication required for all operations

### Network Security
- Respects qBittorrent IP whitelist settings
- No persistent connections maintained
- Timeout prevention against hanging requests
- Error handling prevents information leakage

## Future Enhancements

### Planned Features
1. **Torrent Management**: Add/remove/pause controls
2. **RSS Monitoring**: RSS feed status and automation
3. **Scheduler Integration**: Bandwidth scheduling awareness
4. **Advanced Filtering**: Category and tag-based views
5. **Alerting**: Download completion notifications

### API Extensions
- Category management endpoints
- RSS automation status
- Scheduler configuration
- Plugin status monitoring

This integration provides comprehensive qBittorrent monitoring while maintaining the same high standard of features and reliability as the *arr service integrations.