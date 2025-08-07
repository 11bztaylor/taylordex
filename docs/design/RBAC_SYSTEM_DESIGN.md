# RBAC System Design for TaylorDx Dashboard

## Overview

This document outlines the Role-Based Access Control (RBAC) system design for TaylorDx, following industry-standard practices with granular permissions for Docker containers, services, and system resources.

## Core RBAC Principles

### 1. Users, Roles, and Permissions Model
```
Users → Roles → Permissions → Resources
```

### 2. Granular Resource Control
- **Service-level**: Read/write access to specific services (Radarr, Plex, etc.)
- **Docker-level**: Control over specific containers or Docker hosts
- **Machine-level**: Access to system resources and logs
- **Feature-level**: Access to specific dashboard features

## Database Schema Design

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret VARCHAR(32)
);
```

### Roles Table
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Permissions Table
```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  resource_type VARCHAR(50) NOT NULL, -- 'service', 'docker', 'system', 'logs'
  action VARCHAR(50) NOT NULL, -- 'read', 'write', 'delete', 'execute', 'control'
  description TEXT
);
```

### User Roles (Many-to-Many)
```sql
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by UUID REFERENCES users(id),
  PRIMARY KEY (user_id, role_id)
);
```

### Role Permissions (Many-to-Many)
```sql
CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
```

### Resource-Specific Permissions
```sql
CREATE TABLE resource_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(100) NOT NULL, -- service ID, container name, etc.
  permission_type VARCHAR(50) NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);
```

## Pre-defined Roles

### System Administrator
**Full access to everything**
```json
{
  "name": "System Administrator",
  "permissions": [
    "system.*",
    "services.*", 
    "docker.*",
    "users.*",
    "logs.*"
  ]
}
```

### Service Manager
**Manage services but limited system access**
```json
{
  "name": "Service Manager", 
  "permissions": [
    "services.read",
    "services.write",
    "services.restart",
    "docker.read",
    "logs.read"
  ]
}
```

### Docker Operator
**Docker container management focus**
```json
{
  "name": "Docker Operator",
  "permissions": [
    "docker.read",
    "docker.start", 
    "docker.stop",
    "docker.restart",
    "logs.containers.read",
    "services.read"
  ]
}
```

### Read-Only Viewer
**View-only access to dashboard**
```json
{
  "name": "Read-Only Viewer",
  "permissions": [
    "services.read",
    "docker.read", 
    "system.read",
    "logs.read"
  ]
}
```

### Media Manager
**Specific to media services**
```json
{
  "name": "Media Manager",
  "permissions": [
    "services.radarr.*",
    "services.sonarr.*", 
    "services.plex.*",
    "services.prowlarr.*",
    "docker.media-stack.*"
  ]
}
```

### Home Automation Manager  
**Home Assistant and IoT focus**
```json
{
  "name": "Home Automation Manager",
  "permissions": [
    "services.homeassistant.*",
    "services.unraid.read",
    "docker.iot.*"
  ]
}
```

## Granular Permission System

### Service-Level Permissions
```
services.{service_type}.{action}
- services.radarr.read
- services.radarr.write  
- services.radarr.restart
- services.plex.control
- services.homeassistant.execute
```

### Docker-Level Permissions  
```
docker.{scope}.{action}
- docker.container.{container_name}.start
- docker.container.{container_name}.stop
- docker.host.{host_id}.read
- docker.network.manage
- docker.volume.manage
```

### System-Level Permissions
```
system.{resource}.{action}
- system.resources.read
- system.logs.read
- system.users.manage
- system.settings.write
```

## Implementation Approach

### 1. Middleware Authentication
```javascript
// JWT-based authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  // Verify JWT and attach user to req
};
```

### 2. Permission Checking Middleware
```javascript
const requirePermission = (permission) => {
  return async (req, res, next) => {
    const hasPermission = await checkUserPermission(req.user.id, permission);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
```

### 3. Resource-Specific Access Control
```javascript
// Check access to specific Docker container
const checkContainerAccess = async (userId, containerId, action) => {
  // Check both role-based and resource-specific permissions
  const rolePermissions = await getUserRolePermissions(userId);
  const resourcePermissions = await getResourcePermissions(userId, 'docker', containerId);
  
  return hasPermission(rolePermissions, resourcePermissions, `docker.${action}`);
};
```

## API Route Protection

### Service Endpoints
```javascript
// Protected service routes
router.get('/api/services', authenticateToken, requirePermission('services.read'));
router.post('/api/services', authenticateToken, requirePermission('services.write'));
router.delete('/api/services/:id', authenticateToken, requirePermission('services.delete'));
```

### Docker Endpoints  
```javascript
// Container-specific permissions
router.post('/api/docker/:containerId/start', 
  authenticateToken, 
  checkContainerPermission('start')
);
```

## Frontend Permission Integration

### Role-Based UI Rendering
```javascript
// Show/hide features based on permissions
const ServiceCard = ({ service, userPermissions }) => {
  const canEdit = userPermissions.includes(`services.${service.type}.write`);
  const canDelete = userPermissions.includes(`services.${service.type}.delete`);
  
  return (
    <div>
      {/* Service display */}
      {canEdit && <EditButton />}
      {canDelete && <DeleteButton />}
    </div>
  );
};
```

### Dynamic Menu Generation
```javascript
// Generate navigation based on user permissions
const generateNavigation = (userPermissions) => {
  const nav = [];
  
  if (userPermissions.includes('services.read')) {
    nav.push({ name: 'Services', path: '/services' });
  }
  
  if (userPermissions.includes('docker.read')) {
    nav.push({ name: 'Docker', path: '/docker' });
  }
  
  if (userPermissions.includes('users.manage')) {
    nav.push({ name: 'Users', path: '/users' });
  }
  
  return nav;
};
```

## Security Considerations

### 1. Password Security
- Bcrypt hashing with salt rounds ≥ 12
- Password complexity requirements
- Password history to prevent reuse

### 2. Session Management
- JWT tokens with reasonable expiration (15 minutes access, 7 days refresh)
- Secure httpOnly cookies for refresh tokens
- Token blacklisting for logout

### 3. Multi-Factor Authentication
- TOTP support for sensitive roles
- Backup codes for account recovery
- MFA required for admin operations

### 4. Audit Logging
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(100),
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Migration Strategy

### Phase 1: Core Authentication
- [ ] User registration/login system
- [ ] JWT token management
- [ ] Basic role assignment

### Phase 2: Service Permissions
- [ ] Service-level access control
- [ ] Role-based service visibility
- [ ] Service action restrictions

### Phase 3: Docker Permissions
- [ ] Container-specific permissions
- [ ] Docker host access control
- [ ] Container action restrictions

### Phase 4: Advanced Features
- [ ] Resource-specific permissions
- [ ] Time-based access control
- [ ] Advanced audit logging

## API Design Examples

### User Management
```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/users
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id
GET    /api/users/:id/permissions
PUT    /api/users/:id/roles
```

### Role Management
```
GET    /api/roles
POST   /api/roles
PUT    /api/roles/:id
DELETE /api/roles/:id
GET    /api/roles/:id/permissions
PUT    /api/roles/:id/permissions
```

This RBAC system provides enterprise-grade access control while maintaining flexibility for various deployment scenarios and user needs.