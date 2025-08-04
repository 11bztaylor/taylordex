#!/bin/bash
cd /home/zach/projects/docker-dashboard

# Add all changes
git add -A

# Commit with detailed message
git commit -m "Add comprehensive data collection system for all services

IMPLEMENTED:
- Enhanced Radarr: queue details, recent additions, quality breakdown, health checks
- Enhanced Sonarr: episode tracking, airing schedule, series health monitoring  
- Enhanced Plex: active streams, library details, bandwidth monitoring
- Enhanced Prowlarr: 24h indexer stats, success rates, performance metrics
- Created modular DataCollector utility for data aggregation
- Built three-view Status tab: Overview, Activity, Performance
- Fixed queue parsing to show proper movie titles
- Added enhanced stats display in ServiceCard components
- Created debug endpoints for troubleshooting

STATUS TAB FEATURES:
- Overview: System health %, total media counts, active activity, storage usage
- Activity: Live downloads with progress, active streams, airing today, recent additions
- Performance: Indexer metrics, library health, system warnings
- All data updates every 30 seconds automatically

TECHNICAL DETAILS:
- Each service module is self-contained for easy troubleshooting
- Graceful error handling for missing data
- Modular architecture allows easy addition of new services
- Backend properly parses complex Radarr/Sonarr API responses"

git push
