# Service Stats Template

This document outlines the comprehensive stats template that should be implemented for all services in TaylorDex, based on the successful implementation in Sonarr and Radarr.

## Core Stats Categories

### 1. Basic Stats (Required for All Services)
Every service should provide these fundamental metrics:

```javascript
{
  // Service Status
  status: 'online' | 'offline' | 'error',
  version: 'x.x.x',
  
  // Primary Metrics (service-specific)
  primaryCount: 0,     // e.g., movies, series, songs, books
  secondaryCount: 0,   // e.g., episodes, tracks, chapters
  
  // Storage
  diskSpace: 'X GB',
  diskSpaceTotal: 'X GB', 
  diskSpaceFree: 'X GB',
  diskSpaceUsedPercent: 0-100,
  
  // Error Handling
  error: 'error message if status is error'
}
```

### 2. Enhanced Storage Information
Detailed storage paths with duplicate detection and Docker/NAS integration:

```javascript
storagePaths: [
  {
    path: '/path/to/storage',
    label: 'Storage Name',
    totalSpace: bytes,
    freeSpace: bytes,
    usedSpace: bytes,
    usedPercent: 0-100,
    accessible: boolean,
    
    // Duplicate Detection
    isDuplicate: boolean,
    duplicateOfPath: '/original/path',
    
    // Docker/NAS Integration
    isDockerMount: boolean,
    dockerHost: 'hostname or null',
    isPrimary: boolean,
    
    // Service-specific
    isRootFolder: boolean,
    rootFolderId: 'id or null'
  }
],
dockerHost: 'hostname or null'
```

### 3. Activity Metrics
Current and recent activity tracking:

```javascript
{
  // Queue/Downloads
  queue: {
    total: 0,
    downloading: 0,
    queued: 0,
    items: [
      {
        title: 'Item Name',
        progress: 0-100,
        eta: 'time remaining',
        size: 'X GB',
        status: 'downloading|queued|completed',
        quality: '1080p',
        // Additional service-specific fields
      }
    ]
  },
  
  // Recent Activity  
  recentItems: [
    {
      title: 'Item Name',
      timestamp: 'ISO date',
      type: 'added|downloaded|updated',
      quality: '1080p',
      size: 'X GB',
      // Service-specific metadata
    }
  ]
}
```

### 4. Health & Monitoring
System health and issue tracking:

```javascript
health: {
  issues: 0,
  warnings: ['warning message 1', 'warning message 2']
}
```

### 5. Content Organization
Breakdown by categories, quality, or other attributes:

```javascript
{
  // Quality/Category Breakdown
  qualityBreakdown: {
    '1080p': 45,
    '720p': 23,
    '4K': 12
  },
  
  // Genre/Type Breakdown
  genreBreakdown: {
    'Action': 34,
    'Drama': 28,
    'Comedy': 15
  }
}
```

### 6. Scheduling & Upcoming
Future events and scheduled items:

```javascript
{
  upcoming: [
    {
      title: 'Item Name',
      scheduledDate: 'ISO date',
      type: 'release|air|download',
      monitored: boolean,
      hasFile: boolean
    }
  ],
  
  // Summary counts
  scheduledToday: 0,
  scheduledThisWeek: 0
}
```

## Service-Specific Implementations

### Media Management Services (*arr Suite)
**Radarr, Sonarr, Lidarr, Readarr**

- **Primary Metrics**: movies/series/artists/books
- **Secondary Metrics**: missing items, monitored items
- **Activity**: download queue, recent downloads
- **Organization**: quality breakdown, genre breakdown
- **Scheduling**: upcoming releases, airing schedule

### Download Clients
**qBittorrent, Transmission, Deluge, SABnzbd**

- **Primary Metrics**: active torrents/downloads, total torrents
- **Secondary Metrics**: upload/download speeds, ratio
- **Activity**: current downloads with progress
- **Storage**: download directory usage
- **Network**: current bandwidth usage

### Media Servers
**Plex, Jellyfin, Emby**

- **Primary Metrics**: libraries, total items
- **Secondary Metrics**: users, active streams
- **Activity**: currently playing, recently added
- **Performance**: transcoding sessions, bandwidth
- **Users**: active users, user statistics

### System Services
**Unraid, Portainer, Proxmox**

- **Primary Metrics**: containers/VMs, running services
- **Secondary Metrics**: CPU/RAM usage
- **Storage**: array status, pool usage
- **Health**: system alerts, temperature
- **Activity**: recent container changes

### Monitoring Services
**Grafana, Prometheus, InfluxDB**

- **Primary Metrics**: dashboards, data sources
- **Secondary Metrics**: alerts, queries per second
- **Storage**: database size, retention
- **Performance**: query performance, uptime

## Implementation Guidelines

### 1. API Efficiency
- Use parallel API calls with Promise.all()
- Implement graceful degradation for optional endpoints
- Cache results when appropriate

### 2. Error Handling
- Wrap each API call section in try-catch
- Provide fallback values for failed calls
- Return partial data rather than complete failure

### 3. Data Processing
- Calculate derived metrics (percentages, totals)
- Format bytes/dates consistently
- Detect and handle duplicate storage paths

### 4. Performance
- Limit array results (e.g., recent items to 10-20)
- Implement pagination for large datasets
- Consider implementing a "basic" vs "detailed" stats mode

### 5. Consistency
- Use consistent field names across services
- Maintain the same data structure patterns
- Format all byte values with formatBytes()

## Example Implementation Pattern

```javascript
async getStats(config) {
  try {
    // 1. Parallel API calls for core data
    const [primaryData, systemStatus, diskSpace] = await Promise.all([
      this.apiCall(config, '/api/primary'),
      this.apiCall(config, '/api/system/status'),
      this.apiCall(config, '/api/diskspace')
    ]);
    
    // 2. Process basic stats
    const basicStats = {
      primaryCount: primaryData.length,
      status: 'online',
      version: systemStatus.version
    };
    
    // 3. Process storage with duplicate detection
    const storagePaths = this.processStoragePaths(diskSpace);
    
    // 4. Fetch optional enhanced data
    let enhancedData = {};
    try {
      enhancedData = await this.fetchEnhancedData(config);
    } catch (e) {
      console.warn('Enhanced data unavailable:', e.message);
    }
    
    // 5. Return combined stats
    return {
      ...basicStats,
      storagePaths,
      ...enhancedData
    };
    
  } catch (error) {
    // 6. Error fallback
    return {
      status: 'error',
      error: error.message,
      // Minimal stats...
    };
  }
}
```

## Testing Checklist

When implementing stats for a new service:

- [ ] Basic stats display correctly in ServiceCard
- [ ] Storage paths show with duplicate detection
- [ ] Recent activity updates in real-time
- [ ] Queue/download progress displays accurately
- [ ] Health warnings appear when present
- [ ] Error states handled gracefully
- [ ] Performance is acceptable (< 2s load time)
- [ ] All byte values formatted consistently
- [ ] Docker/NAS host detection works correctly

## Future Enhancements

1. **Real-time Updates**: WebSocket connections for live stats
2. **Historical Data**: Trends and graphs over time
3. **Predictive Analytics**: Storage usage predictions
4. **Cross-Service Integration**: Combined stats across related services
5. **Custom Metrics**: User-defined stat calculations