#!/bin/bash
cd /home/zach/projects/docker-dashboard

# Backup current version
cp backend/src/modules/radarr/service.js backend/src/modules/radarr/service-backup.js

# Replace with enhanced version
cp backend/src/modules/radarr/service-enhanced.js backend/src/modules/radarr/service.js

echo "Enhanced Radarr service installed!"
echo "Restarting backend..."
docker-compose restart backend

echo "Waiting for backend to start..."
sleep 5

echo "Testing enhanced stats..."
curl -s http://localhost:5000/api/radarr/6/stats | python3 -m json.tool | head -50
