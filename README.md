# <img width="1024" height="1024" alt="TDX_Day" src="https://github.com/user-attachments/assets/ce774c75-0a63-4553-8954-becf052a16f3" />
TaylorDex - Docker Service Dashboard

A beautiful, modular dashboard for managing 50+ Docker containers with a focus on *arr services.

## Features
- ✅ Service management (Add/Edit/Delete/Disable)
- ✅ Real-time stats from Radarr/Sonarr/etc
- ✅ PostgreSQL persistence
- ✅ Service logos with gradient backgrounds
- ✅ Connection testing before saving
- ✅ Modular architecture (one service failure doesn't affect others)

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS + Heroicons
- **Backend**: Node.js + Express + PostgreSQL
- **Infrastructure**: Docker Compose
- **UI Library**: @headlessui/react

## Quick Start
```bash
# Clone the repo![Uploading TDX_Day.png…]()

git clone https://github.com/11bztaylor/taylordex.git
cd taylordex

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Access dashboard
http://localhost:3000
