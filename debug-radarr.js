// Debug script to explore all Radarr data
const http = require('http');

// Get all services first
http.get('http://localhost:5000/api/services', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const services = JSON.parse(data).services;
    const radarrService = services.find(s => s.type === 'radarr');
    
    if (!radarrService) {
      console.log('No Radarr service found!');
      return;
    }
    
    console.log(`Found Radarr service: ${radarrService.name} (ID: ${radarrService.id})`);
    
    // Now get detailed stats
    http.get(`http://localhost:5000/api/radarr/${radarrService.id}/stats`, (statsRes) => {
      let statsData = '';
      statsRes.on('data', chunk => statsData += chunk);
      statsRes.on('end', () => {
        const stats = JSON.parse(statsData);
        console.log('\n=== RADARR STATS ===');
        console.log(JSON.stringify(stats, null, 2));
        
        // Show what data fields we have
        if (stats.success && stats.stats) {
          console.log('\n=== AVAILABLE DATA FIELDS ===');
          Object.keys(stats.stats).forEach(key => {
            const value = stats.stats[key];
            const type = Array.isArray(value) ? `array[${value.length}]` : typeof value;
            console.log(`- ${key}: ${type}`);
          });
        }
      });
    });
  });
});
