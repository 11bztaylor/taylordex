# Network Discovery System Guide

This document covers the comprehensive network discovery system implemented in TaylorDex, including the workflow fixes and individual service configuration process.

## Overview

The Network Discovery system allows automatic detection and configuration of services on your network, with a focus on Docker environments and *arr applications.

## Fixed Workflow

### Previous Issues
- Scanner tried to authenticate during discovery phase
- "Access token required" errors prevented scanning
- Bulk service addition without individual configuration
- Services added without proper API keys/credentials

### Current Workflow (Fixed)
1. **Discovery Phase** - Unauthenticated service detection
2. **Selection Phase** - Choose which services to configure
3. **Configuration Phase** - Individual service setup with credentials
4. **Testing Phase** - Test each service connection individually  
5. **Addition Phase** - Add successfully tested services

## Scan Types Supported

### 1. Auto-Detect Network
- Automatically detects your local network range
- Scans common service ports
- Best for initial setup

### 2. CIDR Network  
- Enter network in CIDR notation (e.g., `192.168.1.0/24`)
- Comprehensive subnet scanning
- Good for known network layouts

### 3. IP Range
- Specify start and end IP addresses
- Example: `192.168.100.1` to `192.168.100.10`
- Precise control over scan range

### 4. Single Host
- Test a specific IP address
- Quick verification of known services
- Useful for troubleshooting

## Service Detection Logic

### Unauthenticated Detection Methods
Services are detected without requiring API keys during the discovery phase:

#### *arr Services (Radarr, Sonarr, Lidarr, etc.)
- **Primary**: Homepage title matching (`/` endpoint)
- **Secondary**: 401/403 status from API endpoints (confirms API exists)
- **Ports**: Standard ports (7878 for Radarr, 8989 for Sonarr, etc.)

#### Download Clients
- **qBittorrent**: Web UI detection, API endpoint verification
- **Transmission**: RPC endpoint detection
- **Deluge**: Web interface detection

#### Media Servers
- **Plex**: Identity endpoint, web interface
- **Jellyfin**: System info endpoint
- **Emby**: Similar to Jellyfin

### Detection Confidence Scoring
- **90%+**: Multiple positive indicators (title + API + port)
- **80-89%**: Title match + standard port
- **70-79%**: Title match or API detection
- **60-69%**: Port-based detection only

## Individual Service Configuration

### Configuration Form Fields

#### Basic Settings
- **Service Name**: Display name (auto-populated)
- **Host**: IP address (auto-populated from scan)
- **Port**: Service port (auto-populated)
- **SSL**: Use HTTPS checkbox
- **Enable**: Enable service checkbox

#### Authentication (Service-Specific)

##### *arr Services (API Key Required)
- **API Key**: Required field with service-specific instructions
- **Instructions**: 
  - Radarr/Sonarr/Lidarr: "Settings → General → Security → API Key"
  - Prowlarr: "Settings → General → Security → API Key"
  - Bazarr: "Settings → General → Security → API Key"

##### Download Clients (Username/Password)
- **Username**: Web UI username
- **Password**: Web UI password
- **Instructions**: "Username and password from Web UI settings"

##### Media Servers
- **Plex**: Token from "Settings → Network → Show Advanced"
- **Jellyfin**: API key from Dashboard → API Keys

### Test & Add Workflow

#### 1. Test Connection
- Click "Test Connection" for each service
- Verifies credentials and connectivity
- Shows success/failure with detailed messages
- Timestamps test results

#### 2. Add Service (After Successful Test)
- "Add Service" button enabled only after successful test
- Individual API call to save service to database
- Real-time feedback on addition status
- "Added Successfully" confirmation

#### 3. Progress Tracking
- Footer shows "X of Y services added"
- "Done" button appears when all services processed
- Can return to results to configure additional services

## Error Handling

### Network Errors
- Connection timeouts during scanning
- Host unreachable scenarios  
- Graceful degradation with partial results

### Authentication Errors
- Invalid API keys during testing
- Wrong username/password combinations
- Clear error messages with troubleshooting hints

### Service Addition Errors
- Database connection issues
- Validation failures
- Rollback on partial failures

## Supported Services

### Currently Implemented
- **Radarr** - Movie management
- **Sonarr** - TV series management  
- **Lidarr** - Music management
- **Prowlarr** - Indexer management
- **Bazarr** - Subtitle management
- **qBittorrent** - Torrent client
- **Plex** - Media server
- **Jellyfin** - Open source media server
- **Unraid** - NAS system

### Detection Ports
```javascript
const commonPorts = {
  radarr: [7878],
  sonarr: [8989], 
  lidarr: [8686],
  prowlarr: [9696],
  bazarr: [6767],
  qbittorrent: [8080, 8081],
  plex: [32400],
  jellyfin: [8096],
  unraid: [80, 443]
}
```

## Configuration Examples

### Docker Environment Scanning
```
Network Range: 192.168.100.1-192.168.100.10
Services Found:
- 192.168.100.4:7878 - Radarr (95% confidence)
- 192.168.100.5:8989 - Sonarr (92% confidence)  
- 192.168.100.1:8080 - qBittorrent (88% confidence)
```

### Home Network Scanning
```
CIDR: 192.168.1.0/24
Auto-detected:
- 192.168.1.100:32400 - Plex (98% confidence)
- 192.168.1.50:8989 - Sonarr (90% confidence)
```

## Troubleshooting

### Common Issues

#### "Access token required" During Scan
- **Cause**: Old detection rules trying to authenticate
- **Status**: FIXED in current version
- **Solution**: Update to latest version with unauthenticated detection

#### Services Not Detected
1. Check if service is running and accessible
2. Verify ports are correct and not blocked
3. Ensure web interfaces are enabled
4. Try single host scan for specific IP

#### Test Connection Fails
1. Verify API key is correct and active
2. Check username/password for download clients
3. Ensure service allows API access
4. Verify network connectivity

#### Service Addition Fails
1. Check backend logs for detailed errors
2. Verify database connectivity  
3. Ensure no duplicate services
4. Check service configuration format

### Log Locations
- **Backend**: Docker logs via `docker-compose logs backend`
- **Frontend**: Browser developer console (F12)
- **Network Scanner**: Backend discovery module logs

### Debug Mode
Enable enhanced logging by setting environment variables:
```bash
DEBUG_DISCOVERY=true
DEBUG_SERVICE_DETECTION=true
```

## Best Practices

### Before Scanning
1. Ensure all services are running
2. Enable web interfaces where applicable
3. Have API keys readily available
4. Plan your network range carefully

### During Configuration
1. Test each service individually
2. Use meaningful service names
3. Verify SSL settings match your setup
4. Enable services you want monitored

### After Addition
1. Verify services appear in dashboard
2. Check stats are loading correctly
3. Test service detail modals
4. Verify storage information is accurate

## API Endpoints

### Discovery Endpoints
- `POST /api/discovery/scan` - Start network scan
- `GET /api/discovery/scan/:scanId` - Get scan progress  
- `DELETE /api/discovery/scan/:scanId` - Cancel scan

### Service Management  
- `POST /api/services` - Add discovered service
- `GET /api/services` - List all services
- `GET /api/services/:id/stats` - Get service statistics

## Security Considerations

### API Key Handling
- Keys encrypted in database
- Never logged in plaintext
- Transmitted over HTTPS only
- Masked in UI displays

### Network Scanning
- Respects rate limits
- Uses reasonable timeouts  
- No aggressive port scanning
- Graceful failure handling

### Authentication
- All API calls require valid session
- RBAC permissions enforced
- Audit trail maintained

## Future Enhancements

### Planned Features
1. **Scheduled Scanning** - Automatic periodic discovery
2. **Service Templates** - Pre-configured service types
3. **Bulk Configuration** - Configure multiple similar services
4. **Advanced Filtering** - More sophisticated service detection
5. **Integration APIs** - Direct integration with Docker APIs

### Extensibility
- Modular detection rules
- Pluggable service types
- Configurable scan parameters
- Custom authentication methods