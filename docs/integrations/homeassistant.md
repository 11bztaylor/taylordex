# Home Assistant Integration Guide

## Overview

TaylorDx integrates with Home Assistant using a hybrid WebSocket + REST API approach for real-time monitoring and control capabilities.

## Features

- **Real-time entity monitoring** via WebSocket connection
- **Device state tracking** (online/offline/unavailable counts)
- **Automation management** (view enabled/total automations)
- **Script execution** and control
- **Light control** with brightness and color support
- **Shell command execution** through Home Assistant
- **System controls** (restart, reload configuration)

## Authentication Setup

Home Assistant requires a **Long-Lived Access Token** for API authentication.

### Finding Access Tokens by Version

The location of access token creation varies by Home Assistant version:

#### Modern Versions (2023.8+ including 2025.6.3)
1. Click your **profile icon** (bottom left corner)  
2. Go to **"Security"** tab
3. Scroll to **"Long-lived access tokens"** section (bottom of page)

*Note: Confirmed working with Home Assistant 2025.6.3*

#### Older Versions (Pre-2023.8)
1. Click your **profile icon** (bottom left corner)
2. Look for **"Long-lived access tokens"** section directly in profile

### Creating an Access Token

1. Click **"Create Token"**
2. Enter a descriptive name: `TaylorDx Dashboard`
3. Click **"OK"** or **"Create"**
4. **⚠️ IMPORTANT**: Copy the token immediately - you cannot view it again!
5. Store the token securely

Example token format:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI4MjExM2R...
```

## Adding Home Assistant to TaylorDx

### Step 1: Add Service
1. Open TaylorDx dashboard
2. Go to **Services** tab
3. Click **"Add Service"**
4. Select **"Home Assistant"** from service type dropdown

### Step 2: Configuration
- **Name**: Give your service a name (e.g., "Home Assistant")
- **Host**: Your Home Assistant IP address (e.g., `192.168.1.100`)
- **Port**: Home Assistant port (default: `8123`)
- **API Key**: Paste your Long-Lived Access Token

### Step 3: Test Connection
1. Click **"Test Connection"**
2. Verify successful connection
3. Click **"Save"** to add the service

## Service Information Displayed

The Home Assistant service card shows:

- **Entities**: Total number of entities in your system
- **Online Devices**: Count of devices currently online
- **Automations**: Enabled automations out of total count
- **WebSocket**: Real-time connection status

## Advanced Features

### WebSocket Real-Time Updates
- Automatically connects WebSocket for live entity state changes
- Falls back to REST API if WebSocket unavailable
- Displays connection status in service card

### Available Controls
- **Light Control**: Turn lights on/off with brightness and color
- **Automation Triggers**: Execute automations remotely
- **Script Execution**: Run Home Assistant scripts
- **System Commands**: Restart Home Assistant or reload configuration
- **Shell Commands**: Execute system commands through Home Assistant

## API Endpoints

### Basic Operations
- `GET /api/homeassistant/{id}/stats` - Get basic statistics
- `GET /api/homeassistant/{id}/enhanced-stats` - Get real-time enhanced stats
- `POST /api/homeassistant/{id}/connect` - Establish WebSocket connection

### Device Control
- `POST /api/homeassistant/{id}/lights/control` - Control lights
- `POST /api/homeassistant/{id}/automations/run` - Trigger automations
- `POST /api/homeassistant/{id}/scripts/run` - Execute scripts

### System Operations
- `POST /api/homeassistant/{id}/system/control` - System commands
- `POST /api/homeassistant/{id}/execute-command` - Shell commands
- `GET /api/homeassistant/{id}/entities/states` - Get entity states

## Troubleshooting

### Connection Issues

**Problem**: "Connection refused" error
**Solution**: 
- Verify Home Assistant is running and accessible
- Check IP address and port (default: 8123)
- Ensure no firewall blocking the connection
- Test URL in browser: `http://YOUR_IP:8123`

**Problem**: "Invalid token" error
**Solution**:
- Verify token was copied completely (they're very long)
- Check token hasn't expired
- Create a new Long-Lived Access Token

**Problem**: "WebSocket connection failed"
**Solution**:
- WebSocket connections work on same port as HTTP
- Some reverse proxies need WebSocket support enabled
- Integration will fall back to REST API automatically

### Version Detection

TaylorDx automatically detects your Home Assistant version through the `/api/` endpoint and displays it in the connection test results.

### Performance Considerations

- **WebSocket connections** are lightweight and efficient for real-time updates
- **Entity state caching** reduces API calls
- **Connection pooling** optimizes REST API performance
- **Automatic reconnection** handles temporary network issues

### Security Notes

- **Store tokens securely** - treat them like passwords
- **Use descriptive names** for tokens to track their usage
- **Rotate tokens regularly** for security best practices
- **Revoke unused tokens** in Home Assistant security settings

## Example Integration

```javascript
// Test Home Assistant connection
curl -X POST http://localhost:5000/api/homeassistant/test \
  -H "Content-Type: application/json" \
  -d '{
    "host": "192.168.1.100",
    "port": 8123,
    "apiKey": "your_long_lived_access_token_here"
  }'

// Get enhanced statistics
curl http://localhost:5000/api/homeassistant/1/enhanced-stats

// Control a light
curl -X POST http://localhost:5000/api/homeassistant/1/lights/control \
  -H "Content-Type: application/json" \
  -d '{
    "entityId": "light.living_room",
    "action": "turn_on",
    "brightness": 200,
    "color": [255, 0, 0]
  }'
```

---

*This integration provides comprehensive Home Assistant monitoring and control capabilities while following security best practices and Home Assistant's recommended API patterns.*