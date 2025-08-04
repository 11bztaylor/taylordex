#!/bin/bash
echo "=== Checking if enhanced Radarr service exists ==="
ls -la /home/zach/projects/docker-dashboard/backend/src/modules/radarr/service.js

echo -e "\n=== First 20 lines of current service.js ==="
head -20 /home/zach/projects/docker-dashboard/backend/src/modules/radarr/service.js

echo -e "\n=== Checking for enhanced methods ==="
grep -n "recentAdditions\|qualityBreakdown\|queue\|health" /home/zach/projects/docker-dashboard/backend/src/modules/radarr/service.js || echo "Enhanced features NOT FOUND!"
