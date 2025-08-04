# Status Dashboard Architecture

## Overview
The Status Dashboard provides a real-time overview of all connected services, aggregating data to give users a quick system health check.

## Components

### StatusTab (Main Component)
- Manages aggregate statistics
- Coordinates child components
- Refreshes with parent App component (30-second interval)

### Sub-Components

#### Quick Stats Cards
1. **System Health** - Percentage of services online
2. **Total Media** - Combined movies + series count
3. **Missing Content** - Items waiting to download
4. **Storage Used** - Total disk usage across services

#### ServiceStatusCard
- Individual service health indicator
- Shows online/offline/disabled status
- Displays version info
- Color-coded for quick visual scanning

#### DiskUsageBar
- Visual representation of storage per service
- Service-branded gradient colors
- Normalized to percentage for comparison

## Data Flow
1. App.jsx fetches services every 30 seconds
2. Services passed to StatusTab as props
3. StatusTab calculates aggregate stats on mount/update
4. Child components render based on service data

## Color Coding
- **Green** - Service online and healthy
- **Red** - Service offline or error
- **Gray** - Service disabled
- **Amber** - Warning states (missing content)

## Future Enhancements
1. **Activity Timeline** - Recent downloads/additions
2. **Download Queue** - Active downloads across services
3. **Performance Metrics** - API response times
4. **Predictive Analytics** - Storage growth trends
5. **Alert Thresholds** - Notify when metrics exceed limits

## Integration Points
- Uses same service data as Services tab
- Respects enabled/disabled states
- Updates automatically with service changes
- No additional API calls (uses existing stats)
