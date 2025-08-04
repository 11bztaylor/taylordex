# TaylorDex - Docker Management Dashboard

## What It Does
- Pulls configs from all Docker containers
- Displays everything in one unified dashboard
- Generates AI-friendly snapshots
- Modular design (one service breaks = others keep running)

## Architecture
- Frontend: React + Tailwind
- Backend: Node.js modular API
- Storage: PostgreSQL + Redis
- Deployment: Docker Compose

## Modules
Each service gets its own isolated module:
- Radarr (Movies)
- Sonarr (TV)
- Plex (Media Server)
- [Future modules as discovered]
