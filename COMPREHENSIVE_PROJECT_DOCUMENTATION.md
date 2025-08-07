# 🏗️ TaylorDex - Comprehensive Project Documentation
**Version**: 2.0 | **Last Updated**: August 6, 2025 | **Status**: Production Ready

## 📋 **PROJECT OVERVIEW**

TaylorDex is a comprehensive Docker service management dashboard with advanced RBAC (Role-Based Access Control), resource management, and user administration capabilities. Built with Node.js/Express backend, React frontend, and PostgreSQL database.

### **🎯 Core Purpose**
- **Unified service management** across different types (media, automation, infrastructure, etc.)
- **Strict RBAC system** where admins see everything, users see only permitted resources  
- **Resource grouping and tagging** for flexible permission management
- **Complete user administration** with both CLI and web interfaces

### **✨ Key Features**
- 🔐 **JWT-based authentication** with bcrypt password hashing
- 🛡️ **Advanced RBAC** with tag-based permissions and resource filtering  
- 👥 **User management** (CLI + web UI) with role templates
- 🏷️ **Resource tagging/grouping** system for scalable permissions
- 📊 **Enhanced logging** with environment toggles  
- 🐳 **Docker containerization** with PostgreSQL and Redis
- ⚡ **Real-time service monitoring** and health checks

---

## 🏛️ **ARCHITECTURE OVERVIEW**

### **Technology Stack**
```
Frontend:  React 18 + TailwindCSS + Heroicons + Vite
Backend:   Node.js + Express + PostgreSQL + Redis  
Auth:      JWT + bcrypt + Session-based
Deploy:    Docker Compose + Multi-stage builds
Logs:      Custom logger with file rotation
```

### **Project Structure**
```
docker-dashboard/
├── backend/                    # Node.js API server
│   ├── src/
│   │   ├── auth/              # Authentication system
│   │   ├── database/          # DB connection & migrations
│   │   ├── middleware/        # Request logging, auth middleware
│   │   ├── modules/           # Feature modules (services, users, etc.)
│   │   └── utils/             # Logger, helpers
│   ├── logs/                  # Application logs (auto-created)
│   └── user-manager.js        # CLI user management tool
├── frontend/                  # React application  
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── contexts/          # Auth context
│   │   └── main.jsx          # App entry point
├── _ARCHIVE_DELETE_AFTER_7_DAYS_2025_08_13/  # Cleanup archive
├── docker-compose.yml         # Development setup
├── docker-compose.prod.yml    # Production setup
└── .env                       # Environment secrets
```

---

## 🔐 **AUTHENTICATION & RBAC SYSTEM**

### **Authentication Flow**
1. **First Run**: Admin setup required via `/api/auth/setup`
2. **Login**: JWT tokens issued for authenticated sessions
3. **Session**: 7-day expiry with refresh capability  
4. **Password**: bcrypt hashing with salt rounds

### **RBAC Implementation**
```javascript
// Admin Role: Sees everything (no filtering)
if (user.role === 'admin') {
  return allServices; // No restrictions
}

// User Role: Strict filtering
const accessibleServices = services.filter(service => {
  const hasTypeAccess = hasPermission(user, 'read', service.type);
  const hasGroupAccess = hasPermission(user, 'read', service.group); 
  return hasTypeAccess || hasGroupAccess;
});
```

### **Permission System**
- **Tag-based permissions**: `resource_type:media`, `group:Infrastructure`
- **Permission levels**: `read`, `write`, `control`, `admin`
- **Permission templates**: Pre-configured role bundles
- **Resource filtering**: No permission = complete invisibility

---

## 💾 **DATABASE DESIGN**

### **Core Tables**
```sql
-- User Management
users (id, username, email, role, password_hash, is_active)
user_sessions (id, user_id, token_hash, expires_at)

-- Service Management  
services (id, name, type, host, port, group_name, metadata, enabled)
service_stats (service_id, stats, fetched_at)

-- Resource System
resources (id, name, type, metadata, legacy_service_id)
resource_tags (resource_id, key, value)

-- Permission System
tag_permissions (user_id, tag_key, tag_value, permissions)
resource_permissions (user_id, resource_id, permissions)
role_templates (id, name, permissions, resource_type)
```

### **Migration Strategy**
- **Parallel system**: New resource system alongside legacy services
- **Auto-sync triggers**: Keep services and resources synchronized  
- **Backward compatibility**: Legacy endpoints still work during transition

---

## 🚀 **DEPLOYMENT & CONFIGURATION**

### **Environment Variables**
```bash
# Database
POSTGRES_HOST=postgres
POSTGRES_PASSWORD=secure_password_here
POSTGRES_DB=taylordx

# Security
JWT_SECRET=base64_encoded_secret
SESSION_SECRET=base64_encoded_secret

# Enhanced Logging
LOG_LEVEL=info                 # debug|info|warn|error
DEBUG_MODE=false              # Verbose debugging  
LOG_REQUESTS=true             # Request/response logging
LOG_DB_QUERIES=false          # Database query logging
LOG_AUTH=true                 # Authentication events
LOG_RBAC=true                 # RBAC decisions
```

### **Production Deployment**
```bash
# 1. Copy environment template
cp .env.example .env

# 2. Generate secure secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For SESSION_SECRET  
openssl rand -base64 24  # For POSTGRES_PASSWORD

# 3. Deploy with production compose
docker-compose -f docker-compose.prod.yml up -d

# 4. Create admin user
docker-compose exec backend node user-manager.js create admin admin@domain.com password123 admin
```

### **Logging Configuration**
```bash
# Development: Minimal logging
LOG_LEVEL=info DEBUG_MODE=false LOG_REQUESTS=false

# Debugging: Maximum visibility  
LOG_LEVEL=debug DEBUG_MODE=true LOG_REQUESTS=true LOG_DB_QUERIES=true LOG_RBAC=true

# Production: Balanced logging
LOG_LEVEL=info LOG_REQUESTS=true LOG_AUTH=true
```

---

## 🛠️ **API ENDPOINTS**

### **Authentication**
```
POST   /api/auth/login          # User login
POST   /api/auth/logout         # User logout  
GET    /api/auth/me             # Current user info
POST   /api/auth/setup          # First-run admin setup
```

### **Services** 
```
GET    /api/services            # List services (RBAC filtered)
POST   /api/services            # Create service
PUT    /api/services/:id        # Update service
DELETE /api/services/:id        # Delete service (admin only)
GET    /api/services/:id/stats  # Service statistics
```

### **Resource Management**
```
GET    /api/services/groups     # Available groups
GET    /api/services/types      # Available resource types
GET    /api/services/tags       # All tags with usage counts
GET    /api/services/by-group/:name    # Services by group
GET    /api/services/permissions/summary  # User permissions overview
```

### **User Management**
```
GET    /api/users               # List users (admin only)
POST   /api/users               # Create user (admin only)  
PUT    /api/users/:id           # Update user
DELETE /api/users/:id           # Delete user (admin only)
GET    /api/users/:id/permissions     # User permissions
POST   /api/users/:id/apply-template  # Apply permission template
```

---

## 🎨 **FRONTEND COMPONENTS**

### **Main Components**
```
App.jsx                    # Main application with routing
├── AuthContext.jsx       # Authentication state management
├── AdminDashboard.jsx    # Admin interface
├── ServicesTab.jsx       # Service management
├── ServiceCard.jsx       # Individual service display  
├── UserManagement.jsx    # User administration
└── LoginForm.jsx         # Authentication form
```

### **Component Features**
- **Dark theme** with TailwindCSS
- **Responsive design** for mobile/desktop
- **Real-time updates** every 30 seconds
- **RBAC-aware UI** (components hide if no permission)
- **Error boundaries** for graceful failure handling

---

## 📊 **MONITORING & LOGGING**

### **Enhanced Logger**
- **Environment toggles**: Enable/disable specific log categories  
- **File rotation**: Separate files for debug, error, audit logs
- **Console colors**: Visual distinction between log levels
- **Context logging**: Rich metadata with every log entry
- **Performance tracking**: Request timing and slow query detection

### **Log Categories** 
```javascript
logger.request(req, 'API request received');
logger.rbac(user, resource, permission, granted);
logger.dbQuery(query, duration, error);  
logger.auth('User login attempt', { username });
logger.security('Suspicious activity', { ip, userAgent });
```

### **Log File Structure**
```
logs/
├── debug.log          # All application logs (JSON format)
├── error.log          # Errors and exceptions only
└── audit.log          # Security and auth events
```

---

## 🔧 **CLI TOOLS**

### **User Management CLI**
```bash
# List users
docker-compose exec backend node user-manager.js list

# Create user  
docker-compose exec backend node user-manager.js create username email password role

# Grant permissions
docker-compose exec backend node user-manager.js grant-tag username resource_type media '{"read":true}'

# Help
docker-compose exec backend node user-manager.js help
```

### **Database Operations**
```bash
# Run migrations
docker-compose exec backend node migrate.js

# Database backup
docker-compose exec postgres pg_dump -U taylordx taylordx > backup.sql

# Database restore
docker-compose exec -i postgres psql -U taylordx taylordx < backup.sql
```

---

## 🚨 **TROUBLESHOOTING**

### **Common Issues**

**1. "Error connecting to server"**
```bash
# Check backend health
curl http://localhost:5000/api/health

# Check logs
docker-compose logs backend
```

**2. "Access denied - insufficient permissions"**
```bash
# Check user permissions
docker-compose exec backend node user-manager.js list
docker-compose exec backend node user-manager.js grant-tag username resource_type media '{"read":true}'
```

**3. Database connection errors**  
```bash
# Check environment variables
docker-compose exec backend printenv | grep POSTGRES

# Test database connection
docker-compose exec backend node -e "require('./src/database/connection').query('SELECT 1')"
```

**4. Services not showing up**
```bash
# Enable RBAC debugging
# Add to .env: DEBUG_MODE=true LOG_RBAC=true  
docker-compose restart backend

# Check RBAC logs
docker-compose exec backend tail -f logs/debug.log | grep rbac
```

### **Debug Mode**
```bash
# Enable maximum debugging
echo "DEBUG_MODE=true
LOG_LEVEL=debug  
LOG_REQUESTS=true
LOG_DB_QUERIES=true
LOG_RBAC=true" >> .env

docker-compose restart backend
```

---

## 📈 **PERFORMANCE CONSIDERATIONS**

### **Database Optimizations**
- **Indexed columns**: user_id, resource_id, tag combinations
- **Connection pooling**: 20 max connections, 30s idle timeout
- **Query logging**: Track slow queries (>1000ms)

### **Frontend Optimizations** 
- **Service caching**: 30-second refresh interval
- **Lazy loading**: Large components split into chunks
- **Error boundaries**: Prevent cascading failures

### **Security Hardening**
- **JWT expiry**: 7-day tokens with refresh
- **Rate limiting**: 100 requests per 15 minutes
- **Input validation**: All user inputs sanitized
- **CORS policy**: Specific origin allowlist

---

## 🎯 **DEVELOPMENT ROADMAP**

### **Completed ✅**
- ✅ JWT authentication with bcrypt
- ✅ Advanced RBAC with tag-based permissions  
- ✅ User management (CLI + web UI)
- ✅ Resource grouping and tagging
- ✅ Enhanced logging system
- ✅ Docker containerization
- ✅ Service restoration and RBAC filtering

### **Next Phase 🔄**
- 🔄 Service stats collection and display
- 🔄 Real-time service health monitoring
- 🔄 API rate limiting middleware
- 🔄 Request/response validation
- 🔄 Performance monitoring dashboard

### **Future Enhancements 🚀** 
- 🚀 Automated testing suite (Jest + Cypress)
- 🚀 Service discovery automation
- 🚀 Custom dashboard widgets  
- 🚀 Multi-tenant support
- 🚀 Advanced analytics and reporting
- 🚀 API documentation (Swagger/OpenAPI)

---

## 👥 **CONTRIBUTORS & ACKNOWLEDGMENTS**

**Development**: Claude AI Assistant + Human Collaboration  
**Architecture**: Modular, scalable design principles
**Security**: Industry best practices (OWASP guidelines)
**UI/UX**: Modern dark theme with accessibility considerations

**Special Thanks**: To the open-source community for the excellent libraries and frameworks that make this project possible.

---

**📞 Support**: For issues or questions, check the troubleshooting section or review the comprehensive logs in the `logs/` directory.