# Stats Implementation Priority Guide

Based on the comprehensive stats template, here's the priority list for implementing enhanced stats across services:

## ✅ Already Implemented (Full Template)

### 1. **Sonarr** - COMPLETE
- Basic stats: series, episodes, missing, monitored
- Enhanced storage with duplicate detection
- Queue details with progress
- Recent episodes & downloads
- Airing schedule (today/week)
- Health monitoring
- Genre breakdown

### 2. **Radarr** - COMPLETE  
- Basic stats: movies, missing, monitored
- Enhanced storage with duplicate detection
- Queue details with progress
- Recent additions & downloads
- Quality breakdown
- Upcoming releases
- Health monitoring

### 3. **Prowlarr** - COMPLETE
- Basic stats: indexers, enabled
- Indexer performance stats (24h queries, grabs, failures)
- Health monitoring
- Connected apps list
- Download clients
- Success rate calculation

## 🚧 Needs Enhancement

### 1. **Lidarr** (Priority: HIGH)
Currently has basic stats only. Needs:
- [ ] Enhanced storage paths with duplicate detection
- [ ] Queue details with download progress
- [ ] Recent album additions
- [ ] Recent downloads history
- [ ] Quality breakdown
- [ ] Genre breakdown for music
- [ ] Health monitoring
- [ ] Upcoming releases calendar

### 2. **Readarr** (Priority: HIGH)
Not implemented yet. Needs full implementation:
- [ ] Basic stats: authors, books, missing
- [ ] Enhanced storage paths
- [ ] Queue details
- [ ] Recent book additions
- [ ] Reading list/wishlist
- [ ] Format breakdown (epub, mobi, pdf)
- [ ] Health monitoring

### 3. **Bazarr** (Priority: MEDIUM)
Not implemented yet. Needs:
- [ ] Basic stats: series, movies, subtitles
- [ ] Language breakdown
- [ ] Provider statistics
- [ ] Recent downloads
- [ ] Missing subtitles count
- [ ] Health monitoring

## 🔄 Download Clients

### 1. **qBittorrent** (Priority: HIGH)
New service. Needs:
- [ ] Basic stats: torrents, active, paused
- [ ] Transfer rates (up/down speeds)
- [ ] Total uploaded/downloaded
- [ ] Ratio statistics
- [ ] Active downloads with progress
- [ ] Category breakdown
- [ ] Free space monitoring

### 2. **Transmission** (Priority: MEDIUM)
If added. Similar to qBittorrent:
- [ ] Active torrents
- [ ] Transfer statistics
- [ ] Session stats
- [ ] Queue management

### 3. **SABnzbd** (Priority: MEDIUM)
If added. Needs:
- [ ] Queue status
- [ ] Download speed
- [ ] History
- [ ] Disk space
- [ ] Categories

## 📺 Media Servers

### 1. **Plex** (Priority: MEDIUM)
Currently basic. Needs enhancement:
- [ ] Library breakdown by type
- [ ] Active streams detail
- [ ] Recently added media
- [ ] User activity
- [ ] Transcoding sessions
- [ ] Bandwidth usage

### 2. **Jellyfin** (Priority: LOW)
If added. Similar to Plex:
- [ ] Library statistics
- [ ] Active users
- [ ] Stream details
- [ ] Server performance

## 🖥️ System Services

### 1. **Unraid** (Priority: MEDIUM)
Has some stats. Needs:
- [ ] Array health details
- [ ] Temperature monitoring
- [ ] Docker container management
- [ ] VM statistics
- [ ] Plugin status
- [ ] Share usage details

### 2. **Portainer** (Priority: LOW)
If added. Needs:
- [ ] Container statistics
- [ ] Stack management
- [ ] Volume usage
- [ ] Network details
- [ ] Image management

## Implementation Checklist for Each Service

When implementing stats for a service, follow this checklist:

### 1. **Update Service Backend** (`/backend/src/modules/{service}/service.js`)
```javascript
// Add these methods to getStats():
- [ ] Parallel API calls with Promise.all()
- [ ] Enhanced storage paths with duplicate detection  
- [ ] Queue/activity tracking
- [ ] Recent items processing
- [ ] Health monitoring
- [ ] Category breakdowns
- [ ] Error handling with fallbacks
```

### 2. **Update Service Card** (`/frontend/src/components/services/ServiceCard.jsx`)
```javascript
// Add service-specific stat displays:
- [ ] Primary metric display
- [ ] Secondary metrics
- [ ] Queue indicator
- [ ] Health status
```

### 3. **Update Service Detail Modal**
```javascript
// Ensure modal tabs show:
- [ ] Overview with all basic stats
- [ ] Storage tab with path details
- [ ] Activity/Queue tab
- [ ] Health tab (if applicable)
```

### 4. **Test Implementation**
- [ ] Stats load within 2 seconds
- [ ] All values display correctly
- [ ] Error states handled gracefully
- [ ] Storage deduplication works
- [ ] Byte formatting is consistent

## Quick Start for New Service

1. Copy `/backend/src/modules/sonarr/service.js` as template
2. Adjust API endpoints for target service
3. Modify stat calculations for service type
4. Test with actual service instance
5. Update frontend displays

## Notes

- **Storage Path Detection**: All services should use the enhanced storage path detection with duplicate handling
- **Docker Integration**: Services should detect if running in Docker and show host information
- **Performance**: Limit arrays to 10-20 items, use pagination for larger sets
- **Consistency**: Use the same field names across services where possible