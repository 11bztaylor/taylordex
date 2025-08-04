#!/bin/bash
cd /home/zach/projects/docker-dashboard

# Backup and replace
cp backend/src/modules/radarr/service.js backend/src/modules/radarr/service-backup2.js
cp backend/src/modules/radarr/service-fixed.js backend/src/modules/radarr/service.js

echo "Fixed Radarr service installed!"
echo "Restarting backend..."
docker-compose restart backend

echo "Waiting for backend to start..."
sleep 5

echo "Testing queue parsing..."
curl -s http://localhost:5000/api/radarr/6/stats | python3 -c "
import json, sys
data = json.load(sys.stdin)
if data.get('success') and data.get('stats', {}).get('queue'):
    queue = data['stats']['queue']
    print(f'Queue total: {queue.get(\"total\", 0)}')
    print(f'Items found: {len(queue.get(\"items\", []))}')
    for i, item in enumerate(queue.get('items', [])[:3]):
        print(f'  {i+1}. {item.get(\"title\", \"Unknown\")} - {item.get(\"progress\", 0)}% - {item.get(\"size\", \"?\")}')
"
