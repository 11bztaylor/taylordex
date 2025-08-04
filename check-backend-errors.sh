#!/bin/bash
echo "=== Recent Backend Errors (last 100 lines) ==="
docker-compose logs backend --tail=100 | grep -E "Error|error|failed|Failed|FAILED"

echo -e "\n=== Radarr-specific errors ==="
docker-compose logs backend --tail=200 | grep -A2 -B2 "Radarr"
