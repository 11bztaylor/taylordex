-- Conservative Migration: Add unified resource system alongside existing services
-- This migration creates the new system without breaking existing functionality

-- Step 1: Create the new unified resources table (parallel to services)
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
  
  -- Link to existing services (for migration tracking)
  legacy_service_id INTEGER REFERENCES services(id),
  
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

-- Step 4: Create resource-specific permissions
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

-- Step 5: Create resource stats table (parallel to service_stats)
CREATE TABLE IF NOT EXISTS resource_stats (
  id SERIAL PRIMARY KEY,
  resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
  stats JSONB NOT NULL,
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 6: Create role templates for permissions
CREATE TABLE IF NOT EXISTS role_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  resource_type VARCHAR(50), -- NULL = applies to all resource types
  permissions JSONB NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false
);

-- Step 7: Insert default role templates
INSERT INTO role_templates (name, resource_type, permissions, description, is_system) VALUES
('ResourceAdmin', NULL, '{"read": true, "write": true, "control": true, "admin": true}', 'Full resource administration', true),
('ResourceUser', NULL, '{"read": true, "write": true, "control": true, "admin": false}', 'Resource operation without admin', true),
('ResourceViewer', NULL, '{"read": true, "write": false, "control": false, "admin": false}', 'Read-only access to resource', true),
('ServiceAdmin', 'service', '{"read": true, "write": true, "control": true, "admin": true}', 'Full service administration', true),
('DockerAdmin', 'docker', '{"read": true, "write": true, "control": true, "admin": true}', 'Full Docker resource control', true),
('MediaAdmin', NULL, '{"read": true, "write": true, "control": true, "admin": false}', 'Media services control', true)
ON CONFLICT (name) DO NOTHING;

-- Step 8: Copy existing services to resources table (optional, keeps both systems)
-- This is a one-way sync for now - changes in services won't automatically sync to resources
INSERT INTO resources (
  name, type, subtype, host, port, protocol, auth_type, credentials, 
  config, enabled, legacy_service_id, created_at, updated_at, created_by
)
SELECT 
  s.name,
  'service',
  CASE 
    WHEN s.type = 'homeassistant' THEN 'homeassistant'
    WHEN s.type = 'plex' THEN 'plex'
    WHEN s.type = 'radarr' THEN 'radarr'
    WHEN s.type = 'sonarr' THEN 'sonarr'
    WHEN s.type = 'lidarr' THEN 'lidarr'
    WHEN s.type = 'prowlarr' THEN 'prowlarr'
    WHEN s.type = 'overseerr' THEN 'overseerr'
    WHEN s.type = 'tautulli' THEN 'tautulli'
    WHEN s.type = 'portainer' THEN 'portainer'
    WHEN s.type = 'unraid' THEN 'unraid'
    ELSE s.type
  END as subtype,
  s.host,
  s.port,
  'http',
  CASE 
    WHEN s.api_key IS NOT NULL THEN 'api_key'
    ELSE 'none'
  END as auth_type,
  CASE 
    WHEN s.api_key IS NOT NULL THEN 
      json_build_object('api_key', s.api_key)::jsonb
    ELSE '{}'::jsonb
  END as credentials,
  json_build_object('test_endpoint', s.test_endpoint)::jsonb as config,
  s.enabled,
  s.id as legacy_service_id,
  s.created_at,
  s.updated_at,
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1) -- Default to admin user for existing services
FROM services s
ON CONFLICT (name, type) DO NOTHING;

-- Step 9: Create default tags for services
INSERT INTO resource_tags (resource_id, key, value, created_by)
SELECT 
  r.id,
  'resource_type',
  'service',
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
FROM resources r
WHERE r.type = 'service' AND r.legacy_service_id IS NOT NULL
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
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
FROM resources r
WHERE r.type = 'service' AND r.legacy_service_id IS NOT NULL
ON CONFLICT (resource_id, key, value) DO NOTHING;

-- Step 10: Grant admin users access to all service resources
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

-- Grant regular users read access to service resources
INSERT INTO tag_permissions (user_id, tag_key, tag_value, permissions, granted_by)
SELECT 
  u.id,
  'resource_type',
  'service',
  '{"read": true, "write": false, "control": false, "admin": false}'::jsonb,
  (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
FROM users u
WHERE u.role IN ('user', 'readonly')
ON CONFLICT (user_id, tag_key, tag_value) DO NOTHING;

-- Step 11: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_subtype ON resources(subtype);
CREATE INDEX IF NOT EXISTS idx_resources_enabled ON resources(enabled);
CREATE INDEX IF NOT EXISTS idx_resources_health ON resources(health_status);
CREATE INDEX IF NOT EXISTS idx_resources_legacy ON resources(legacy_service_id);
CREATE INDEX IF NOT EXISTS idx_resource_tags_resource ON resource_tags(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_tags_key_value ON resource_tags(key, value);
CREATE INDEX IF NOT EXISTS idx_tag_permissions_user ON tag_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_tag_permissions_tag ON tag_permissions(tag_key, tag_value);
CREATE INDEX IF NOT EXISTS idx_resource_permissions_resource ON resource_permissions(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_permissions_user ON resource_permissions(user_id);

-- Step 12: Create sync functions to keep resources in sync with services (optional)
CREATE OR REPLACE FUNCTION sync_service_to_resource()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Insert new resource when service is created
    INSERT INTO resources (
      name, type, subtype, host, port, protocol, auth_type, credentials,
      config, enabled, legacy_service_id, created_by
    ) VALUES (
      NEW.name,
      'service',
      NEW.type,
      NEW.host,
      NEW.port,
      'http',
      CASE WHEN NEW.api_key IS NOT NULL THEN 'api_key' ELSE 'none' END,
      CASE WHEN NEW.api_key IS NOT NULL THEN 
        json_build_object('api_key', NEW.api_key)::jsonb
      ELSE '{}'::jsonb END,
      json_build_object('test_endpoint', NEW.test_endpoint)::jsonb,
      NEW.enabled,
      NEW.id,
      1
    ) ON CONFLICT (name, type) DO NOTHING;
    
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    -- Update corresponding resource
    UPDATE resources SET 
      name = NEW.name,
      host = NEW.host,
      port = NEW.port,
      auth_type = CASE WHEN NEW.api_key IS NOT NULL THEN 'api_key' ELSE 'none' END,
      credentials = CASE WHEN NEW.api_key IS NOT NULL THEN 
        json_build_object('api_key', NEW.api_key)::jsonb
      ELSE '{}'::jsonb END,
      config = json_build_object('test_endpoint', NEW.test_endpoint)::jsonb,
      enabled = NEW.enabled,
      updated_at = NEW.updated_at
    WHERE legacy_service_id = NEW.id;
    
    RETURN NEW;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    -- Mark resource as disabled rather than deleting
    UPDATE resources SET 
      enabled = false,
      updated_at = CURRENT_TIMESTAMP
    WHERE legacy_service_id = OLD.id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync services to resources
CREATE TRIGGER sync_services_to_resources
  AFTER INSERT OR UPDATE OR DELETE ON services
  FOR EACH ROW
  EXECUTE FUNCTION sync_service_to_resource();

-- Step 13: Mark migration as complete
INSERT INTO auth_settings (key, value) VALUES 
  ('unified_resource_parallel_migration_complete', 'true'),
  ('parallel_migration_version', '001')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Migration complete message
DO $$
BEGIN
  RAISE NOTICE '✅ Unified Resource Parallel Migration Complete';
  RAISE NOTICE '📋 Resources table created alongside services table';
  RAISE NOTICE '🔄 Auto-sync enabled: services changes sync to resources';
  RAISE NOTICE '🏷️  Tag-based permission system ready';
  RAISE NOTICE '⚡ Both old and new APIs can coexist during transition';
END $$;