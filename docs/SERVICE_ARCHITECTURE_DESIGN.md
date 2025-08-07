# Global Service Architecture with Role-Based Access Control
## TaylorDx Service Management System

### Overview

This document outlines the proper architecture for global service management with role-based permission delegation, moving away from user-session-tied services to enterprise-grade access control.

## Core Principles

1. **Global Services**: Services are system-wide resources, not user-owned
2. **Role-Based Access**: Permissions based on user roles and capabilities  
3. **Granular Control**: Different permission levels per service type
4. **Delegation**: Admins can delegate specific permissions to users
5. **Audit Trail**: All service actions are logged with user attribution

## Architecture Components

### 1. Service Registry (Global)
```sql
-- Services are global resources
CREATE TABLE services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL,
  host VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL,
  api_key VARCHAR(255),
  config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id)
);
```

### 2. Permission Matrix System
```sql
-- Service-specific permissions per user
CREATE TABLE service_permissions (
  id SERIAL PRIMARY KEY,
  service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  permissions JSONB NOT NULL DEFAULT '{}', -- {"read": true, "write": false, "control": false, "admin": false}
  granted_by INTEGER REFERENCES users(id),
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  UNIQUE(service_id, user_id)
);
```

### 3. Role Templates
```sql
-- Predefined permission templates
CREATE TABLE role_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  service_type VARCHAR(50), -- NULL = applies to all service types
  permissions JSONB NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false -- System templates cannot be deleted
);

-- Example system templates
INSERT INTO role_templates (name, service_type, permissions, description, is_system) VALUES
('ServiceAdmin', NULL, '{"read": true, "write": true, "control": true, "admin": true}', 'Full service administration', true),
('ServiceUser', NULL, '{"read": true, "write": true, "control": true, "admin": false}', 'Service operation without admin', true),
('ServiceViewer', NULL, '{"read": true, "write": false, "control": false, "admin": false}', 'Read-only access to service', true),
('MediaAdmin', 'media', '{"read": true, "write": true, "control": true, "admin": true}', 'Full media service control', true),
('HomeControl', 'homeassistant', '{"read": true, "write": true, "control": true, "admin": false}', 'Home automation control', true);
```

### 4. Service Groups (Optional)
```sql
-- Group related services for easier management
CREATE TABLE service_groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6B7280', -- Hex color for UI
  created_by INTEGER REFERENCES users(id)
);

CREATE TABLE service_group_memberships (
  service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
  group_id INTEGER REFERENCES service_groups(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, group_id)
);

-- Example groups
INSERT INTO service_groups (name, description, color) VALUES
('Media Services', 'Plex, Radarr, Sonarr, etc.', '#F59E0B'),
('Home Automation', 'Home Assistant, IoT devices', '#10B981'),
('Infrastructure', 'Docker, Unraid, monitoring', '#3B82F6');
```

## Permission Levels

### Service Permission Types
| Permission | Description | Examples |
|------------|-------------|----------|
| `read` | View service status, stats, config | Dashboard cards, status pages |
| `write` | Modify service configuration | Change settings, update API keys |
| `control` | Execute service actions | Start/stop containers, run automations |
| `admin` | Full service management | Delete service, manage permissions |

### User Role Hierarchy
| Role | Default Permissions | Description |
|------|-------------------|-------------|
| `admin` | All services: read,write,control,admin | System administrator |
| `user` | Services: read,write,control | Regular user with service access |
| `readonly` | All services: read | View-only access |

## Implementation Strategy

### Phase 1: Database Schema Migration
```sql
-- Add permission tracking to existing services
ALTER TABLE services ADD COLUMN created_by INTEGER REFERENCES users(id);
ALTER TABLE services ADD COLUMN updated_by INTEGER REFERENCES users(id);

-- Create permission tables
-- (Include all tables from above)
```

### Phase 2: Service Access Control
```javascript
class ServiceAccessControl {
  async checkPermission(userId, serviceId, permission) {
    // 1. Check if user is admin (has all permissions)
    const user = await this.getUser(userId);
    if (user.role === 'admin') return true;
    
    // 2. Check explicit service permissions
    const userPerms = await this.getUserServicePermissions(userId, serviceId);
    if (userPerms && userPerms[permission]) return true;
    
    // 3. Check role-based default permissions
    const rolePerms = await this.getRoleServicePermissions(user.role, serviceId);
    return rolePerms && rolePerms[permission];
  }
  
  async grantServiceAccess(adminId, userId, serviceId, permissions) {
    // Only admins or users with admin permission on service can grant access
    if (!await this.checkPermission(adminId, serviceId, 'admin')) {
      throw new Error('Insufficient permissions to grant access');
    }
    
    return await this.setUserServicePermissions(userId, serviceId, permissions, adminId);
  }
}
```

### Phase 3: API Middleware Enhancement
```javascript
const requireServicePermission = (permission) => {
  return async (req, res, next) => {
    const { serviceId } = req.params;
    const userId = req.user.id;
    
    const hasPermission = await serviceAccessControl.checkPermission(
      userId, 
      serviceId, 
      permission
    );
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: `${permission} permission required for this service`,
        code: 'INSUFFICIENT_SERVICE_PERMISSION'
      });
    }
    
    next();
  };
};

// Usage in routes
router.get('/services/:serviceId/stats', requireServicePermission('read'), getServiceStats);
router.post('/services/:serviceId/control', requireServicePermission('control'), controlService);
router.delete('/services/:serviceId', requireServicePermission('admin'), deleteService);
```

### Phase 4: Frontend Permission System
```javascript
// Service access context
const ServiceAccessContext = createContext();

export const ServiceAccessProvider = ({ children }) => {
  const { user } = useAuth();
  const [servicePermissions, setServicePermissions] = useState({});
  
  const canAccess = (serviceId, permission) => {
    if (user?.role === 'admin') return true;
    return servicePermissions[serviceId]?.[permission] || false;
  };
  
  return (
    <ServiceAccessContext.Provider value={{ canAccess }}>
      {children}
    </ServiceAccessContext.Provider>
  );
};

// Usage in components
const ServiceCard = ({ service }) => {
  const { canAccess } = useServiceAccess();
  
  return (
    <div className="service-card">
      {canAccess(service.id, 'read') && (
        <ServiceStats serviceId={service.id} />
      )}
      {canAccess(service.id, 'control') && (
        <ServiceControls serviceId={service.id} />
      )}
      {canAccess(service.id, 'admin') && (
        <ServiceSettings serviceId={service.id} />
      )}
    </div>
  );
};
```

## Benefits of This Architecture

### 1. Scalability
- ✅ Services are global resources accessible by authorized users
- ✅ Permission delegation allows distributed administration
- ✅ Role templates enable consistent permission management

### 2. Security
- ✅ Granular permission control per service
- ✅ Audit trail for all service access and modifications
- ✅ No shared credentials or session-dependent access

### 3. Usability
- ✅ Intuitive permission delegation interface
- ✅ Service grouping for easier management
- ✅ Role-based UI rendering shows only accessible features

### 4. Enterprise Ready
- ✅ RBAC compliance for enterprise environments
- ✅ Integration ready with external identity providers
- ✅ Audit and compliance reporting capabilities

## Migration Path

### Step 1: Schema Migration
1. Add new tables for permissions and templates
2. Migrate existing services to global model
3. Set default permissions for existing users

### Step 2: Backend Implementation
1. Implement ServiceAccessControl class
2. Add permission middleware to all service routes
3. Update service controllers to check permissions

### Step 3: Frontend Updates
1. Add ServiceAccessProvider context
2. Update service components to respect permissions
3. Add permission management UI for admins

### Step 4: Testing & Rollout
1. Test permission scenarios thoroughly
2. Validate all service access patterns
3. Deploy with feature flags for gradual rollout

This architecture provides enterprise-grade service management while maintaining the simplicity needed for home lab environments.