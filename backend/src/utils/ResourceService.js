const { query } = require('../database/connection');

/**
 * Resource Service - Abstraction layer for unified resource management
 * Provides a unified interface that works with both legacy services and new resources
 */
class ResourceService {
  constructor() {
    // Feature flags for gradual migration
    this.useUnifiedResources = process.env.USE_UNIFIED_RESOURCES === 'true';
  }

  /**
   * Get all resources/services with optional filtering
   */
  async getAllResources(filters = {}) {
    const { type, subtype, tags, enabled = true, userId } = filters;
    
    if (this.useUnifiedResources) {
      return await this._getResourcesFromUnifiedTable(filters);
    } else {
      return await this._getResourcesFromServicesTable(filters);
    }
  }

  /**
   * Get a single resource by ID
   */
  async getResourceById(id, userId = null) {
    if (this.useUnifiedResources) {
      const result = await query(`
        SELECT r.*, 
               array_agg(
                 json_build_object('key', rt.key, 'value', rt.value)
               ) FILTER (WHERE rt.id IS NOT NULL) as tags
        FROM resources r
        LEFT JOIN resource_tags rt ON r.id = rt.resource_id
        WHERE r.id = $1
        GROUP BY r.id
      `, [id]);
      
      const resource = result.rows[0];
      if (resource && userId) {
        resource.permissions = await this.getUserResourcePermissions(userId, id);
      }
      return resource;
    } else {
      // Legacy service lookup
      const result = await query('SELECT * FROM services WHERE id = $1', [id]);
      return this._transformServiceToResource(result.rows[0]);
    }
  }

  /**
   * Create a new resource
   */
  async createResource(resourceData, userId = null) {
    const {
      name, type, subtype, host, port, protocol = 'http',
      authType, credentials, config = {}, metadata = {},
      enabled = true, tags = []
    } = resourceData;

    if (this.useUnifiedResources) {
      // Create in resources table
      const result = await query(`
        INSERT INTO resources (
          name, type, subtype, host, port, protocol, auth_type, credentials,
          config, metadata, enabled, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [name, type, subtype, host, port, protocol, authType, 
          JSON.stringify(credentials), JSON.stringify(config), 
          JSON.stringify(metadata), enabled, userId]);

      const resource = result.rows[0];

      // Add tags
      if (tags.length > 0) {
        await this.addResourceTags(resource.id, tags, userId);
      }

      // Auto-sync to services table if it's a service type
      if (type === 'service') {
        await this._syncResourceToService(resource);
      }

      return resource;
    } else {
      // Legacy service creation
      if (type !== 'service') {
        throw new Error('Legacy mode only supports service type resources');
      }
      
      const result = await query(`
        INSERT INTO services (name, type, host, port, api_key, enabled)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [name, subtype, host, port, credentials?.api_key, enabled]);

      return this._transformServiceToResource(result.rows[0]);
    }
  }

  /**
   * Update a resource
   */
  async updateResource(id, updates, userId = null) {
    if (this.useUnifiedResources) {
      const setClause = [];
      const values = [];
      let index = 1;

      const allowedFields = [
        'name', 'host', 'port', 'protocol', 'auth_type', 'credentials',
        'config', 'metadata', 'enabled', 'health_status'
      ];

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          setClause.push(`${key} = $${index}`);
          if (typeof value === 'object' && value !== null) {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
          index++;
        }
      }

      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }

      setClause.push(`updated_at = CURRENT_TIMESTAMP`);
      setClause.push(`updated_by = $${index}`);
      values.push(userId);
      index++;

      values.push(id);

      const result = await query(`
        UPDATE resources 
        SET ${setClause.join(', ')}
        WHERE id = $${index}
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        throw new Error('Resource not found');
      }

      const resource = result.rows[0];

      // Sync to services table if needed
      if (resource.type === 'service' && resource.legacy_service_id) {
        await this._syncResourceToService(resource);
      }

      return resource;
    } else {
      // Legacy service update
      const result = await query(`
        UPDATE services 
        SET name = COALESCE($1, name),
            host = COALESCE($2, host),
            port = COALESCE($3, port),
            api_key = COALESCE($4, api_key),
            enabled = COALESCE($5, enabled),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `, [updates.name, updates.host, updates.port, 
          updates.credentials?.api_key, updates.enabled, id]);

      return this._transformServiceToResource(result.rows[0]);
    }
  }

  /**
   * Delete a resource
   */
  async deleteResource(id, userId = null) {
    if (this.useUnifiedResources) {
      const result = await query('DELETE FROM resources WHERE id = $1 RETURNING *', [id]);
      return result.rows[0];
    } else {
      const result = await query('DELETE FROM services WHERE id = $1 RETURNING *', [id]);
      return this._transformServiceToResource(result.rows[0]);
    }
  }

  /**
   * Get resource statistics
   */
  async getResourceStats(resourceId, timeRange = '24h') {
    if (this.useUnifiedResources) {
      const result = await query(`
        SELECT stats, fetched_at
        FROM resource_stats
        WHERE resource_id = $1
        ORDER BY fetched_at DESC
        LIMIT 100
      `, [resourceId]);
      return result.rows;
    } else {
      const result = await query(`
        SELECT stats, fetched_at
        FROM service_stats
        WHERE service_id = $1
        ORDER BY fetched_at DESC
        LIMIT 100
      `, [resourceId]);
      return result.rows;
    }
  }

  /**
   * Add tags to a resource
   */
  async addResourceTags(resourceId, tags, userId = null) {
    if (!this.useUnifiedResources) {
      console.warn('Tags not supported in legacy mode');
      return [];
    }

    const insertPromises = tags.map(tag => {
      return query(`
        INSERT INTO resource_tags (resource_id, key, value, created_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (resource_id, key, value) DO NOTHING
        RETURNING *
      `, [resourceId, tag.key, tag.value, userId]);
    });

    const results = await Promise.all(insertPromises);
    return results.flatMap(result => result.rows);
  }

  /**
   * Get user permissions for a resource
   */
  async getUserResourcePermissions(userId, resourceId) {
    if (!this.useUnifiedResources) {
      // Legacy permission check - simple role-based
      const userResult = await query('SELECT role FROM users WHERE id = $1', [userId]);
      const user = userResult.rows[0];
      
      if (user?.role === 'admin') {
        return { read: true, write: true, control: true, admin: true };
      } else if (user?.role === 'user') {
        return { read: true, write: true, control: true, admin: false };
      } else {
        return { read: true, write: false, control: false, admin: false };
      }
    }

    // Check explicit resource permissions
    const resourcePermResult = await query(`
      SELECT permissions
      FROM resource_permissions
      WHERE user_id = $1 AND resource_id = $2
    `, [userId, resourceId]);

    if (resourcePermResult.rows.length > 0) {
      return resourcePermResult.rows[0].permissions;
    }

    // Check tag-based permissions
    const tagPermResult = await query(`
      SELECT tp.permissions
      FROM tag_permissions tp
      JOIN resource_tags rt ON rt.key = tp.tag_key AND rt.value = tp.tag_value
      WHERE tp.user_id = $1 AND rt.resource_id = $2
      ORDER BY tp.granted_at DESC
      LIMIT 1
    `, [userId, resourceId]);

    if (tagPermResult.rows.length > 0) {
      return tagPermResult.rows[0].permissions;
    }

    // Default to read-only
    return { read: true, write: false, control: false, admin: false };
  }

  /**
   * Check if user has specific permission on resource
   */
  async checkUserPermission(userId, resourceId, permission) {
    const permissions = await this.getUserResourcePermissions(userId, resourceId);
    return permissions[permission] === true;
  }

  // Private methods

  async _getResourcesFromUnifiedTable(filters) {
    const { type, subtype, tags, enabled, userId } = filters;
    
    let whereClause = ['1=1'];
    let params = [];
    let paramIndex = 1;

    if (type) {
      whereClause.push(`r.type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    if (subtype) {
      whereClause.push(`r.subtype = $${paramIndex}`);
      params.push(subtype);
      paramIndex++;
    }

    if (enabled !== undefined) {
      whereClause.push(`r.enabled = $${paramIndex}`);
      params.push(enabled);
      paramIndex++;
    }

    let tagJoin = '';
    if (tags && Object.keys(tags).length > 0) {
      tagJoin = 'JOIN resource_tags rt ON r.id = rt.resource_id';
      const tagConditions = Object.entries(tags).map(([key, value]) => {
        const condition = `(rt.key = $${paramIndex} AND rt.value = $${paramIndex + 1})`;
        params.push(key, value);
        paramIndex += 2;
        return condition;
      });
      whereClause.push(`(${tagConditions.join(' OR ')})`);
    }

    const result = await query(`
      SELECT DISTINCT r.*, 
             array_agg(
               json_build_object('key', tags.key, 'value', tags.value)
             ) FILTER (WHERE tags.id IS NOT NULL) as tags
      FROM resources r
      LEFT JOIN resource_tags tags ON r.id = tags.resource_id
      ${tagJoin}
      WHERE ${whereClause.join(' AND ')}
      GROUP BY r.id
      ORDER BY r.name
    `, params);

    return result.rows;
  }

  async _getResourcesFromServicesTable(filters) {
    const { enabled = true } = filters;
    
    const result = await query(`
      SELECT * FROM services 
      WHERE enabled = $1 
      ORDER BY name
    `, [enabled]);

    return result.rows.map(service => this._transformServiceToResource(service));
  }

  _transformServiceToResource(service) {
    if (!service) return null;

    return {
      id: service.id,
      name: service.name,
      type: 'service',
      subtype: service.type,
      host: service.host,
      port: service.port,
      protocol: 'http',
      auth_type: service.api_key ? 'api_key' : 'none',
      credentials: service.api_key ? { api_key: service.api_key } : {},
      config: { test_endpoint: service.test_endpoint },
      metadata: {},
      enabled: service.enabled,
      health_status: 'unknown',
      created_at: service.created_at,
      updated_at: service.updated_at,
      tags: [
        { key: 'resource_type', value: 'service' },
        { key: 'category', value: this._getCategoryForServiceType(service.type) }
      ]
    };
  }

  _getCategoryForServiceType(type) {
    const mediaTypes = ['plex', 'radarr', 'sonarr', 'lidarr', 'overseerr', 'tautulli'];
    if (mediaTypes.includes(type)) return 'media';
    if (type === 'homeassistant') return 'automation';
    if (['portainer', 'unraid'].includes(type)) return 'infrastructure';
    if (type === 'prowlarr') return 'indexer';
    return 'general';
  }

  async _syncResourceToService(resource) {
    if (resource.type !== 'service') return;

    const serviceData = {
      name: resource.name,
      type: resource.subtype,
      host: resource.host,
      port: resource.port,
      api_key: resource.credentials?.api_key || null,
      enabled: resource.enabled,
      test_endpoint: resource.config?.test_endpoint || null
    };

    if (resource.legacy_service_id) {
      // Update existing service
      await query(`
        UPDATE services
        SET name = $1, type = $2, host = $3, port = $4, api_key = $5, enabled = $6, test_endpoint = $7
        WHERE id = $8
      `, [serviceData.name, serviceData.type, serviceData.host, serviceData.port,
          serviceData.api_key, serviceData.enabled, serviceData.test_endpoint,
          resource.legacy_service_id]);
    } else {
      // Create new service and link
      const result = await query(`
        INSERT INTO services (name, type, host, port, api_key, enabled, test_endpoint)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [serviceData.name, serviceData.type, serviceData.host, serviceData.port,
          serviceData.api_key, serviceData.enabled, serviceData.test_endpoint]);

      // Update resource with legacy service ID
      await query(
        'UPDATE resources SET legacy_service_id = $1 WHERE id = $2',
        [result.rows[0].id, resource.id]
      );
    }
  }
}

module.exports = new ResourceService();