# Service Template Creation Guide

This guide explains how to create new service modules using the enhanced template system that includes logging, network discovery, and quick-add functionality.

## Quick Start

1. Copy the `enhanced-service.js` template to your new service directory
2. Update the service-specific configuration
3. Create routes and controller files
4. Add to main app.js
5. Test the implementation

## Step-by-Step Instructions

### 1. Create Service Directory

```bash
mkdir backend/src/modules/[servicename]
cd backend/src/modules/[servicename]
```

### 2. Copy and Customize the Enhanced Template

Copy `enhanced-service.js` to your service directory and customize these sections:

#### A. Basic Service Configuration
```javascript
super('servicename'); // lowercase service name

this.logConfig = {
  endpoint: '/api/v3/log',           // Your service's log API endpoint
  pageSize: 100,
  facilityField: 'logger',           // Field name that contains log categories
  facilities: ['Api', 'Download'],   // Available log categories
  requiresAuth: true,
  supportedLevels: ['Info', 'Debug', 'Warn', 'Error', 'Fatal']
};
```

#### B. Network Discovery Configuration
```javascript
this.detectionRules = [
  {
    method: 'GET',
    path: '/api/v3/system/status',
    expect: { 
      contains: 'yourservice',
      field: 'appName' 
    },
    confidence: 95
  }
];

this.commonPorts = [7878, 8080]; // Ports your service commonly uses
```

#### C. Quick-Add Configuration
```javascript
this.quickAddConfig = {
  name: 'Your Service Name',
  icon: 'your-service-icon',
  description: 'What your service does',
  defaultPort: 7878,
  defaultSsl: false,
  requiredFields: ['name', 'host', 'port', 'api_key'],
  // ... field labels and placeholders
};
```

### 3. Create Routes File

Create `routes.js`:

```javascript
const express = require('express');
const router = express.Router();
const YourServiceController = require('./controller');

// Standard service routes
router.get('/status/:id', YourServiceController.getStatus);
router.post('/test', YourServiceController.testConnection);

// Service-specific routes
router.get('/custom/:id', YourServiceController.getCustomData);

module.exports = router;
```

### 4. Create Controller File

Create `controller.js`:

```javascript
const yourService = require('./service');
const { getServiceConfig } = require('../services/controller');

class YourServiceController {
  async getStatus(req, res) {
    try {
      const { id } = req.params;
      const config = await getServiceConfig(id);
      const stats = await yourService.getStats(config);
      
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async testConnection(req, res) {
    try {
      const config = req.body;
      const result = await yourService.testConnection(config);
      
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Add service-specific controller methods
}

module.exports = new YourServiceController();
```

### 5. Update Main Application

Add your service to `backend/index.js`:

```javascript
// Add to imports
const yourServiceRoutes = require('./src/modules/yourservice/routes');

// Add to route mounting
app.use('/api/yourservice', yourServiceRoutes);

// Add to modules list in health check
modules: ['services', 'radarr', 'sonarr', '...', 'yourservice']
```

### 6. Update Network Discovery

Add your service to the ServiceDetector's detection rules:

```javascript
// In ServiceDetector.js, add to detectionRules object
yourservice: [
  // Copy rules from your service template
]
```

### 7. Update Log Collector

Add your service to LogCollector's service configurations:

```javascript
// In LogCollector.js, add to serviceConfigs
yourservice: {
  endpoint: '/api/v3/log',
  pageSize: 100,
  facilityField: 'logger',
  facilities: ['Api', 'Download', 'Import']
}
```

## Template Checklist

Use this checklist when creating a new service:

### Core Implementation
- [ ] Service class extends BaseService properly
- [ ] Service name is set correctly (lowercase)
- [ ] API endpoints are configured correctly
- [ ] Authentication headers are set properly
- [ ] Error handling is implemented

### Logging Integration
- [ ] Log configuration matches service's API
- [ ] Log facilities are correctly identified
- [ ] Log level mapping is accurate
- [ ] fetchLogs method works with service API
- [ ] normalizeLogEntry handles service's log format

### Network Discovery
- [ ] Detection rules identify service accurately
- [ ] Common ports are listed
- [ ] Confidence scoring is reasonable
- [ ] False positive prevention is considered

### Quick-Add Configuration
- [ ] Form fields match service requirements
- [ ] Default values are sensible
- [ ] Field validation is appropriate
- [ ] Help text is clear

### API Integration
- [ ] getStats method returns useful data
- [ ] testConnection validates properly
- [ ] Connection suggestions are helpful
- [ ] Error messages are user-friendly

### Routes and Controllers
- [ ] Routes follow RESTful conventions
- [ ] Controllers handle errors gracefully
- [ ] Response formats are consistent
- [ ] Service is added to main app

## Example Services

Look at these existing services for reference:

- **Radarr** (`/modules/radarr/`): Full implementation with all features
- **Sonarr** (`/modules/sonarr/`): Similar to Radarr with slight variations
- **Plex** (`/modules/plex/`): Different API structure example

## Testing Your Service

1. **Connection Test**: Use the test endpoint to verify connectivity
2. **Stats Collection**: Check if getStats returns expected data
3. **Log Collection**: Verify logs are fetched and normalized correctly
4. **Network Discovery**: Test detection rules against running service
5. **Quick-Add**: Ensure form creates working service configuration

## Common Patterns

### API Authentication
Most services use API keys in headers:
```javascript
getHeaders(config) {
  return {
    'X-Api-Key': config.api_key,
    'Content-Type': 'application/json'
  };
}
```

### Error Handling
Always provide fallback values:
```javascript
const queue = await this.apiCall(config, '/api/v3/queue')
  .catch(() => ({ totalRecords: 0 }));
```

### Health Indicators
Structure health data consistently:
```javascript
health: {
  database: systemStatus.databaseStatus === 'ok',
  storage: systemStatus.storageStatus === 'ok',
  api: true
}
```

This template system ensures every service has consistent logging, discovery, and management capabilities.