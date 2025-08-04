# Technical Context - Everything You Need

## Project Location
- **Absolute Path**: `/home/zach/projects/docker-dashboard`
- **GitHub**: `https://github.com/11bztaylor/taylordex.git`
- **Git User**: `11bztaylor`

## File Structure
/home/zach/projects/docker-dashboard/
├── frontend/                    # React app
│   ├── src/
│   │   ├── App.jsx             # Main app component
│   │   ├── components/         # Component library
│   │   │   ├── layout/         # Header, TabNav
│   │   │   ├── services/       # ServiceCard, ServicesTab
│   │   │   └── shared/         # Reusable components
│   │   ├── index.css           # Tailwind imports
│   │   └── main.jsx            # Entry point
│   ├── tailwind.config.js      # Tailwind config (CommonJS)
│   ├── postcss.config.js       # PostCSS config (CommonJS)
│   └── package.json            # Dependencies
├── backend/                     # Express API
│   ├── index.js                # API entry
│   └── package.json            # Dependencies
├── docker-compose.yml          # All services
└── docs/                       # All documentation

## Stack Details
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: PostgreSQL 15 + Redis 7
- **Container**: Docker Compose
- **Icons**: @heroicons/react (already installed)

## Critical Commands
# Always start here
cd /home/zach/projects/docker-dashboard && pwd

# View running services
docker-compose ps

# Start specific service
docker-compose up frontend

# View logs
docker-compose logs frontend -f

# Restart everything
docker-compose down && docker-compose up -d

# Git workflow
git add .
git commit -m "Clear description of change"
git push

## Known Technical Gotchas
1. Use CommonJS in config files (module.exports)
2. Frontend runs on port 3000 (Vite on 5173 internally)
3. Backend runs on port 5000
4. PostgreSQL on 5432, Redis on 6379
5. Hot reload works in containers

## Environment Details
- **OS**: Windows 11 + WSL2 Ubuntu
- **User**: zach
- **Working Hours**: Evenings/weekends
- **Dev Machine**: DadsDesktop
