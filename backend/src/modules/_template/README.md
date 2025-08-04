# Service Module Template - Complete Guide

## 🚀 Quick Add Checklist
When adding a new service, you need:
1. ✅ Backend service module (service.js)
2. ✅ Backend routes (routes.js) 
3. ✅ Frontend service type in AddServiceModal.jsx
4. ✅ Frontend stats display in ServiceCard.jsx
5. ✅ Service logo in frontend/public/logos/
6. ✅ Register routes in backend/index.js

## 📁 Step 1: Create Service Module

Copy template (replace 'yourservice' with actual name like 'plex')
cp -r backend/src/modules/_template backend/src/modules/yourservice

## 📝 Step 2: Create service.js

const BaseService = require('../../utils/baseService');

class YourServiceService extends BaseService {
  constructor() {
    super('YourService'); // Display name
  }

  getHeaders(config) {
    return {
      'X-Api-Key': config.api_key  // Or whatever auth your service uses
    };
  }

  async getStats(config) {
    try {
      // Make API calls to your service
      const data = await this.apiCall(config, '/api/endpoint');
      
      return {
        // Return stats that make sense for your service
        items: data.length,
        status: 'online',
        version: data.version
      };
    } catch (error) {
      console.error(`Error fetching ${this.serviceName} stats:`, error.message);
      return {
        items: 0,
        status: 'error',
        error: error.message,
        version: 'Unknown'
      };
    }
  }
}

module.exports = new YourServiceService();

## 📝 Step 3: Create routes.js (DON'T FORGET THIS!)

const express = require('express');
const router = express.Router();
const yourServiceService = require('./service');
const { query } = require('../../database/connection');

router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      'SELECT * FROM services WHERE id = $1 AND type = $2',
      [id, 'yourservice']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    const config = result.rows[0];
    const stats = await yourServiceService.getStats(config);

    await query(
      'INSERT INTO service_stats (service_id, stats) VALUES ($1, $2)',
      [id, JSON.stringify(stats)]
    );

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

## 🎨 Step 4: Update Frontend - AddServiceModal.jsx
Add to the serviceTypes array:
{ value: 'yourservice', label: 'YourService', defaultPort: 8080, icon: '/logos/yourservice.svg' }

## 🎨 Step 5: Update Frontend - ServiceCard.jsx
Add stats display after other service types (around line 230):
{service.type === 'yourservice' && (
  <>
    {stats.items !== undefined && (
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-400">Items</span>
        <span className="text-sm text-green-400 font-medium">{stats.items}</span>
      </div>
    )}
    // Add more stats displays as needed
  </>
)}

## 🎨 Step 6: Add Logo
# Download or create logo
wget -O frontend/public/logos/yourservice.svg "https://url-to-logo"
# OR
curl -L -o frontend/public/logos/yourservice.svg "https://url-to-logo"

## 🔧 Step 7: Register Routes in backend/index.js

Add import after other routes:
const yourServiceRoutes = require('./src/modules/yourservice/routes');

Mount the routes:
app.use('/api/yourservice', yourServiceRoutes);

## 🧪 Testing Your Service
# Restart backend
docker-compose restart backend

# Test connection directly
curl -X POST http://localhost:5000/api/services/test \
  -H "Content-Type: application/json" \
  -d '{
    "type": "yourservice",
    "host": "localhost",
    "port": 8080,
    "apiKey": "your-api-key"
  }'

## 🐛 Common Issues

- "Cannot find module" - You forgot to create routes.js
- Service doesn't appear in dropdown - Update AddServiceModal.jsx
- Stats show "Unable to fetch" - Check routes registration in index.js
- No logo showing - Check logo path and that it's valid SVG

## 📚 Examples to Reference

- Simple stats: See prowlarr/service.js
- Complex stats: See sonarr/service.js
- Different auth: See plex/service.js (uses X-Plex-Token)
- Custom endpoints: See radarr/controller.js

## 🎯 Service Naming Conventions

- Module folder: lowercase (e.g., plex, radarr)
- Service class: PascalCase + Service (e.g., PlexService)
- Routes file: Always routes.js
- Service type in DB: lowercase (matches folder name)
