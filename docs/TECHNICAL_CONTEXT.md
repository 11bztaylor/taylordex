# Technical Context - Everything You Need

## Project Location
- **Absolute Path**: `/home/zach/projects/docker-dashboard`
- **GitHub**: `https://github.com/11bztaylor/taylordex.git`
- **Git User**: `11bztaylor`

## File Structure
/home/zach/projects/docker-dashboard/
├── frontend/                    # React app
│   ├── public/
│   │   └── logos/              # Service logos (NEW!)
│   ├── src/
│   │   ├── App.jsx             # Main app component
│   │   ├── components/         # Component library
│   │   │   ├── layout/         # Header, TabNav
│   │   │   ├── services/       # ServiceCard, ServicesTab, Modals
│   │   │   └── shared/         # Reusable components
│   │   ├── index.css           # Tailwind imports
│   │   └── main.jsx            # Entry point
│   ├── tailwind.config.js      # Tailwind config (CommonJS)
│   ├── postcss.config.js       # PostCSS config (CommonJS)
│   └── package.json            # Dependencies
├── backend/                     # Express API
│   ├── src/
│   │   ├── database/           # PostgreSQL connection & schema
│   │   ├── modules/            # Service integrations
│   │   │   ├── _template/      # Template for new services
│   │   │   ├── radarr/         # Radarr integration
│   │   │   └── services/       # Main services controller
│   │   └── utils/              # BaseService class
│   ├── index.js                # API entry
│   └── package.json            # Dependencies
├── docker-compose.yml          # All services (no version field!)
├── README.md                   # Project documentation
└── docs/                       # All documentation

## Stack Details
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: PostgreSQL 15 + Redis 7
- **Container**: Docker Compose
- **UI Components**: @headlessui/react + @heroicons/react

## Critical Commands
# Always start here
cd /home/zach/projects/docker-dashboard && pwd

# View running services
docker-compose ps

# View logs
docker-compose logs frontend -f
docker-compose logs backend -f

# Restart everything
docker-compose down && docker-compose up -d

# Git workflow
git add .
git commit -m "Clear description of change"
git push

## Database Access
# Connect to PostgreSQL
docker-compose exec postgres psql -U taylordex -d taylordex

# Common queries
SELECT * FROM services;
SELECT * FROM service_stats ORDER BY fetched_at DESC LIMIT 10;

## API Endpoints
- GET    /api/services          # List all
- POST   /api/services          # Create
- PUT    /api/services/:id      # Update
- DELETE /api/services/:id      # Delete
- POST   /api/services/test     # Test connection
- GET    /api/:type/:id/stats   # Get service stats

## Known Technical Details
1. Use CommonJS in config files (module.exports)
2. Frontend runs on port 3000
3. Backend runs on port 5000
4. PostgreSQL on 5432, Redis on 6379
5. Services persist in PostgreSQL
6. Stats refresh every 30 seconds
7. Logos stored in frontend/public/logos/

## Environment Details
- **OS**: Windows 11 + WSL2 Ubuntu
- **User**: zach
- **Working Hours**: Evenings/weekends
- **Dev Machine**: DadsDesktop
