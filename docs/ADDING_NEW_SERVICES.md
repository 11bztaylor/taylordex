# Adding New Services to TaylorDex

This guide documents the complete process for adding new service integrations to TaylorDex.

## Architecture Overview

TaylorDex uses a modular architecture where each service is completely isolated. If one service fails, others continue working.

backend/src/modules/
├── _template/          # Template for new services
├── radarr/            # Each service is isolated
│   ├── service.js     # Service logic
│   ├── routes.js      # API endpoints
│   └── controller.js  # (Optional) Complex logic
└── services/          # Main controller

## Quick Start

To add a new service (e.g., Jellyfin):

# 1. Create module
cp -r backend/src/modules/_template backend/src/modules/jellyfin

# 2. Edit service.js and routes.js
nano backend/src/modules/jellyfin/service.js
nano backend/src/modules/jellyfin/routes.js

# 3. Update frontend
nano frontend/src/components/services/AddServiceModal.jsx
nano frontend/src/components/services/ServiceCard.jsx

# 4. Add logo
curl -L -o frontend/public/logos/jellyfin.svg "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/jellyfin.svg"

# 5. Register routes
nano backend/index.js

# 6. Restart
docker-compose restart backend

## Key Files to Modify

### 1. Backend Module Structure

- service.js - Core service logic
- routes.js - API endpoints (REQUIRED!)
- controller.js - Optional for complex services

### 2. Frontend Components

- AddServiceModal.jsx - Add to serviceTypes array
- ServiceCard.jsx - Add stats display section
- ServiceIcons - Add icon mapping
- brandColors - Add brand color gradient

### 3. Backend Registration

- backend/index.js - Import and mount routes

## Common Service Patterns

### Basic Stats Service (Prowlarr pattern)
async getStats(config) {
  const data = await this.apiCall(config, '/api/v1/endpoint');
  return {
    count: data.length,
    status: 'online',
    version: data.version
  };
}

### Media Service (*arr pattern)
async getStats(config) {
  const items = await this.apiCall(config, '/api/v3/items');
  const system = await this.apiCall(config, '/api/v3/system/status');
  
  return {
    total: items.length,
    missing: items.filter(i => !i.hasFile).length,
    diskSpace: this.formatBytes(usedSpace),
    version: system.version,
    status: 'online'
  };
}

### Token Auth Service (Plex pattern)
getHeaders(config) {
  return {
    'X-Service-Token': config.api_key,
    'Accept': 'application/json'
  };
}

## Testing Checklist

- [ ] Service appears in Add Service dropdown
- [ ] Test Connection works
- [ ] Service saves to database
- [ ] Stats display in ServiceCard
- [ ] Logo displays correctly
- [ ] Refresh button works
- [ ] Edit/Delete functions work
- [ ] Status Dashboard includes new service

## Troubleshooting

### Backend won't start
# Check logs
docker-compose logs backend -f

# Common fix: Missing routes file
Error: Cannot find module './src/modules/yourservice/routes'

### Stats not showing
- Check browser console for errors
- Verify routes are registered in index.js
- Test API directly:
curl http://localhost:5000/api/yourservice/1/stats

### Service test fails
- Verify API endpoint URLs
- Check authentication headers
- Test with curl using actual service credentials

## Commit Message Convention
git add -A
git commit -m "Add [ServiceName] integration - [brief description]"
# Example: git commit -m "Add Jellyfin integration - media server support"
