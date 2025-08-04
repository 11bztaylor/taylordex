# Service Module Template

## How to Add a New Service

1. **Copy this template folder**
   ```bash
   cp -r backend/src/modules/_template backend/src/modules/yourservice
   ```

2. **Update the service.js file**
   - Change class name from `TemplateService` to `YourServiceService`
   - Update `super('TEMPLATE')` to `super('YourService')`
   - Implement `getStats()` with your service's specific API calls
   - Add any custom methods your service needs

3. **Create controller.js (optional)**
   - Only needed if you have service-specific endpoints
   - Copy from radarr/controller.js as example

4. **Create routes.js (optional)**
   - Only needed if you have service-specific endpoints
   - Copy from radarr/routes.js as example

5. **Register your service type**
   - No registration needed! The main services controller automatically detects modules

## Service Requirements

Your service.js must implement:
- `getHeaders(config)` - Return headers for API authentication
- `getStats(config)` - Return service statistics
- `testConnection(config)` - Inherited from BaseService, override if needed

## Example Services

Look at these implemented services for examples:
- `radarr/` - Full implementation with custom endpoints
- `sonarr/` - Similar to Radarr
- `bazarr/` - Simpler implementation

## Testing Your Service

```bash
# Test connection
curl -X POST http://localhost:5000/api/services/test \
  -H "Content-Type: application/json" \
  -d '{
    "type": "yourservice",
    "host": "localhost",
    "port": 8080,
    "apiKey": "your-api-key"
  }'
```
