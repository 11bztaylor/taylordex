# TaylorDx Project Structure

This document provides an overview of the project's file organization and structure.

## 📁 Root Directory

```
docker-dashboard/
├── README.md                 # Main project documentation
├── CONTRIBUTING.md           # Contribution guidelines
├── LICENSE                   # MIT License
├── docker-compose.yml        # Development environment setup
├── backend/                  # Node.js API server
├── frontend/                 # React web application
├── database/                 # Database migrations and scripts
└── docs/                     # Comprehensive documentation
```

## 🔧 Backend Structure

```
backend/
├── Dockerfile                # Backend container configuration
├── package.json              # Node.js dependencies and scripts
├── index.js                  # Application entry point
└── src/
    ├── database/
    │   ├── connection.js     # Database connection and pooling
    │   └── schema.sql        # Database schema definition
    ├── modules/              # Service integration modules
    │   ├── _template/        # Template for new service integrations
    │   ├── discovery/        # Network discovery functionality
    │   ├── docker/           # Docker API integration
    │   ├── logs/             # Log collection and management
    │   ├── services/         # Core service management
    │   ├── radarr/           # Radarr movie management integration
    │   ├── sonarr/           # Sonarr TV series integration
    │   ├── plex/             # Plex media server integration
    │   ├── prowlarr/         # Prowlarr indexer integration
    │   ├── lidarr/           # Lidarr music integration
    └── utils/                # Shared utilities and base classes
        ├── baseService.js    # Base class for service integrations
        └── dataCollector.js  # Data collection utilities
```

### Module Structure (Example: Radarr)
```
modules/radarr/
├── service.js               # Core service logic and API calls
├── controller.js            # HTTP request handlers
├── routes.js               # Express route definitions
├── tests/                  # Module-specific tests
├── api/                    # API endpoint definitions
└── config/                 # Configuration files
```

## 🎨 Frontend Structure

```
frontend/
├── Dockerfile              # Frontend container configuration
├── package.json            # React dependencies and scripts
├── index.html              # Main HTML template
├── vite.config.js          # Vite build configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── public/                 # Static assets
│   ├── TDX_Day.png         # Light theme logo
│   ├── TDX_Night.png       # Dark theme logo
│   └── logos/              # Service integration logos
└── src/
    ├── App.jsx             # Main application component
    ├── main.jsx            # Application entry point
    ├── index.css           # Global styles
    ├── components/         # React components
    │   ├── charts/         # Chart and visualization components
    │   ├── discovery/      # Network discovery components
    │   ├── layout/         # Layout and navigation components
    │   ├── logs/           # Log viewing components
    │   ├── services/       # Service management components
    │   ├── shared/         # Reusable UI components
    │   ├── status/         # Status dashboard components
    │   └── settings/       # Settings and configuration
    ├── containers/         # Container components (deprecated)
    ├── layouts/            # Layout components
    └── pages/              # Page-level components
```

### Component Organization
```
components/services/
├── ServiceCard.jsx          # Individual service display card
├── ServiceDetailModal.jsx   # Detailed service information modal
├── ServicesTab.jsx         # Main services management tab
├── AddServiceModal.jsx     # Add new service form
├── EditServiceModal.jsx    # Edit existing service form
├── DockerHostCard.jsx      # Docker host management card
├── DockerHostsSection.jsx  # Docker hosts container
└── UnraidDockerHostCard.jsx # Unraid-specific Docker integration
```

## 📚 Documentation Structure

```
docs/
├── PROJECT_STRUCTURE.md    # This file - project organization
├── PROJECT_ROADMAP.md      # Feature roadmap and development plans
├── SUSTAINABILITY.md       # Long-term maintenance guide
├── INSTALLATION.md         # Detailed installation instructions
├── CONFIGURATION.md        # Service configuration guide
├── TROUBLESHOOTING.md      # Common issues and solutions
├── API_DOCUMENTATION.md    # Backend API reference
├── ARCHITECTURE.md         # System architecture overview
├── DESIGN_SYSTEM.md        # UI/UX design guidelines
├── DEVELOPMENT_WORKFLOW.md # Development process guide
├── TECHNICAL_CONTEXT.md    # Technical implementation details
├── ADDING_NEW_SERVICES.md  # Guide for adding integrations
├── UNRAID_CONTAINER_CONTROL.md # Unraid integration notes
├── homelab/                # Homelab-specific documentation
│   ├── MASTER_INVENTORY.md # Equipment and service inventory
│   ├── NETWORK_MAP.md      # Network topology
│   └── SERVICE_CATALOG.md  # Service catalog
├── integrations/           # Service-specific integration guides
│   ├── radarr.md
│   ├── sonarr.md
│   └── plex.md
└── images/                 # Documentation images and assets
    ├── TDX_Day.png
    └── TDX_Night.png
```

## 🗃️ Database Structure

```
database/
├── migrations/             # Database migration scripts
└── schema.sql             # Main database schema
```

### Database Tables
- **services**: Service configurations and metadata
- **service_stats**: Historical performance and status data
- **users**: User accounts and authentication (future)
- **settings**: Application configuration settings
- **logs**: Application and service logs (optional)

## 🔧 Configuration Files

### Docker Configuration
- `docker-compose.yml`: Multi-container development environment
- `backend/Dockerfile`: Backend container build instructions
- `frontend/Dockerfile`: Frontend container build instructions

### Build Configuration
- `backend/package.json`: Node.js dependencies and scripts
- `frontend/package.json`: React dependencies and scripts
- `frontend/vite.config.js`: Frontend build configuration
- `frontend/tailwind.config.js`: CSS framework configuration

## 📦 Key Dependencies

### Backend Dependencies
- **Express**: Web framework
- **PostgreSQL**: Primary database
- **Redis**: Caching and sessions
- **Axios**: HTTP client for service APIs
- **Docker API**: Container management
- **Node.js**: Runtime environment

### Frontend Dependencies
- **React**: UI framework
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Heroicons**: Icon library
- **Date-fns**: Date manipulation library

## 🏗️ Architecture Patterns

### Backend Patterns
- **Modular Architecture**: Service integrations as separate modules
- **Base Service Pattern**: Common functionality in BaseService class
- **Controller Pattern**: Separation of route handling and business logic
- **Repository Pattern**: Database access abstraction

### Frontend Patterns
- **Component Composition**: Reusable UI components
- **Hook Pattern**: Custom React hooks for state management
- **Context Pattern**: Global state management
- **Modal Pattern**: Overlay components for forms and details

## 🔄 Data Flow

```
User Interface (React)
    ↓
API Calls (REST)
    ↓
Backend Controllers (Express)
    ↓
Service Modules (Business Logic)
    ↓
External APIs (Radarr, Sonarr, etc.)
    ↓
Database Storage (PostgreSQL)
```

## 🎯 Module Responsibilities

### Core Modules
- **Services**: CRUD operations for service configurations
- **Discovery**: Automatic network service detection
- **Docker**: Container lifecycle management
- **Logs**: Centralized log collection and viewing

### Integration Modules
- **Radarr**: Movie collection management
- **Sonarr**: TV series management
- **Plex**: Media server statistics
- **Prowlarr**: Indexer management
- **Unraid**: Server and container monitoring

### Utility Modules
- **BaseService**: Common service functionality
- **DataCollector**: Performance metrics collection
- **ErrorBoundary**: React error handling

## 📝 File Naming Conventions

### Backend
- **Services**: `{service-name}/service.js`
- **Controllers**: `{service-name}/controller.js`
- **Routes**: `{service-name}/routes.js`
- **Utilities**: `kebab-case.js`

### Frontend
- **Components**: `PascalCase.jsx`
- **Hooks**: `use{HookName}.js`
- **Utilities**: `camelCase.js`
- **Styles**: `kebab-case.css`

### Documentation
- **Guides**: `SCREAMING_SNAKE_CASE.md`
- **References**: `kebab-case.md`
- **Images**: `kebab-case.png`

## 🚀 Scalability Considerations

### Horizontal Scaling
- Load balancer configuration ready
- Stateless backend design
- Database read replicas support
- Container orchestration ready

### Vertical Scaling
- Resource limits configured
- Performance monitoring built-in
- Caching layer implemented
- Database optimization ready

## 🔒 Security Structure

### Authentication & Authorization
- JWT token-based authentication (future)
- Role-based access control (future)
- API rate limiting configured
- Input validation implemented

### Data Protection
- Environment variable configuration
- Secure credential storage
- HTTPS/TLS ready
- CORS protection enabled

---

This structure provides a solid foundation for sustainable development and easy maintenance. The modular design allows for independent development of features while maintaining consistency across the codebase.