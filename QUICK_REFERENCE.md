# TaylorDex Quick Reference

## Project Paths
- Project root: /home/zach/projects/docker-dashboard
- GitHub: https://github.com/11bztaylor/taylordex.git

## Common Commands
cd /home/zach/projects/docker-dashboard && pwd
docker-compose ps
docker-compose logs frontend -f
git status

## Current Status
- Frontend: Working beautifully at http://localhost:3000
- Backend: API skeleton at http://localhost:5000/api/health
- UI Theme: NVIDIA-green glassmorphic
- Next: Connect to real Radarr

## First Integration Target
- Service: Radarr
- Host: pidocker.taylorhomelink.com
- Port: 7878
- Need: API key from Radarr settings
