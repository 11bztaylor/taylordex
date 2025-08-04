# Radarr Backend Integration Guide

## Quick Task Summary
Connect the beautiful Services UI to real Radarr API

## Files to Work With
- Backend: `/backend/index.js` - Add routes here
- Frontend: `/frontend/src/App.jsx` - Has mock data to replace
- Database: PostgreSQL already running in Docker

## API Endpoints Needed
- GET /api/services - List saved services
- POST /api/services - Save new service
- POST /api/services/test - Test connection

## Radarr Connection
- Host: pidocker.taylorhomelink.com:7878
- Test endpoint: /api/v3/system/status
- Needs header: X-Api-Key

## Next Steps
1. Install: docker-compose exec backend npm install axios pg
2. Create routes in backend/index.js
3. Test with curl
4. Update frontend to use real API
