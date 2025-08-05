# TaylorDex API Documentation

## Overview
The TaylorDex API provides comprehensive management and monitoring capabilities for Docker services, with a focus on media server integrations (*arr services, Plex, etc.).

**Base URL**: `http://localhost:5000/api`

## Table of Contents
1. [Service Management](#service-management)
2. [Status Monitoring](#status-monitoring)
3. [Service-Specific Endpoints](#service-specific-endpoints)
4. [Error Handling](#error-handling)
5. [Data Models](#data-models)

---

## Service Management

### Get All Services
Returns a list of all configured services with their latest stats.

**Endpoint**: `GET /api/services`

**Response**:
```json
{
  "success": true,
  "services": [
    {
      "id": 1,
      "name": "Main Radarr",
      "type": "radarr",
      "host": "pidocker.taylorhomelink.com",
      "port": 7878,
      "enabled": true,
      "status": "online",
      "stats": {
        "movies": 3059,
        "missing": 94,
        "diskSpace": "60.23 TB"
      },
      "lastSeen": "2025-08-05T10:30:00Z"
    }
  ]
}
```

### Get Single Service
**Endpoint**: `GET /api/services/:id`

### Create Service
**Endpoint**: `POST /api/services`

**Request Body**:
```json
{
  "name": "Main Radarr",
  "type": "radarr",
  "host": "pidocker.taylorhomelink.com",
  "port": 7878,
  "apiKey": "your-api-key-here"
}
```

**Supported Types**: `radarr`, `sonarr`, `plex`, `prowlarr`, `lidarr`, `bazarr`, `readarr`

### Update Service
**Endpoint**: `PUT /api/services/:id`

**Request Body** (partial update supported):
```json
{
  "name": "Updated Name",
  "enabled": false,
  "apiKey": "new-api-key"
}
```

### Delete Service
**Endpoint**: `DELETE /api/services/:id`

### Test Service Connection
**Endpoint**: `POST /api/services/test`

**Request Body**:
```json
{
  "type": "radarr",
  "host": "pidocker.taylorhomelink.com",
  "port": 7878,
  "apiKey": "your-api-key"
}
```

**Response**:
```json
{
  "success": true,
  "version": "3.2.2.5080",
  "message": "Connected to Radarr"
}
```

---

## Status Monitoring

### Comprehensive Status
Aggregates data from all enabled services into a unified dashboard view.

**Endpoint**: `GET /api/services/status/comprehensive`

**Response**:
```json
{
  "success": true,
  "timestamp": "2025-08-05T10:30:00Z",
  "data": {
    "overview": {
      "totalServices": 4,
      "servicesOnline": 3,
      "servicesOffline": 1,
      "totalMedia": 3188,
      "totalMissing": 223,
      "activeActivity": 11,
      "totalStorage": 61.24
    },
    "downloads": {
      "total": 11,
      "active": 3,
      "queued": 8,
      "items": [
        {
          "service": "Main Radarr",
          "type": "radarr",
          "title": "Movie Title",
          "progress": 67,
          "eta": "00:15:30",
          "size": "15.2 GB",
          "status": "downloading"
        }
      ]
    },
    "streaming": {
      "active": 2,
      "bandwidth": 45,
      "sessions": [
        {
          "service": "Plex",
          "user": "John Doe",
          "media": "Movie Name",
          "type": "Direct Play",
          "quality": "1080p",
          "bandwidth": "25 Mbps"
        }
      ]
    },
    "alerts": [
      {
        "service": "Main Radarr",
        "type": "warning",
        "message": "Download client unavailable",
        "timestamp": "2025-08-05T10:25:00Z"
      }
    ],
    "performance": {
      "responseTime": 523,
      "servicesChecked": 4,
      "servicesResponded": 3,
      "lastUpdate": "2025-08-05T10:30:00Z"
    }
  }
}
```

### Service Health Check
Quick health status of all services.

**Endpoint**: `GET /api/services/status/health`

**Response**:
```json
{
  "success": true,
  "health": [
    {
      "id": 1,
      "name": "Main Radarr",
      "type": "radarr",
      "enabled": true,
      "status": "online",
      "lastSeen": "2025-08-05T10:30:00Z",
      "isStale": false,
      "isDown": false
    }
  ],
  "summary": {
    "total": 4,
    "enabled": 4,
    "online": 3,
    "offline": 1,
    "stale": 0
  }
}
```

### Activity Feed
Recent activity across all services.

**Endpoint**: `GET /api/services/status/activity?limit=50`

**Response**:
```json
{
  "success": true,
  "activities": [
    {
      "service": "Main Radarr",
      "type": "movie_added",
      "title": "Movie Title (2024)",
      "timestamp": "2025-08-05T10:15:00Z",
      "details": {
        "quality": "1080p",
        "size": "8.5 GB"
      }
    }
  ],
  "total": 147
}
```

### Service History
Historical stats for a specific service.

**Endpoint**: `GET /api/services/status/history/:serviceId?hours=24`

---

## Service-Specific Endpoints

### Radarr
- `GET /api/radarr/:id/stats` - Enhanced movie statistics
- `GET /api/radarr/:id/test-endpoints` - Debug endpoint testing

**Stats Response**:
```json
{
  "movies": 3059,
  "missing": 94,
  "monitored": 2965,
  "diskSpace": "60.23 TB",
  "queue": {
    "total": 5,
    "downloading": 2,
    "items": []
  },
  "recentAdditions": [],
  "qualityBreakdown": {
    "1080p": 2500,
    "720p": 400,
    "4K": 159
  },
  "health": {
    "issues": 2,
    "warnings": ["Download client unavailable"]
  }
}
```

### Sonarr
- `GET /api/sonarr/:id/stats` - Enhanced series statistics

**Enhanced Queue Item** (Fixed):
```json
{
  "series": "Series Name",
  "episode": "S01E05",
  "episodeTitle": "Episode Title Here",
  "progress": 45,
  "eta": "00:30:00",
  "quality": "1080p"
}
```

### Plex
- `GET /api/plex/:id/stats` - Server and streaming statistics

### Prowlarr
- `GET /api/prowlarr/:id/stats` - Indexer performance metrics

---

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional context if available",
  "timestamp": "2025-08-05T10:30:00Z"
}
```

### Common Error Codes
- `400` - Bad Request (missing required fields)
- `404` - Resource not found
- `500` - Internal server error
- `503` - Service unavailable (external service down)

### Error Logging
All errors are logged with context:
```
[StatusController] Database error: connection timeout
[RadarrService] API Error: Invalid API key
```

---

## Data Models

### Service Model
```typescript
interface Service {
  id: number;
  name: string;
  type: 'radarr' | 'sonarr' | 'plex' | 'prowlarr' | 'lidarr' | 'bazarr' | 'readarr';
  host: string;
  port: number;
  api_key?: string;
  enabled: boolean;
  test_endpoint: string;
  created_at: string;
  updated_at: string;
}
```

### ServiceStats Model
```typescript
interface ServiceStats {
  service_id: number;
  stats: object; // Service-specific JSON data
  fetched_at: string;
}
```

---

## Testing & Debugging

### Using cURL

Test service connection:
```bash
curl -X POST http://localhost:5000/api/services/test \
  -H "Content-Type: application/json" \
  -d '{
    "type": "radarr",
    "host": "pidocker.taylorhomelink.com",
    "port": 7878,
    "apiKey": "your-api-key"
  }'
```

Get comprehensive status:
```bash
curl http://localhost:5000/api/services/status/comprehensive
```

### Debug Endpoints
Each service type has a debug endpoint:
```bash
curl http://localhost:5000/api/radarr/1/test-endpoints
```

This will test all API endpoints for that service and report which ones work.

---

## Performance Considerations

1. **Caching**: Stats are cached for 30 seconds to reduce API load
2. **Parallel Requests**: Service stats are fetched in parallel
3. **Timeout**: All external API calls have a 10-second timeout
4. **Error Isolation**: One service failure doesn't affect others

---

## Rate Limiting

Currently no rate limiting is implemented, but recommended practices:
- Status endpoints: Max 1 request per 10 seconds
- Service management: Max 10 requests per minute
- Consider implementing Redis-based rate limiting for production