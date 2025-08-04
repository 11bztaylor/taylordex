# TaylorDex Quick Reference

## Project Paths
- Project root: /home/zach/projects/docker-dashboard
- GitHub: https://github.com/11bztaylor/taylordex.git

## Common Commands
cd /home/zach/projects/docker-dashboard && pwd
docker-compose ps
docker-compose logs frontend -f
git status

## Current Issue
Frontend shows "connection refused" on localhost:3000
- Vite running on 5173 instead of 3000
- Need to fix port configuration

## First Integration Target
- Service: Radarr
- Host: pidocker.taylorhomelink.com
- Port: 7878
