# Unified Resource Management Architecture
## Enterprise Infrastructure Platform with API Integration & Resource Tagging

### Overview

This design creates a comprehensive resource management system that treats **everything as a resource** - services, APIs, containers, VMs, devices, etc. - with unified tagging, permissions, and API integration capabilities.

## Core Concepts

### 1. Everything is a Resource
```
Resources (Unified Model)
├── Services (Home Assistant, Plex, Radarr)
├── Containers (Docker containers)  
├── Virtual Machines (Proxmox, VMware, etc.)
├── APIs (REST, GraphQL, WebSocket)
├── Devices (IoT, network devices)
├── Storage (NAS, drives, shares)
└── Custom (User-defined resource types)
```

### 2. Resource Tagging System
```
Tags provide flexible categorization:
- resource_type: docker, vm, api, service, device
- environment: production, staging, development  
- category: media, automation, infrastructure, monitoring
- location: rack1, office, datacenter
- owner: team-media, team-infra, user-john
- criticality: critical, high, medium, low
```

### 3. API-First Design
```
Everything accessible via unified API:
├── Resource Management API
├── Permission Delegation API  
├── Tag Management API
├── Custom Integration API
└── Webhook/Event API
```

## Database Schema

### Unified Resource Model
```sql
-- Core resource registry
CREATE TABLE resources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'service', 'docker', 'vm', 'api', 'device', 'custom'
  subtype VARCHAR(50), -- 'homeassistant', 'container', 'proxmox', 'rest', 'switch'
  
  -- Connection information
  host VARCHAR(255),
  port INTEGER,
  protocol VARCHAR(20) DEFAULT 'http', -- http, https, ssh, tcp, udp
  path VARCHAR(255), -- API endpoint path
  
  -- Authentication
  auth_type VARCHAR(50), -- 'api_key', 'basic', 'oauth', 'certificate', 'none'
  credentials JSONB, -- Encrypted credential storage
  
  -- Configuration
  config JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Status
  enabled BOOLEAN DEFAULT true,
  health_status VARCHAR(20) DEFAULT 'unknown', -- healthy, warning, critical, unknown
  last_check TIMESTAMP,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id),
  
  UNIQUE(name, type)
);

-- Resource tagging system
CREATE TABLE resource_tags (
  id SERIAL PRIMARY KEY,
  resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
  key VARCHAR(100) NOT NULL,
  value VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  UNIQUE(resource_id, key, value)
);

-- Tag-based permissions
CREATE TABLE tag_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  tag_key VARCHAR(100) NOT NULL,
  tag_value VARCHAR(255) NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}', -- {"read": true, "write": false, "control": false, "admin": false}
  granted_by INTEGER REFERENCES users(id),
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  UNIQUE(user_id, tag_key, tag_value)
);

-- Resource-specific permissions (override tag permissions)
CREATE TABLE resource_permissions (
  id SERIAL PRIMARY KEY,
  resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  permissions JSONB NOT NULL DEFAULT '{}',
  granted_by INTEGER REFERENCES users(id),
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  UNIQUE(resource_id, user_id)
);

-- Custom API definitions
CREATE TABLE custom_apis (
  id SERIAL PRIMARY KEY,
  resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL, -- GET, POST, PUT, DELETE
  endpoint VARCHAR(500) NOT NULL,
  headers JSONB DEFAULT '{}',
  body_template JSONB DEFAULT '{}',
  response_mapping JSONB DEFAULT '{}',
  description TEXT,
  created_by INTEGER REFERENCES users(id)
);
```

### Resource Type Examples
```sql
-- Insert resource type templates
INSERT INTO resources (name, type, subtype, host, port, auth_type, config) VALUES
-- Services
('Home Assistant', 'service', 'homeassistant', '192.168.15.179', 8123, 'api_key', '{"websocket": true}'),
('Plex Media Server', 'service', 'plex', '192.168.1.100', 32400, 'api_key', '{"libraries": true}'),

-- Docker Resources  
('Radarr Container', 'docker', 'container', '192.168.1.100', 7878, 'api_key', '{"container_name": "radarr"}'),
('Docker Host', 'docker', 'host', '192.168.1.100', 2376, 'certificate', '{"docker_api": "/var/run/docker.sock"}'),

-- Virtual Machines
('Proxmox VM-100', 'vm', 'proxmox', '192.168.1.50', 8006, 'api_key', '{"vmid": 100, "node": "pve1"}'),
('ESXi VM', 'vm', 'vmware', '192.168.1.60', 443, 'basic', '{"vm_id": "vm-123"}'),

-- APIs
('Weather API', 'api', 'rest', 'api.weather.gov', 443, 'none', '{"base_path": "/v1"}'),
('Custom Webhook', 'api', 'webhook', 'localhost', 3001, 'bearer', '{"event_types": ["motion", "door"]}'),

-- Devices
('Network Switch', 'device', 'switch', '192.168.1.1', 22, 'ssh', '{"ports": 24, "poe": true}'),
('UPS', 'device', 'ups', '192.168.1.10', 161, 'snmp', '{"community": "public"}'),

-- Custom Resources
('Backup Job', 'custom', 'backup', 'backup.local', 22, 'ssh', '{"schedule": "daily", "retention": 30}');
```

### Tag Examples
```sql
-- Tag resources for flexible management
INSERT INTO resource_tags (resource_id, key, value) VALUES
-- Resource types
(1, 'resource_type', 'service'),
(1, 'category', 'automation'),
(1, 'environment', 'production'),
(1, 'location', 'home'),
(1, 'criticality', 'high'),

(2, 'resource_type', 'service'),
(2, 'category', 'media'),
(2, 'environment', 'production'),

(3, 'resource_type', 'docker'),
(3, 'category', 'media'),
(3, 'host_type', 'container'),

-- Group tagging for bulk operations
(4, 'resource_type', 'docker'),
(5, 'resource_type', 'docker'),
(6, 'resource_type', 'vm'),
(7, 'resource_type', 'vm'),
(8, 'resource_type', 'api'),
(9, 'resource_type', 'device'),
(10, 'resource_type', 'device');
```

## Permission System

### Tag-Based Permissions
```javascript
class UnifiedPermissionSystem {
  async checkResourceAccess(userId, resourceId, permission) {
    // 1. Check if user is admin (has all permissions)
    if (await this.isAdmin(userId)) return true;
    
    // 2. Check explicit resource permissions (highest priority)
    const resourcePerms = await this.getResourcePermissions(userId, resourceId);
    if (resourcePerms && resourcePerms[permission]) return true;
    
    // 3. Check tag-based permissions
    const resourceTags = await this.getResourceTags(resourceId);
    for (const tag of resourceTags) {
      const tagPerms = await this.getTagPermissions(userId, tag.key, tag.value);
      if (tagPerms && tagPerms[permission]) return true;
    }
    
    // 4. Check role-based defaults
    return await this.checkRolePermission(userId, permission);
  }
  
  async grantTagAccess(adminId, userId, tagKey, tagValue, permissions) {
    // Grant access to all resources with specific tag
    return await this.setTagPermissions(userId, tagKey, tagValue, permissions, adminId);
  }
  
  async grantBulkAccess(adminId, userId, resourceType, permissions) {
    // Grant access to all resources of specific type
    return await this.grantTagAccess(adminId, userId, 'resource_type', resourceType, permissions);
  }
}

// Usage examples:
// Grant user access to all Docker resources
await permissions.grantBulkAccess(adminId, userId, 'docker', {read: true, control: true});

// Grant user access to all media category resources  
await permissions.grantTagAccess(adminId, userId, 'category', 'media', {read: true, write: true});

// Grant access to specific environment
await permissions.grantTagAccess(adminId, userId, 'environment', 'production', {read: true});
```

## API Integration Framework

### Custom API Builder
```javascript
class CustomAPIBuilder {
  async createCustomAPI(resourceId, apiDefinition) {
    const {name, method, endpoint, headers, bodyTemplate, responseMapping} = apiDefinition;
    
    // Store API definition
    await db.query(`
      INSERT INTO custom_apis 
      (resource_id, name, method, endpoint, headers, body_template, response_mapping)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [resourceId, name, method, endpoint, headers, bodyTemplate, responseMapping]);
    
    // Auto-generate API route
    this.registerDynamicRoute(resourceId, apiDefinition);
  }
  
  registerDynamicRoute(resourceId, apiDef) {
    const route = `/api/resources/${resourceId}/custom/${apiDef.name}`;
    
    router[apiDef.method.toLowerCase()](route, 
      requireResourcePermission('control'),
      async (req, res) => {
        const resource = await this.getResource(resourceId);
        const result = await this.executeCustomAPI(resource, apiDef, req.body);
        res.json(result);
      }
    );
  }
}

// Example: Create custom API for Docker container restart
await customAPI.createCustomAPI(dockerResourceId, {
  name: 'restart-container',
  method: 'POST',
  endpoint: '/containers/{{container_name}}/restart',
  headers: {'Content-Type': 'application/json'},
  bodyTemplate: {},
  responseMapping: {
    success: '{{status_code}} === 204',
    message: 'Container restarted successfully'
  }
});
```

### Pre-built API Templates
```javascript
const apiTemplates = {
  docker: {
    'start-container': {
      method: 'POST',
      endpoint: '/containers/{{container_name}}/start',
      description: 'Start Docker container'
    },
    'get-logs': {
      method: 'GET', 
      endpoint: '/containers/{{container_name}}/logs?tail={{lines}}',
      description: 'Get container logs'
    }
  },
  
  proxmox: {
    'vm-status': {
      method: 'GET',
      endpoint: '/nodes/{{node}}/qemu/{{vmid}}/status/current',
      description: 'Get VM status'
    },
    'start-vm': {
      method: 'POST',
      endpoint: '/nodes/{{node}}/qemu/{{vmid}}/status/start',
      description: 'Start virtual machine'
    }
  },
  
  homeassistant: {
    'call-service': {
      method: 'POST',
      endpoint: '/api/services/{{domain}}/{{service}}',
      bodyTemplate: {'entity_id': '{{entity_id}}'},
      description: 'Call Home Assistant service'
    }
  }
};
```

## Frontend Interface

### Resource Management Dashboard
```javascript
const ResourceDashboard = () => {
  const [resources, setResources] = useState([]);
  const [selectedTags, setSelectedTags] = useState({});
  const [viewMode, setViewMode] = useState('grid'); // grid, list, topology
  
  const filteredResources = resources.filter(resource => {
    return Object.entries(selectedTags).every(([key, values]) => 
      resource.tags.some(tag => tag.key === key && values.includes(tag.value))
    );
  });
  
  return (
    <div className="resource-dashboard">
      <ResourceFilters 
        tags={selectedTags} 
        onTagChange={setSelectedTags}
        availableTags={getAvailableTags(resources)}
      />
      
      <ViewModeToggle mode={viewMode} onChange={setViewMode} />
      
      {viewMode === 'grid' && (
        <ResourceGrid resources={filteredResources} />
      )}
      
      {viewMode === 'topology' && (
        <ResourceTopology resources={filteredResources} />
      )}
    </div>
  );
};

// Permission delegation interface
const PermissionManager = () => {
  return (
    <div className="permission-manager">
      <h2>Grant Resource Access</h2>
      
      <UserSelector onUserSelect={setSelectedUser} />
      
      <div className="permission-options">
        {/* Tag-based permissions */}
        <div className="tag-permissions">
          <h3>By Resource Type</h3>
          <TagSelector 
            onSelect={(key, value) => grantTagAccess(user, key, value, permissions)}
            suggestions={['docker', 'vm', 'api', 'service']}
          />
        </div>
        
        {/* Specific resource permissions */}
        <div className="resource-permissions">
          <h3>Specific Resources</h3>
          <ResourceSelector 
            onSelect={(resourceId) => grantResourceAccess(user, resourceId, permissions)}
          />
        </div>
        
        {/* Bulk operations */}
        <div className="bulk-permissions">
          <h3>Bulk Assignment</h3>
          <button onClick={() => grantAllDockerAccess(user)}>
            Grant All Docker Access
          </button>
          <button onClick={() => grantAllVMAccess(user)}>
            Grant All VM Access  
          </button>
        </div>
      </div>
    </div>
  );
};
```

## Implementation Benefits

### 1. **Unified Management**
```
Single interface for:
✅ Docker containers & hosts
✅ Virtual machines (Proxmox, VMware, Hyper-V)  
✅ Services (Home Assistant, Plex, *arr stack)
✅ APIs (REST, GraphQL, webhooks)
✅ Network devices (switches, routers, APs)
✅ Storage systems (NAS, SAN, cloud)
✅ Custom integrations
```

### 2. **Flexible Permissions**
```
Grant access by:
✅ Resource type: "All Docker containers"
✅ Category: "All media services" 
✅ Environment: "All production resources"
✅ Location: "All datacenter equipment"
✅ Custom tags: "All backup-related resources"
✅ Individual resources: "This specific VM"
```

### 3. **API Integration**
```
✅ Pre-built templates for common platforms
✅ Custom API builder for any REST/GraphQL service
✅ Webhook support for event-driven automation
✅ Authentication handling (API keys, OAuth, certificates)
✅ Response mapping and error handling
```

### 4. **Enterprise Features**
```
✅ Resource discovery and auto-registration
✅ Health monitoring and alerting
✅ Audit logging for all operations
✅ Role templates and bulk permissions
✅ API-first design for external integrations
✅ Tag-based automation and policies
```

This architecture transforms your dashboard into a comprehensive **Infrastructure Management Platform** that can handle any resource type with enterprise-grade permissions and API integration capabilities.

Would you like me to implement this unified system? I can start with the core database changes and resource model, then layer on the permission system and custom API builder.