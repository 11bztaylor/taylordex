-- Migration: Transform services table to unified resource architecture
-- This migration preserves existing data while expanding the architecture

-- Step 1: Create the new unified resources table
CREATE TABLE IF NOT EXISTS resources (
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
  
  -- Legacy fields (for migration compatibility)
  test_endpoint VARCHAR(255), -- Keep for existing services
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id),
  
  UNIQUE(name, type)
);

-- Step 2: Create resource tagging system
CREATE TABLE IF NOT EXISTS resource_tags (
  id SERIAL PRIMARY KEY,
  resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
  key VARCHAR(100) NOT NULL,
  value VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  UNIQUE(resource_id, key, value)
);

-- Step 3: Create tag-based permissions
CREATE TABLE IF NOT EXISTS tag_permissions (
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

-- Step 4: Create resource-specific permissions (override tag permissions)
CREATE TABLE IF NOT EXISTS resource_permissions (
  id SERIAL PRIMARY KEY,
  resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  permissions JSONB NOT NULL DEFAULT '{}',
  granted_by INTEGER REFERENCES users(id),
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  UNIQUE(resource_id, user_id)
);

-- Step 5: Create custom API definitions
CREATE TABLE IF NOT EXISTS custom_apis (
  id SERIAL PRIMARY KEY,
  resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL, -- GET, POST, PUT, DELETE
  endpoint VARCHAR(500) NOT NULL,
  headers JSONB DEFAULT '{}',
  body_template JSONB DEFAULT '{}',
  response_mapping JSONB DEFAULT '{}',
  description TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 6: Create resource stats table (replaces service_stats)
CREATE TABLE IF NOT EXISTS resource_stats (
  id SERIAL PRIMARY KEY,
  resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
  stats JSONB NOT NULL,
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 7: Migrate existing services to resources table
INSERT INTO resources (
  name, type, subtype, host, port, protocol, auth_type, credentials, 
  config, enabled, test_endpoint, created_at, updated_at
)
SELECT 
  name,
  'service', -- All existing entries become 'service' type
  CASE 
    WHEN type = 'homeassistant' THEN 'homeassistant'
    WHEN type = 'plex' THEN 'plex'
    WHEN type = 'radarr' THEN 'radarr'
    WHEN type = 'sonarr' THEN 'sonarr'
    WHEN type = 'lidarr' THEN 'lidarr'
    WHEN type = 'prowlarr' THEN 'prowlarr'
    WHEN type = 'overseerr' THEN 'overseerr'
    WHEN type = 'tautulli' THEN 'tautulli'
    WHEN type = 'portainer' THEN 'portainer'
    WHEN type = 'unraid' THEN 'unraid'
    ELSE type
  END as subtype,
  host,
  port,
  'http', -- Default protocol
  CASE 
    WHEN api_key IS NOT NULL THEN 'api_key'
    ELSE 'none'
  END as auth_type,
  CASE 
    WHEN api_key IS NOT NULL THEN 
      json_build_object('api_key', api_key)::jsonb
    ELSE '{}'::jsonb
  END as credentials,
  '{}'::jsonb as config, -- Empty config for now
  enabled,
  test_endpoint,
  created_at,
  updated_at
FROM services
ON CONFLICT (name, type) DO NOTHING;

-- Step 8: Migrate service stats to resource stats
INSERT INTO resource_stats (resource_id, stats, fetched_at)
SELECT 
  r.id as resource_id,
  ss.stats,
  ss.fetched_at
FROM service_stats ss
JOIN services s ON ss.service_id = s.id
JOIN resources r ON r.name = s.name AND r.type = 'service';

-- Step 9: Create default tags for migrated services
INSERT INTO resource_tags (resource_id, key, value, created_by)
SELECT 
  r.id,
  'resource_type',
  'service',
  1 -- Assume admin user (id=1) for system-created tags
FROM resources r
WHERE r.type = 'service'
ON CONFLICT (resource_id, key, value) DO NOTHING;

INSERT INTO resource_tags (resource_id, key, value, created_by)
SELECT 
  r.id,
  'category',
  CASE 
    WHEN r.subtype IN ('plex', 'radarr', 'sonarr', 'lidarr', 'overseerr', 'tautulli') THEN 'media'
    WHEN r.subtype = 'homeassistant' THEN 'automation'
    WHEN r.subtype IN ('portainer', 'unraid') THEN 'infrastructure'
    WHEN r.subtype = 'prowlarr' THEN 'indexer'
    ELSE 'general'
  END,
  1
FROM resources r
WHERE r.type = 'service'
ON CONFLICT (resource_id, key, value) DO NOTHING;

INSERT INTO resource_tags (resource_id, key, value, created_by)
SELECT 
  r.id,
  'environment',
  'production', -- Default to production for existing services
  1
FROM resources r
WHERE r.type = 'service'
ON CONFLICT (resource_id, key, value) DO NOTHING;

-- Step 10: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_subtype ON resources(subtype);
CREATE INDEX IF NOT EXISTS idx_resources_enabled ON resources(enabled);
CREATE INDEX IF NOT EXISTS idx_resources_health ON resources(health_status);
CREATE INDEX IF NOT EXISTS idx_resource_tags_resource ON resource_tags(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_tags_key_value ON resource_tags(key, value);
CREATE INDEX IF NOT EXISTS idx_tag_permissions_user ON tag_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_tag_permissions_tag ON tag_permissions(tag_key, tag_value);
CREATE INDEX IF NOT EXISTS idx_resource_permissions_resource ON resource_permissions(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_permissions_user ON resource_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_apis_resource ON custom_apis(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_stats_resource ON resource_stats(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_stats_fetched ON resource_stats(fetched_at);

-- Step 11: Create role templates for the permission system
CREATE TABLE IF NOT EXISTS role_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  resource_type VARCHAR(50), -- NULL = applies to all resource types
  permissions JSONB NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false -- System templates cannot be deleted
);

-- Insert default role templates
INSERT INTO role_templates (name, resource_type, permissions, description, is_system) VALUES
('ResourceAdmin', NULL, '{"read": true, "write": true, "control": true, "admin": true}', 'Full resource administration', true),
('ResourceUser', NULL, '{"read": true, "write": true, "control": true, "admin": false}', 'Resource operation without admin', true),
('ResourceViewer', NULL, '{"read": true, "write": false, "control": false, "admin": false}', 'Read-only access to resource', true),
('ServiceAdmin', 'service', '{"read": true, "write": true, "control": true, "admin": true}', 'Full service administration', true),
('DockerAdmin', 'docker', '{"read": true, "write": true, "control": true, "admin": true}', 'Full Docker resource control', true),
('MediaAdmin', NULL, '{"read": true, "write": true, "control": true, "admin": false}', 'Media services control', true)
ON CONFLICT (name) DO NOTHING;

-- Step 12: Grant admin users access to all resources by default
INSERT INTO tag_permissions (user_id, tag_key, tag_value, permissions, granted_by)
SELECT 
  u.id,
  'resource_type',
  'service',
  '{"read": true, "write": true, "control": true, "admin": true}'::jsonb,
  u.id
FROM users u
WHERE u.role = 'admin'
ON CONFLICT (user_id, tag_key, tag_value) DO NOTHING;

-- Grant regular users read access to all services by default
INSERT INTO tag_permissions (user_id, tag_key, tag_value, permissions, granted_by)
SELECT 
  u.id,
  'resource_type',
  'service',
  '{"read": true, "write": false, "control": false, "admin": false}'::jsonb,
  1 -- Granted by system admin
FROM users u
WHERE u.role IN ('user', 'readonly')
ON CONFLICT (user_id, tag_key, tag_value) DO NOTHING;

-- Step 13: Create views for backward compatibility (optional)
CREATE OR REPLACE VIEW services_view AS
SELECT 
  r.id,
  r.name,
  r.subtype as type,
  r.host,
  r.port,
  (r.credentials->>'api_key') as api_key,
  r.enabled,
  r.test_endpoint,
  r.created_at,
  r.updated_at
FROM resources r
WHERE r.type = 'service';

CREATE OR REPLACE VIEW service_stats_view AS
SELECT 
  rs.id,
  r.id as service_id,
  rs.stats,
  rs.fetched_at
FROM resource_stats rs
JOIN resources r ON rs.resource_id = r.id
WHERE r.type = 'service';

-- Migration complete marker
INSERT INTO auth_settings (key, value) VALUES 
  ('unified_resource_migration_complete', 'true'),
  ('migration_version', '001')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;