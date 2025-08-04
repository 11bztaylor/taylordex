// In the processServiceData function, find where we process queue items
// and make sure we're adding the service name correctly:

// For Radarr queue items:
if (service.stats.queue?.items) {
  activity.currentDownloads.push(...service.stats.queue.items.map(item => ({
    ...item,
    service: service.name,  // This should be "Radarr" not "Sonarr"
    type: 'movie'
  })));
}

// For Sonarr queue items:
if (service.stats.queueDetails?.items) {
  activity.currentDownloads.push(...service.stats.queueDetails.items.map(item => ({
    ...item,
    service: service.name,  // This should be "Sonarr"
    type: 'episode'
  })));
}
