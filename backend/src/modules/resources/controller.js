const ResourceService = require('../../utils/ResourceService');
const logger = require('../../utils/logger');

class ResourceController {
  
  /**
   * Get all resources with filtering
   * GET /api/resources?type=service&category=media&enabled=true
   */
  async getAllResources(req, res) {
    try {
      const { type, subtype, enabled, tags } = req.query;
      const userId = req.user?.id;

      // Parse tags from query string (format: tags[category]=media&tags[environment]=prod)
      const parsedTags = {};
      if (tags) {
        if (typeof tags === 'string') {
          // Single tag: tags=category:media
          const [key, value] = tags.split(':');
          if (key && value) parsedTags[key] = value;
        } else if (typeof tags === 'object') {
          // Multiple tags: tags[category]=media&tags[environment]=prod
          Object.assign(parsedTags, tags);
        }
      }

      const filters = {
        type,
        subtype,
        enabled: enabled === 'true' ? true : enabled === 'false' ? false : undefined,
        tags: Object.keys(parsedTags).length > 0 ? parsedTags : undefined,
        userId
      };

      const resources = await ResourceService.getAllResources(filters);

      // Filter resources by user permissions
      const accessibleResources = [];
      for (const resource of resources) {
        const canRead = await ResourceService.checkUserPermission(userId, resource.id, 'read');
        if (canRead) {
          resource.permissions = await ResourceService.getUserResourcePermissions(userId, resource.id);
          accessibleResources.push(resource);
        }
      }

      res.json({
        success: true,
        data: accessibleResources,
        count: accessibleResources.length,
        filters: filters
      });
    } catch (error) {
      logger.error('Error fetching resources', { error: error.message, filters: req.query }, 'resource-management');
      res.status(500).json({
        success: false,
        error: 'Failed to fetch resources',
        details: error.message
      });
    }
  }

  /**
   * Get a single resource by ID
   * GET /api/resources/:id
   */
  async getResourceById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const resource = await ResourceService.getResourceById(id, userId);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found'
        });
      }

      // Check permissions
      const canRead = await ResourceService.checkUserPermission(userId, id, 'read');
      if (!canRead) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access this resource'
        });
      }

      res.json({
        success: true,
        data: resource
      });
    } catch (error) {
      logger.error('Error fetching resource by ID', { error: error.message, resourceId: req.params.id }, 'resource-management');
      res.status(500).json({
        success: false,
        error: 'Failed to fetch resource',
        details: error.message
      });
    }
  }

  /**
   * Create a new resource
   * POST /api/resources
   */
  async createResource(req, res) {
    try {
      const userId = req.user?.id;
      const resourceData = req.body;

      // Validate required fields
      const requiredFields = ['name', 'type'];
      for (const field of requiredFields) {
        if (!resourceData[field]) {
          return res.status(400).json({
            success: false,
            error: `Missing required field: ${field}`
          });
        }
      }

      // Check if user has permission to create resources of this type
      // For now, only admins can create resources
      if (req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Only administrators can create resources'
        });
      }

      const resource = await ResourceService.createResource(resourceData, userId);

      res.status(201).json({
        success: true,
        data: resource,
        message: 'Resource created successfully'
      });
    } catch (error) {
      logger.error('Error creating resource', { error: error.message, resourceData: req.body }, 'resource-management');
      res.status(500).json({
        success: false,
        error: 'Failed to create resource',
        details: error.message
      });
    }
  }

  /**
   * Update a resource
   * PUT /api/resources/:id
   */
  async updateResource(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const updates = req.body;

      // Check if resource exists and user has permission
      const canWrite = await ResourceService.checkUserPermission(userId, id, 'write');
      if (!canWrite) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to modify this resource'
        });
      }

      const resource = await ResourceService.updateResource(id, updates, userId);

      res.json({
        success: true,
        data: resource,
        message: 'Resource updated successfully'
      });
    } catch (error) {
      logger.error('Error updating resource', { error: error.message, resourceId: req.params.id }, 'resource-management');
      res.status(500).json({
        success: false,
        error: 'Failed to update resource',
        details: error.message
      });
    }
  }

  /**
   * Delete a resource
   * DELETE /api/resources/:id
   */
  async deleteResource(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      // Check if user has admin permission on this resource
      const canAdmin = await ResourceService.checkUserPermission(userId, id, 'admin');
      if (!canAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to delete this resource'
        });
      }

      const resource = await ResourceService.deleteResource(id, userId);

      res.json({
        success: true,
        data: resource,
        message: 'Resource deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting resource', { error: error.message, resourceId: req.params.id }, 'resource-management');
      res.status(500).json({
        success: false,
        error: 'Failed to delete resource',
        details: error.message
      });
    }
  }

  /**
   * Get resource statistics
   * GET /api/resources/:id/stats
   */
  async getResourceStats(req, res) {
    try {
      const { id } = req.params;
      const { timeRange = '24h' } = req.query;
      const userId = req.user?.id;

      // Check permissions
      const canRead = await ResourceService.checkUserPermission(userId, id, 'read');
      if (!canRead) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to access resource statistics'
        });
      }

      const stats = await ResourceService.getResourceStats(id, timeRange);

      res.json({
        success: true,
        data: stats,
        resource_id: id,
        time_range: timeRange
      });
    } catch (error) {
      logger.error('Error fetching resource stats', { error: error.message, resourceId: req.params.id, timeRange: req.query.timeRange }, 'resource-management');
      res.status(500).json({
        success: false,
        error: 'Failed to fetch resource statistics',
        details: error.message
      });
    }
  }

  /**
   * Add tags to a resource
   * POST /api/resources/:id/tags
   */
  async addResourceTags(req, res) {
    try {
      const { id } = req.params;
      const { tags } = req.body;
      const userId = req.user?.id;

      if (!Array.isArray(tags) || tags.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Tags must be a non-empty array'
        });
      }

      // Check permissions
      const canWrite = await ResourceService.checkUserPermission(userId, id, 'write');
      if (!canWrite) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to modify resource tags'
        });
      }

      const addedTags = await ResourceService.addResourceTags(id, tags, userId);

      res.json({
        success: true,
        data: addedTags,
        message: 'Tags added successfully'
      });
    } catch (error) {
      logger.error('Error adding resource tags', { error: error.message, resourceId: req.params.id }, 'resource-management');
      res.status(500).json({
        success: false,
        error: 'Failed to add resource tags',
        details: error.message
      });
    }
  }

  /**
   * Get resource types and their counts
   * GET /api/resources/types
   */
  async getResourceTypes(req, res) {
    try {
      const userId = req.user?.id;

      // Get all accessible resources and count by type
      const resources = await ResourceService.getAllResources({ userId });
      
      const accessibleResources = [];
      for (const resource of resources) {
        const canRead = await ResourceService.checkUserPermission(userId, resource.id, 'read');
        if (canRead) {
          accessibleResources.push(resource);
        }
      }

      // Count by type and subtype
      const typeCounts = {};
      const subtypeCounts = {};
      
      accessibleResources.forEach(resource => {
        typeCounts[resource.type] = (typeCounts[resource.type] || 0) + 1;
        if (resource.subtype) {
          const key = `${resource.type}:${resource.subtype}`;
          subtypeCounts[key] = (subtypeCounts[key] || 0) + 1;
        }
      });

      res.json({
        success: true,
        data: {
          types: typeCounts,
          subtypes: subtypeCounts,
          total: accessibleResources.length
        }
      });
    } catch (error) {
      logger.error('Error fetching resource types', { error: error.message }, 'resource-management');
      res.status(500).json({
        success: false,
        error: 'Failed to fetch resource types',
        details: error.message
      });
    }
  }

  /**
   * Get available tags across all accessible resources
   * GET /api/resources/tags
   */
  async getAvailableTags(req, res) {
    try {
      const userId = req.user?.id;

      // This is only available in unified resources mode
      if (!process.env.USE_UNIFIED_RESOURCES) {
        return res.json({
          success: true,
          data: {
            tags: {},
            message: 'Tags are only available in unified resources mode'
          }
        });
      }

      const resources = await ResourceService.getAllResources({ userId });
      
      // Collect all tags from accessible resources
      const tagMap = {};
      for (const resource of resources) {
        const canRead = await ResourceService.checkUserPermission(userId, resource.id, 'read');
        if (canRead && resource.tags) {
          resource.tags.forEach(tag => {
            if (!tagMap[tag.key]) {
              tagMap[tag.key] = new Set();
            }
            tagMap[tag.key].add(tag.value);
          });
        }
      }

      // Convert sets to arrays
      const tags = {};
      Object.keys(tagMap).forEach(key => {
        tags[key] = Array.from(tagMap[key]).sort();
      });

      res.json({
        success: true,
        data: { tags }
      });
    } catch (error) {
      logger.error('Error fetching available tags', { error: error.message }, 'resource-management');
      res.status(500).json({
        success: false,
        error: 'Failed to fetch available tags',
        details: error.message
      });
    }
  }
}

module.exports = new ResourceController();