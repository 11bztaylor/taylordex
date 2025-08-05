# TaylorDex Troubleshooting Guide

## Quick Diagnostics

### 1. Check All Services Status
```bash
docker-compose ps
```
All services should show "Up" status. Expected output:
```
NAME                          STATUS    PORTS
docker-dashboard-backend-1    Up        0.0.0.0:5000->5000/tcp
docker-dashboard-frontend-1   Up        0.0.0.0:3000->3000/tcp
docker-dashboard-postgres-1   Up        0.0.0.0:5432->5432/tcp
docker-dashboard-redis-1      Up        0.0.0.0:6379->6379/tcp
```

### 2. View Service Logs
```bash
# All logs
docker-compose logs -f

# Specific service
docker-compose logs backend -f
docker-compose logs frontend -f
docker-compose logs postgres -f
```

### 3. Test Backend API
```bash
# Health check
curl http://localhost:5000/api/health

# Get all services
curl http://localhost:5000/api/services

# Test comprehensive status
curl http://localhost:5000/api/services/status/comprehensive
```

---

## Common Issues & Solutions

### Frontend Issues

#### 1. "Failed to fetch services" or Network Errors
**Symptoms**: Services don't load, error messages in UI

**Solutions**:
```bash
# Check if backend is running
docker-compose ps backend

# Check backend logs
docker-compose logs backend --tail=50

# Restart backend
docker-compose restart backend

# Check CORS issues in browser console
# Backend should have CORS enabled for http://localhost:3000
```

#### 2. UI Not Loading / White Screen
**Symptoms**: Blank page at http://localhost:3000

**Solutions**:
```bash
# Check frontend logs
docker-compose logs frontend --tail=50

# Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend

# Check browser console for errors (F12)
```

#### 3. Loading Skeletons Stuck
**Symptoms**: Loading animations never complete

**Debug Steps**:
1. Open browser DevTools (F12)
2. Check Network tab for failed requests
3. Look for 500 errors from backend
4. Check Console for JavaScript errors

### Backend Issues

#### 1. Database Connection Errors
**Error**: `Error initializing database: connection timeout`

**Solutions**:
```bash
# Check if postgres is running
docker-compose ps postgres

# Test database connection
docker-compose exec postgres psql -U taylordex -d taylordex -c "SELECT 1;"

# Reset database
docker-compose down -v  # WARNING: This deletes all data
docker-compose up -d
```

#### 2. Service Connection Failed
**Error**: `Failed to connect to Radarr/Sonarr/etc`

**Checklist**:
1. Verify service URL is accessible:
   ```bash
   curl http://pidocker.taylorhomelink.com:7878/api/v3/system/status?apikey=YOUR_KEY
   ```

2. Check API key is correct:
   - Radarr: Settings → General → API Key
   - Sonarr: Settings → General → API Key
   - Plex: Need X-Plex-Token

3. Test from backend container:
   ```bash
   docker-compose exec backend curl http://pidocker.taylorhomelink.com:7878
   ```

#### 3. Enhanced Data Not Loading
**Symptoms**: Basic stats work but enhanced data missing

**Debug**:
```bash
# Check specific service endpoint
curl http://localhost:5000/api/radarr/1/stats

# Enable debug logging
docker-compose exec backend npm run debug
```

### Service-Specific Issues

#### Radarr/Sonarr
**Issue**: Queue items showing "Unknown" title

**Fix Applied**: Enhanced parsing in `sonarr/service.js`
```javascript
// Now extracts title from episode data or sourceTitle
episodeTitle = q.episode?.title || extractFromSourceTitle(q.title)
```

#### Plex
**Issue**: Shows as offline despite being accessible

**Solution**: Add Plex token
1. Get token from Plex: https://support.plex.tv/articles/204059436
2. Update service with token as API key

#### Prowlarr
**Issue**: Indexer stats not showing

**Check**:
```bash
# Verify Prowlarr API v1 is enabled
curl http://YOUR_HOST:9696/api/v1/indexer/stats?apikey=YOUR_KEY
```

### Performance Issues

#### 1. Slow Status Page Load
**Symptoms**: Status tab takes >5 seconds to load

**Optimizations**:
1. Check service response times:
   ```bash
   curl -w "@curl-format.txt" http://localhost:5000/api/services/status/comprehensive
   ```

2. Reduce parallel service calls if needed
3. Increase service timeout in `baseService.js`

#### 2. High Memory Usage
**Check memory**:
```bash
docker stats
```

**Solutions**:
- Limit service stats retention
- Reduce refresh interval
- Add memory limits to docker-compose.yml

### Database Issues

#### View Database Content
```bash
# Connect to database
docker-compose exec postgres psql -U taylordex -d taylordex

# Useful queries
\dt                          # List tables
SELECT * FROM services;      # View all services
SELECT COUNT(*) FROM service_stats; # Check stats count

# Clean old stats (keep last 7 days)
DELETE FROM service_stats 
WHERE fetched_at < NOW() - INTERVAL '7 days';
```

#### Reset Specific Service
```sql
-- Delete service and its stats
DELETE FROM services WHERE id = 1;
```

---

## Debug Mode

### Enable Detailed Logging

1. **Backend Logging**:
   ```javascript
   // Add to any module for debugging
   console.log('[ModuleName] Debug info:', data);
   ```

2. **Frontend Logging**:
   ```javascript
   // In components
   console.log('Component State:', this.state);
   ```

3. **Network Debugging**:
   - Browser: F12 → Network tab
   - Filter by XHR/Fetch
   - Check request/response details

### Test Individual Components

#### Test Service Connection
```bash
# Direct service test
curl -X POST http://localhost:5000/api/services/test \
  -H "Content-Type: application/json" \
  -d '{
    "type": "radarr",
    "host": "pidocker.taylorhomelink.com",
    "port": 7878,
    "apiKey": "YOUR_API_KEY"
  }'
```

#### Test Enhanced Endpoints
```bash
# Health check
curl http://localhost:5000/api/services/status/health

# Activity feed
curl http://localhost:5000/api/services/status/activity?limit=10

# Service history
curl http://localhost:5000/api/services/status/history/1?hours=24
```

---

## Emergency Recovery

### Full Reset (Nuclear Option)
```bash
# Stop everything
docker-compose down

# Remove all data
docker-compose down -v

# Rebuild from scratch
docker-compose build --no-cache
docker-compose up -d

# Check logs
docker-compose logs -f
```

### Backup & Restore

#### Backup Database
```bash
# Backup
docker-compose exec postgres pg_dump -U taylordex taylordex > backup.sql

# Restore
docker-compose exec -T postgres psql -U taylordex taylordex < backup.sql
```

---

## Monitoring & Alerts

### Set Up Health Monitoring
```bash
# Create health check script
cat > check-health.sh << 'EOF'
#!/bin/bash
response=$(curl -s http://localhost:5000/api/health)
if [[ $response == *"OK"* ]]; then
  echo "✓ TaylorDex is healthy"
else
  echo "✗ TaylorDex is down!"
  # Add notification here
fi
EOF

chmod +x check-health.sh
```

### Log Monitoring
```bash
# Watch for errors
docker-compose logs -f | grep -i error

# Save logs for analysis
docker-compose logs > taylordex-logs-$(date +%Y%m%d).log
```

---

## Getting Help

### Collect Debug Information
When reporting issues, include:

1. **System Info**:
   ```bash
   docker --version
   docker-compose --version
   uname -a
   ```

2. **Service Status**:
   ```bash
   docker-compose ps
   ```

3. **Recent Logs**:
   ```bash
   docker-compose logs --tail=100 > debug-logs.txt
   ```

4. **API Response**:
   ```bash
   curl -v http://localhost:5000/api/health
   curl -v http://localhost:5000/api/services
   ```

### Debug Checklist
- [ ] All Docker containers running?
- [ ] Can access http://localhost:3000?
- [ ] Can access http://localhost:5000/api/health?
- [ ] PostgreSQL accepting connections?
- [ ] External services (Radarr, etc.) accessible?
- [ ] Correct API keys configured?
- [ ] No CORS errors in browser console?
- [ ] No JavaScript errors in browser console?
- [ ] Network tab shows successful API calls?

---

## Preventive Maintenance

### Regular Tasks
1. **Weekly**: Check service health status
2. **Monthly**: Review error logs
3. **Quarterly**: Clean old stats from database
4. **Yearly**: Update base Docker images

### Monitoring Commands
```bash
# Quick health check
curl -s http://localhost:5000/api/services/status/health | jq .summary

# Check database size
docker-compose exec postgres psql -U taylordex -c "SELECT pg_database_size('taylordex');"

# View error count
docker-compose logs backend | grep -c ERROR
```