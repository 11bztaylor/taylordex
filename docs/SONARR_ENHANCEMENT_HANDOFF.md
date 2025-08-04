# Sonarr Enhancement Handoff Document

## Current Sonarr Implementation Status

### What's Already Built:
- Basic stats collection (series, episodes, missing, queue count)
- ServiceCard shows series/episodes counts
- Status Dashboard shows Sonarr downloads (but titles need fixing)

### What Needs Enhancement:

#### 1. Fix Queue Title Parsing
Currently showing episode titles as undefined. Need to parse:
- Series name from the queue record
- Episode identifier (S01E01 format)
- Episode title if available

The queue structure likely has:
```javascript
{
  series: { title: "Show Name" },
  episode: { 
    seasonNumber: 1, 
    episodeNumber: 1,
    title: "Episode Title" 
  }
}
2. Add Enhanced Episode Tracking

Recently aired episodes
Episodes airing today/this week
Missing episodes by series
Download history

3. Series Health Monitoring

Which series are monitored
Continuing vs ended series
Series with most missing episodes
Quality profile distribution

4. Calendar Integration

Next 7 days of airing episodes
Season premieres/finales
Special episodes

Files to Modify:
1. Backend: /backend/src/modules/sonarr/service.js
Current implementation only gets basic stats. Need to add:

Proper queue parsing
Calendar endpoint integration
Series statistics aggregation
Episode grouping by series

2. Frontend: Status Tab Activity View
The queue items need to show:

Series name prominently
Episode number (S01E01)
Episode title (if available)
Different icon for TV vs Movies

3. ServiceCard Enhancement
Add more Sonarr-specific stats:

Shows airing today
Recently added episodes
Queue status for episodes

Code Patterns to Follow:
Queue Parsing Pattern (from Radarr fix):
// Parse queue items
queueData.items = queue.records.slice(0, 10).map(q => {
  let title = 'Unknown';
  if (q.series?.title) {
    title = q.series.title;
    if (q.episode) {
      title += ` S${String(q.episode.seasonNumber).padStart(2, '0')}E${String(q.episode.episodeNumber).padStart(2, '0')}`;
      if (q.episode.title) {
        title += ` - ${q.episode.title}`;
      }
    }
  }
  return {
    title: title,
    progress: Math.round(q.sizeleft && q.size ? ((q.size - q.sizeleft) / q.size) * 100 : 0),
    eta: q.timeleft || 'Unknown',
    size: formatBytes(q.size || 0),
    status: q.status || 'queued'
  };
});
API Endpoints to Use:

/api/v3/series - Get all series
/api/v3/queue - Download queue
/api/v3/calendar - Upcoming episodes
/api/v3/wanted/missing - Missing episodes
/api/v3/history - Recent activity
/api/v3/episode - Episode details

Testing Commands:
# Test Sonarr connection
curl -s http://localhost:5000/api/sonarr/8/stats | python3 -m json.tool

# Check queue structure
curl -s http://localhost:5000/api/sonarr/8/test-endpoints | python3 -m json.tool | grep -A20 "queue"
Success Criteria:

✅ Queue shows proper episode titles (Series S01E01 - Episode Name)
✅ Activity tab shows TV icon for Sonarr items
✅ ServiceCard shows airing today count
✅ Calendar data available in stats
✅ Missing episodes grouped by series

Reference Implementation:
Look at the enhanced Radarr service.js for patterns on:

Error handling
Parallel API calls
Data transformation
Graceful fallbacks
