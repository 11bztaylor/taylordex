#!/bin/bash
echo "Watching for Radarr-related logs (Ctrl+C to stop)..."
docker-compose logs -f backend | grep --line-buffered -E "Radarr|radarr|Error fetching|Could not"
