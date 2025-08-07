# 🏗️ TaylorDex - Visual Architecture Diagrams

## 🌐 **SYSTEM OVERVIEW**

```
┌─────────────────────────────────────────────────────────────────┐
│                        TaylorDex System                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   React + Vite  │◄──►│ Node.js/Express │◄──►│  PostgreSQL     │
│   Port: 3000    │    │   Port: 5000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│     Redis       │◄─────────────┘
                        │   Port: 6379    │
                        └─────────────────┘
```

---

## 🔐 **AUTHENTICATION FLOW**

```
┌─────────────┐                ┌─────────────┐                ┌─────────────┐
│   Browser   │                │   Backend   │                │  Database   │
└─────────────┘                └─────────────┘                └─────────────┘
       │                              │                              │
   1.  │ POST /api/auth/login         │                              │
       ├─────────────────────────────►│                              │
       │                              │ 2. Validate credentials      │
       │                              ├─────────────────────────────►│
       │                              │                              │
       │                              │ 3. User found + password OK  │
       │                              │◄─────────────────────────────┤
       │                              │                              │
       │ 4. JWT Token + Session       │ 5. Generate JWT & session    │
       │◄─────────────────────────────┤                              │
       │                              │                              │
   6.  │ API calls with Bearer token  │                              │
       ├─────────────────────────────►│                              │
       │                              │ 7. Verify JWT + RBAC check   │
       │                              ├─────────────────────────────►│
       │                              │                              │
       │ 8. Filtered response         │ 9. Apply user permissions    │
       │◄─────────────────────────────┤                              │
```

---

## 🛡️ **RBAC PERMISSION MODEL**

```
┌─────────────────────────────────────────────────────────────────┐
│                    RBAC Architecture                            │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────┐
                    │    USER     │
                    │ role: admin │ ────────────► SEES EVERYTHING
                    │ role: user  │               (No filtering)
                    └─────────────┘
                           │
                           │ Has permissions through:
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
    v                      v                      v
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│Tag-Based    │    │Resource     │    │Role         │
│Permissions  │    │Permissions  │    │Templates    │
└─────────────┘    └─────────────┘    └─────────────┘
│resource_type│    │service_id:3 │    │media_access │
│group:Media  │    │read,write   │    │infra_admin  │
│read,control │    └─────────────┘    │dev_readonly │
└─────────────┘                      └─────────────┘
       │                                      │
       └──────────┐              ┌────────────┘
                  │              │
                  v              v
            ┌─────────────────────────┐
            │   SERVICE FILTERING     │
            │                         │
            │  ┌─────┐ ┌─────┐ ┌─────┐│
            │  │Plex │ │Home │ │Git  ││
            │  │✓    │ │Asst │ │✗    ││
            │  │     │ │✓    │ │     ││
            │  └─────┘ └─────┘ └─────┘│
            │  Accessible    Hidden   │
            └─────────────────────────┘
```

---

## 📊 **DATABASE SCHEMA RELATIONSHIPS**

```
┌─────────────────────────────────────────────────────────────────┐
│                     Database Schema                             │
└─────────────────────────────────────────────────────────────────┘

  ┌─────────────┐         ┌─────────────────┐         ┌─────────────┐
  │    users    │         │ tag_permissions │         │  resources  │
  │─────────────│    ┌────┤─────────────────├────┐    │─────────────│
  │ id (PK)     │◄───┤    │ user_id (FK)    │    └───►│ id (PK)     │
  │ username    │    │    │ tag_key         │         │ name        │
  │ password    │    │    │ tag_value       │         │ type        │
  │ role        │    │    │ permissions     │         │ metadata    │
  │ is_active   │    │    └─────────────────┘         └─────────────┘
  └─────────────┘    │                                        │
        │            │                                        │
        │            │    ┌─────────────────┐                │
        │            └────┤resource_perms   │                │
        │                 │─────────────────│                │
        │                 │ user_id (FK)    │                │
        │                 │ resource_id(FK) │◄───────────────┘
        │                 │ permissions     │
        │                 └─────────────────┘
        │
        │    ┌─────────────┐         ┌─────────────────┐
        └───►│  services   │◄────────┤ service_stats   │
             │─────────────│         │─────────────────│
             │ id (PK)     │         │ service_id (FK) │
             │ name        │         │ stats (JSON)    │
             │ type        │         │ fetched_at      │
             │ host:port   │         └─────────────────┘
             │ group_name  │
             │ enabled     │
             └─────────────┘
                   │
                   │ 1:1 sync
                   │
             ┌─────────────┐         ┌─────────────────┐
             │ resources   │◄────────┤ resource_tags   │
             │─────────────│         │─────────────────│
             │ id (PK)     │         │ resource_id(FK) │
             │ name        │         │ key             │
             │ type        │         │ value           │
             │legacy_svc_id│         └─────────────────┘
             └─────────────┘
```

---

## 🔄 **REQUEST LIFECYCLE**

```
┌─────────────────────────────────────────────────────────────────┐
│                    API Request Lifecycle                       │
└─────────────────────────────────────────────────────────────────┘

1. CLIENT REQUEST
   │
   │  GET /api/services
   │  Authorization: Bearer jwt_token
   │
   ▼
2. EXPRESS MIDDLEWARE CHAIN
   │
   ├─► CORS Validation
   ├─► JSON Body Parser  
   ├─► Request Logger ──────────► logs/debug.log
   ├─► Auth Middleware
   │   │
   │   ├─► JWT Verification
   │   ├─► User Lookup ──────────► Database
   │   └─► req.user = userData
   │
   ▼
3. ROUTE HANDLER (ServicesController.getAllServices)
   │
   ├─► Database Query ──────────► SELECT * FROM services
   │   │
   │   └─► Logger.dbQuery ──────► logs/debug.log
   │
   ├─► RBAC FILTERING
   │   │
   │   ├─► if (user.role === 'admin') ──► Return all services
   │   │
   │   ├─► else: Check permissions for each service
   │   │   │
   │   │   ├─► authService.hasPermission(user, 'read', service.type)
   │   │   ├─► authService.hasPermission(user, 'read', 'service')  
   │   │   └─► authService.hasPermission(user, 'read', service.group)
   │   │
   │   └─► Logger.rbac ──────────► logs/debug.log
   │
   ├─► ADD STATS TO SERVICES
   │   │
   │   └─► Query service_stats table for each accessible service
   │
   ▼
4. RESPONSE SENT
   │
   ├─► JSON Response
   ├─► Response Logger ──────────► logs/debug.log
   └─► Performance Timing
```

---

## 🏗️ **COMPONENT HIERARCHY**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Architecture                       │
└─────────────────────────────────────────────────────────────────┘

App.jsx (Root)
├─── AuthProvider (Context)
├─── AuthenticatedApp
     │
     ├─── SetupForm (First run)
     ├─── LoginForm (Unauthenticated)
     │
     └─── Dashboard (Authenticated)
          │
          ├─── Header
          │    ├─── User info
          │    └─── Service counters
          │
          ├─── TabNavigation
          │    ├─── Services
          │    ├─── Status  
          │    ├─── Logs
          │    ├─── Users (Admin only)
          │    └─── Settings
          │
          └─── Tab Content
               │
               ├─── ServicesTab
               │    ├─── ServiceCard[] (RBAC filtered)
               │    ├─── AddServiceModal
               │    ├─── EditServiceModal
               │    └─── NetworkDiscoveryModal
               │
               ├─── AdminDashboard (Admin only)  
               │    ├─── UserManagement
               │    │    ├─── CreateUserModal
               │    │    └─── PermissionsModal
               │    │         ├─── Current Permissions
               │    │         ├─── Apply Templates
               │    │         └─── CustomPermissionManager
               │    │
               │    ├─── ResourceManagement  
               │    └─── SystemSettings
               │
               └─── StatusTab
                    └─── Service Status Cards
```

---

## 📦 **DOCKER CONTAINER ARCHITECTURE** 

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Compose Setup                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   frontend      │    │    backend      │    │   postgres      │
│   (React)       │    │   (Node.js)     │    │   (Database)    │
│                 │    │                 │    │                 │
│ Port: 3000      │    │ Port: 5000      │    │ Port: 5432      │
│ Build: Vite     │    │ Build: Multi    │    │ Volume: pgdata  │
│ Serve: nginx    │    │ CMD: node       │    │ Health: pg_ready│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────►│     redis       │◄─────────────┘
                        │   (Cache)       │
                        │                 │
                        │ Port: 6379      │
                        │ Volume: redis   │
                        └─────────────────┘

Docker Network: docker-dashboard_default
├─── frontend.docker-dashboard_default
├─── backend.docker-dashboard_default  
├─── postgres.docker-dashboard_default
└─── redis.docker-dashboard_default

Volume Mounts:
├─── pgdata (PostgreSQL data persistence)
├─── redis-data (Redis persistence)
└─── ./backend/logs:/app/logs (Log file access)
```

---

## 🔀 **DATA FLOW DIAGRAMS**

### **Service Data Flow**
```
SERVICE CREATION FLOW:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│Add Service  │───►│Create in    │───►│Auto-create  │
│via UI/API   │    │services     │    │in resources │
└─────────────┘    │table        │    │table        │
                   └─────────────┘    └─────────────┘
                          │                   │
                          ▼                   ▼
                   ┌─────────────┐    ┌─────────────┐
                   │Add metadata │    │Create tags  │
                   │group, tags  │    │for grouping │
                   └─────────────┘    └─────────────┘
```

### **Permission Check Flow**
```
USER ACCESSES SERVICE:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│User requests│───►│Check if     │───►│Return all   │
│/api/services│    │admin role   │ Y  │services     │
└─────────────┘    └─────────────┘    └─────────────┘
                          │ N
                          ▼
                   ┌─────────────┐
                   │For each     │
                   │service:     │
                   └─────────────┘
                          │
     ┌────────────────────┼────────────────────┐
     │                    │                    │
     ▼                    ▼                    ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│Check type   │    │Check service│    │Check group  │
│permission   │ OR │permission   │ OR │permission   │
└─────────────┘    └─────────────┘    └─────────────┘
     │                    │                    │
     └────────────────────┼────────────────────┘
                          │ (ANY = True)
                          ▼
                   ┌─────────────┐
                   │Include in   │
                   │response     │
                   └─────────────┘
```

---

## 📝 **LOGGING ARCHITECTURE**

```
┌─────────────────────────────────────────────────────────────────┐
│                     Logging System                             │
└─────────────────────────────────────────────────────────────────┘

APPLICATION EVENTS                    LOGGER INSTANCE
     │                                      │
     │  logger.info()                       │
     ├─► logger.error()                     │
     │  logger.debug()                      │
     │  logger.request()                    │
     │  logger.rbac()                       │
     │  logger.auth()                       │
     │                                      │
     ▼                                      ▼
┌─────────────────┐                ┌─────────────────┐
│ CONSOLE OUTPUT  │                │  FILE OUTPUT    │
│                 │                │                 │
│ 🔍 Debug info   │                │ logs/debug.log  │
│ ℹ️  Info msgs    │                │ logs/error.log  │
│ ⚠️  Warnings     │                │ logs/audit.log  │
│ ❌ Errors        │                └─────────────────┘
└─────────────────┘

ENVIRONMENT CONTROLS:
├─► LOG_LEVEL=debug|info|warn|error
├─► DEBUG_MODE=true (shows debug logs)
├─► LOG_REQUESTS=true (request/response)
├─► LOG_DB_QUERIES=true (database queries)
├─► LOG_AUTH=true (auth events)
└─► LOG_RBAC=true (permission decisions)
```

---

## 🎯 **DEVELOPMENT WORKFLOW**

```
┌─────────────────────────────────────────────────────────────────┐
│                  Development Process                           │
└─────────────────────────────────────────────────────────────────┘

LOCAL DEVELOPMENT:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ 1. Code     │───►│ 2. Test     │───►│ 3. Debug    │
│ Changes     │    │ Locally     │    │ with Logs   │
└─────────────┘    └─────────────┘    └─────────────┘
                          │                   │
                          │                   │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ 6. Deploy   │◄───│ 5. Build    │◄───│ 4. Commit   │
│ Production  │    │ Containers  │    │ Changes     │
└─────────────┘    └─────────────┘    └─────────────┘

DEBUG TOOLS:
├─── docker-compose logs backend
├─── tail -f logs/debug.log  
├─── DEBUG_MODE=true environment
└─── Browser developer tools
```

This comprehensive visual documentation provides clear diagrams for understanding every aspect of the TaylorDex architecture, from high-level system overview to detailed data flows and debugging processes.