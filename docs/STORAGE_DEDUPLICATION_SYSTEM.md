# Storage Deduplication System

Comprehensive documentation for the advanced storage path deduplication and content-based space calculation system implemented across all TaylorDex services.

## Overview

The storage deduplication system prevents double-counting of storage space in Docker and NAS environments where multiple services may reference the same underlying storage through different mount points.

## Problem Statement

### Docker Environment Issues
In containerized environments, it's common for multiple services to mount the same host directory:

```yaml
# docker-compose.yml example
radarr:
  volumes:
    - /mnt/media:/movies
sonarr:  
  volumes:
    - /mnt/media:/tv
    - /mnt/media:/downloads
plex:
  volumes:
    - /mnt/media:/data
```

**Result**: TaylorDx would show 3x the actual storage usage because each service reports the same `/mnt/media` space.

### NAS Environment Issues
Similar problems occur with network attached storage:
- Multiple services accessing same NFS/SMB shares
- Different mount points to same underlying storage
- Mixed local and network storage reporting

## Solution Architecture

### Conservative Duplicate Detection
Uses multiple criteria to safely identify duplicates without false positives:

```javascript
// Only deduplicate when ALL conditions are met:
if (
  // 1. Identical storage sizes (smoking gun)
  pathA.totalSpace === pathB.totalSpace && 
  pathA.freeSpace === pathB.freeSpace &&
  
  // 2. Hierarchical relationship (one contains the other)
  (pathA.path.startsWith(pathB.path + '/') || 
   pathB.path.startsWith(pathA.path + '/') ||
   pathA.path === pathB.path) &&
   
  // 3. Reasonable size (avoid tiny test filesystems)  
  pathA.totalSpace > 1024 * 1024 * 100 // > 100MB
) {
  // Mark as duplicate
}
```

### Content-Based Space Calculation
Shows actual content usage instead of total disk usage:

#### Service-Specific Content Detection
```javascript
const contentKeywords = {
  radarr: ['movies', 'films', 'cinema', 'movie'],
  sonarr: ['tv', 'series', 'shows', 'television', 'show'], 
  lidarr: ['music', 'audio', 'songs', 'albums', 'artist'],
  readarr: ['books', 'ebooks', 'audiobooks', 'literature'],
  bazarr: ['subtitles', 'subs']
};
```

## Implementation Details

### Data Structures

#### Enhanced Storage Path Object
```javascript
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
  
  // Content Detection
  isContentPath: boolean,
  contentType: 'movies|tv|music|books|subtitles',
  
  // Service Integration
  isRootFolder: boolean,
  rootFolderId: 'id or null'
}
```

### Processing Pipeline

#### 1. Raw Path Collection
```javascript
// Collect all storage paths from service APIs
const rawPaths = await Promise.all([
  service.apiCall('/api/v3/diskspace'),
  service.apiCall('/api/v3/rootfolder')
]);
```

#### 2. Duplicate Detection Phase
```javascript
const processedPaths = rawPaths.map(path => {
  const duplicateOf = rawPaths.find(other => 
    isDuplicatePath(path, other)
  );
  
  return {
    ...path,
    isDuplicate: !!duplicateOf,
    duplicateOfPath: duplicateOf?.path,
    isPrimary: !duplicateOf // First occurrence is primary
  };
});
```

#### 3. Content Path Identification
```javascript
const contentPaths = processedPaths.filter(path => {
  const pathLower = path.path.toLowerCase();
  const serviceKeywords = contentKeywords[service.type] || [];
  
  return serviceKeywords.some(keyword => 
    pathLower.includes(keyword)
  );
});
```

#### 4. Space Calculation
```javascript
// Use content space if available, otherwise fall back
const displayedUsed = contentPaths.length > 0 
  ? calculateContentSpace(contentPaths)
  : calculateTotalDiskSpace(uniquePaths);
```

## Service Integration

### Radarr Implementation
```javascript  
// Enhanced storage processing with duplicate detection
const processedDisks = diskSpace.map(disk => {
  const duplicateOf = diskSpace.find(d => 
    d !== disk && 
    d.totalSpace === disk.totalSpace && 
    d.freeSpace === disk.freeSpace
  );
  
  return {
    ...disk,
    isDuplicate: !!duplicateOf,
    duplicateOfPath: duplicateOf?.path
  };
});

// Get unique disks for metrics calculation  
const uniqueDisks = processedDisks.filter(disk => !disk.isDuplicate);

// Content detection for movies
const moviePaths = processedDisks.filter(disk => {
  const pathLower = disk.path.toLowerCase();
  return ['movies', 'films', 'cinema'].some(keyword => 
    pathLower.includes(keyword)
  );
});
```

### Sonarr Implementation  
```javascript
// Similar duplicate detection + TV content detection
const tvPaths = processedDisks.filter(disk => {
  const pathLower = disk.path.toLowerCase(); 
  return ['tv', 'series', 'shows', 'television'].some(keyword =>
    pathLower.includes(keyword)
  );
});

// Cross-service enrichment with Docker container info
const enrichedPaths = storagePaths.map(path => ({
  ...path,
  // Find matching services from other containers
  relatedServices: allServices.filter(s => 
    s.type !== 'sonarr' && 
    s.host === service.dockerHost &&
    pathsOverlap(path.path, s.rootPaths)
  )
}));
```

## Display Logic

### Service Card Display
Shows the most relevant metric for each service:

```javascript
// In ServiceCard component
{stats.diskSpace && (
  <div className="flex justify-between items-center">
    <span className="text-sm text-gray-400">
      {/* Dynamic label based on content detection */}
      {stats.contentType === 'movies' ? 'Movies Used' :
       stats.contentType === 'tv' ? 'TV Shows Used' :  
       'Disk Usage'}
    </span>
    <span className="text-sm text-gray-300 font-medium">
      {stats.diskSpace}
    </span>
  </div>
)}
```

### Service Detail Modal
Storage tab shows comprehensive information:

#### Overview Section
- **Total Storage**: Deduplicated total across all paths
- **Free Space**: Available space (largest unique volume)
- **Used Space**: Content-based or total disk usage
- **Used Percentage**: Accurate percentage of actual usage

#### Path Details Section  
```javascript
{storagePaths.map(path => (
  <div key={path.path} className={`storage-path-item ${
    path.isDuplicate ? 'opacity-60' : ''
  }`}>
    {/* Path information */}
    <div className="path-header">
      {path.label}
      {path.isDuplicate && (
        <span className="duplicate-badge">
          Duplicate of {path.duplicateOfPath}
        </span>
      )}
      {path.isContentPath && (
        <span className="content-badge">
          {path.contentType} Source
        </span>
      )}
    </div>
    
    {/* Usage metrics */}
    <div className="usage-metrics">
      {path.totalSpace && (
        <div>Total: {formatBytes(path.totalSpace)}</div>
      )}
      <div>Used: {formatBytes(path.usedSpace)}</div>
      <div>Free: {formatBytes(path.freeSpace)}</div>
    </div>
  </div>
))}
```

## Docker Detection

### Mount Point Analysis
```javascript
function detectDockerMount(path) {
  // Docker containers typically mount to / paths
  const isDockerPath = path.startsWith('/') && 
                      !path.startsWith('/mnt') && 
                      !path.startsWith('/media');
                      
  // NAS mounts usually under /mnt or /media
  const isNasMount = path.startsWith('/mnt/') ||
                     path.startsWith('/media/') ||
                     path.includes('nfs') ||
                     path.includes('smb');
                     
  return {
    isDockerMount: isDockerPath,
    isNasMount: isNasMount,
    mountType: isDockerPath ? 'docker' : 
               isNasMount ? 'nas' : 'local'
  };
}
```

### Host Detection
```javascript
function detectDockerHost(config) {
  // Services not on localhost are likely remote Docker hosts
  return config.host !== 'localhost' && 
         config.host !== '127.0.0.1' ? config.host : null;
}
```

## Cross-Service Integration

### Service Relationship Detection
```javascript
// Find related services that might share storage
function findRelatedServices(currentService, allServices) {
  return allServices.filter(service => {
    // Same host suggests same Docker environment  
    if (service.dockerHost === currentService.dockerHost) {
      return true;
    }
    
    // Check for overlapping paths
    return currentService.storagePaths.some(currentPath => 
      service.storagePaths?.some(servicePath =>
        pathsOverlap(currentPath.path, servicePath.path)
      )
    );
  });
}
```

### Enrichment Process
```javascript
// Add context from related services
const enrichedStoragePaths = storagePaths.map(path => {
  const relatedServices = findRelatedServices(service, allServices);
  const matchingPaths = relatedServices.flatMap(s => 
    s.storagePaths?.filter(sp => pathsOverlap(path.path, sp.path))
  );
  
  return {
    ...path,
    relatedServices: relatedServices.map(s => s.name),
    crossServiceUsage: matchingPaths.length > 1,
    totalCrossServiceSpace: matchingPaths.reduce(
      (sum, p) => sum + p.usedSpace, 0
    )
  };
});
```

## Error Handling

### Validation
```javascript
// Ensure data integrity before duplicate detection
function validateStorageData(paths) {
  return paths.filter(path => {
    // Must have valid path
    if (!path.path || typeof path.path !== 'string') {
      console.warn('Invalid path detected:', path);
      return false;
    }
    
    // Must have reasonable space values
    if (path.totalSpace <= 0 || path.freeSpace < 0) {
      console.warn('Invalid space values:', path);
      return false;
    }
    
    // Free space shouldn't exceed total space
    if (path.freeSpace > path.totalSpace) {
      console.warn('Free space exceeds total:', path);
      path.freeSpace = path.totalSpace;
    }
    
    return true;
  });
}
```

### Graceful Degradation
```javascript
// Handle API failures gracefully
try {
  const diskSpace = await service.apiCall('/api/v3/diskspace');
  const processedPaths = processStoragePaths(diskSpace);
  return processedPaths;
} catch (error) {
  console.error('Storage API failed:', error);
  
  // Return basic storage info without enhancement
  return [{
    path: '/data',
    label: 'Storage',
    accessible: false,
    error: 'Unable to fetch storage information'
  }];
}
```

## Performance Considerations

### Efficiency Optimizations
- **O(n²) complexity** for duplicate detection is acceptable for typical service counts
- **Caching**: Results cached for 5-minute intervals
- **Lazy Loading**: Storage details loaded only when modal opened
- **Parallel Processing**: Multiple services processed simultaneously

### Memory Usage
- **Path Storage**: ~200 bytes per storage path
- **Deduplication Maps**: Temporary during processing
- **Result Caching**: Cached results ~1KB per service

## Testing Strategy

### Unit Tests
```javascript
describe('Storage Deduplication', () => {
  test('identifies identical storage correctly', () => {
    const paths = [
      { path: '/mnt/media', totalSpace: 1000000, freeSpace: 500000 },
      { path: '/movies', totalSpace: 1000000, freeSpace: 500000 }
    ];
    
    const result = detectDuplicates(paths);
    expect(result[1].isDuplicate).toBe(true);
    expect(result[1].duplicateOfPath).toBe('/mnt/media');
  });
  
  test('content detection works correctly', () => {
    const paths = [
      { path: '/data/movies' },
      { path: '/data/tv' },  
      { path: '/data/other' }
    ];
    
    const moviePaths = detectContentPaths(paths, 'radarr');
    expect(moviePaths).toHaveLength(1);
    expect(moviePaths[0].path).toBe('/data/movies');
  });
});
```

### Integration Tests
```javascript  
describe('Service Integration', () => {
  test('radarr storage processing', async () => {
    const mockService = createMockRadarrService();
    const stats = await mockService.getStats(mockConfig);
    
    expect(stats.storagePaths).toBeDefined();
    expect(stats.storagePaths[0]).toHaveProperty('isDuplicate');
    expect(stats.storagePaths[0]).toHaveProperty('isContentPath');
  });
});
```

## Configuration Examples

### Docker Compose Setup
```yaml
# Services sharing storage
radarr:
  volumes:
    - /mnt/media/movies:/movies
    - /mnt/media/downloads:/downloads

sonarr:
  volumes:  
    - /mnt/media/tv:/tv
    - /mnt/media/downloads:/downloads

qbittorrent:
  volumes:
    - /mnt/media/downloads:/downloads
```

**Result**: TaylorDx correctly identifies `/mnt/media` as shared storage and doesn't triple-count the space.

### Unraid Setup
```
# Unraid share mapping
/mnt/user/media -> radarr:/movies, sonarr:/tv, plex:/data
/mnt/user/downloads -> radarr:/downloads, sonarr:/downloads, qbittorrent:/downloads  
```

**Result**: Duplicate detection prevents quadruple-counting of space usage.

## Troubleshooting

### Common Issues

#### False Duplicate Detection
- **Symptoms**: Different storages marked as duplicates
- **Cause**: Identical storage sizes by coincidence
- **Solution**: Add path hierarchy checks and size thresholds

#### Missing Content Detection  
- **Symptoms**: Shows total disk usage instead of content usage
- **Solution**: Check path naming conventions, add custom keywords

#### Docker Host Misdetection
- **Symptoms**: Services not properly grouped by host
- **Solution**: Verify service configuration and host detection logic

### Debug Commands
```bash
# Check storage API responses
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:5000/api/services/ID/radarr/stats | jq .storagePaths

# View deduplication in action
docker-compose logs backend | grep "duplicate\|storage"
```

This storage deduplication system ensures accurate space reporting across all TaylorDx services while maintaining high performance and reliability.