const { query } = require('../../database/connection');

class ResourceHelpers {
  
  // Get all available groups
  async getGroups() {
    try {
      const result = await query(`
        SELECT DISTINCT group_name as name, COUNT(*) as service_count 
        FROM services 
        WHERE group_name IS NOT NULL 
        GROUP BY group_name 
        ORDER BY group_name
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting groups:', error);
      return [];
    }
  }

  // Get all available resource types
  async getResourceTypes() {
    try {
      const result = await query(`
        SELECT DISTINCT type as name, COUNT(*) as count 
        FROM services 
        GROUP BY type 
        ORDER BY type
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting resource types:', error);
      return [];
    }
  }

  // Get all tags for a specific service
  async getServiceTags(serviceId) {
    try {
      const result = await query(`
        SELECT rt.key, rt.value 
        FROM resource_tags rt
        JOIN resources r ON rt.resource_id = r.id
        WHERE r.legacy_service_id = $1
        ORDER BY rt.key, rt.value
      `, [serviceId]);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting service tags:', error);
      return [];
    }
  }

  // Get all available tags across all resources
  async getAllTags() {
    try {
      const result = await query(`
        SELECT key, value, COUNT(*) as usage_count
        FROM resource_tags 
        GROUP BY key, value 
        ORDER BY key, usage_count DESC, value
      `);
      
      // Group by key for easier frontend consumption
      const tagsByKey = {};
      result.rows.forEach(row => {
        if (!tagsByKey[row.key]) {
          tagsByKey[row.key] = [];
        }
        tagsByKey[row.key].push({
          value: row.value,
          count: parseInt(row.usage_count)
        });
      });
      
      return tagsByKey;
    } catch (error) {
      console.error('Error getting all tags:', error);
      return {};
    }
  }

  // Get services by group
  async getServicesByGroup(groupName, user) {
    try {
      const result = await query(`
        SELECT id, name, type, host, port, enabled, metadata, group_name
        FROM services 
        WHERE group_name = $1
        ORDER BY name
      `, [groupName]);
      
      // Apply RBAC filtering if user is not admin
      if (user?.role !== 'admin') {
        const authService = require('../../auth/authService');
        const accessibleServices = [];
        
        for (const service of result.rows) {
          const hasAccess = await authService.hasPermission(user, 'read', service.type);
          if (hasAccess) {
            accessibleServices.push(service);
          }
        }
        
        return accessibleServices;
      }
      
      return result.rows;
    } catch (error) {
      console.error('Error getting services by group:', error);
      return [];
    }
  }

  // Get services by type
  async getServicesByType(type, user) {
    try {
      const result = await query(`
        SELECT id, name, type, host, port, enabled, metadata, group_name
        FROM services 
        WHERE type = $1
        ORDER BY name
      `, [type]);
      
      // Apply RBAC filtering if user is not admin
      if (user?.role !== 'admin') {
        const authService = require('../../auth/authService');
        const hasAccess = await authService.hasPermission(user, 'read', type);
        
        if (!hasAccess) {
          return [];
        }
      }
      
      return result.rows;
    } catch (error) {
      console.error('Error getting services by type:', error);
      return [];
    }
  }

  // Add tag to a service
  async addTagToService(serviceId, key, value) {
    try {
      // Find the corresponding resource
      const resourceResult = await query(`
        SELECT id FROM resources WHERE legacy_service_id = $1
      `, [serviceId]);
      
      if (resourceResult.rows.length === 0) {
        throw new Error('Resource not found for service');
      }
      
      const resourceId = resourceResult.rows[0].id;
      
      // Add the tag (ignore if already exists)
      await query(`
        INSERT INTO resource_tags (resource_id, key, value) 
        VALUES ($1, $2, $3) 
        ON CONFLICT (resource_id, key, value) DO NOTHING
      `, [resourceId, key, value]);
      
      return true;
    } catch (error) {
      console.error('Error adding tag to service:', error);
      return false;
    }
  }

  // Remove tag from a service
  async removeTagFromService(serviceId, key, value) {
    try {
      // Find the corresponding resource
      const resourceResult = await query(`
        SELECT id FROM resources WHERE legacy_service_id = $1
      `, [serviceId]);
      
      if (resourceResult.rows.length === 0) {
        throw new Error('Resource not found for service');
      }
      
      const resourceId = resourceResult.rows[0].id;
      
      // Remove the tag
      await query(`
        DELETE FROM resource_tags 
        WHERE resource_id = $1 AND key = $2 AND value = $3
      `, [resourceId, key, value]);
      
      return true;
    } catch (error) {
      console.error('Error removing tag from service:', error);
      return false;
    }
  }

  // Update service group
  async updateServiceGroup(serviceId, newGroup) {
    try {
      await query(`
        UPDATE services 
        SET group_name = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [newGroup, serviceId]);
      
      // Also update the corresponding resource tag
      const resourceResult = await query(`
        SELECT id FROM resources WHERE legacy_service_id = $1
      `, [serviceId]);
      
      if (resourceResult.rows.length > 0) {
        const resourceId = resourceResult.rows[0].id;
        
        // Remove old group tag and add new one
        await query(`
          DELETE FROM resource_tags 
          WHERE resource_id = $1 AND key = 'group'
        `, [resourceId]);
        
        await query(`
          INSERT INTO resource_tags (resource_id, key, value) 
          VALUES ($1, 'group', $2)
        `, [resourceId, newGroup]);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating service group:', error);
      return false;
    }
  }

  // Get permission summary for user across all resource types
  async getUserPermissionSummary(user) {
    try {
      if (user.role === 'admin') {
        // Admin has access to everything
        const groups = await this.getGroups();
        const types = await this.getResourceTypes();
        
        return {
          admin: true,
          groups: groups.map(g => ({ name: g.name, permissions: ['read', 'write', 'control', 'admin'] })),
          types: types.map(t => ({ name: t.name, permissions: ['read', 'write', 'control', 'admin'] }))
        };
      }
      
      // For non-admin users, check their specific permissions
      const authService = require('../../auth/authService');
      const groups = await this.getGroups();
      const types = await this.getResourceTypes();
      
      const groupPermissions = [];
      const typePermissions = [];
      
      for (const group of groups) {
        const permissions = [];
        const groupKey = group.name.toLowerCase().replace(/\s+/g, '_');
        
        for (const perm of ['read', 'write', 'control', 'admin']) {
          const hasPermission = await authService.hasPermission(user, perm, groupKey);
          if (hasPermission) {
            permissions.push(perm);
          }
        }
        
        if (permissions.length > 0) {
          groupPermissions.push({ name: group.name, permissions });
        }
      }
      
      for (const type of types) {
        const permissions = [];
        
        for (const perm of ['read', 'write', 'control', 'admin']) {
          const hasPermission = await authService.hasPermission(user, perm, type.name);
          if (hasPermission) {
            permissions.push(perm);
          }
        }
        
        if (permissions.length > 0) {
          typePermissions.push({ name: type.name, permissions });
        }
      }
      
      return {
        admin: false,
        groups: groupPermissions,
        types: typePermissions
      };
    } catch (error) {
      console.error('Error getting user permission summary:', error);
      return { admin: false, groups: [], types: [] };
    }
  }
}

module.exports = new ResourceHelpers();