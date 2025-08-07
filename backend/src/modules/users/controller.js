const authService = require('../../auth/authService');
const ResourceService = require('../../utils/ResourceService');
const { query } = require('../../database/connection');
const logger = require('../../utils/logger');

// Standalone helper function for granting default permissions
async function grantDefaultPermissions(userId, role) {
  logger.debug('granting default permissions', { userId, role }, 'user-management');
  
  try {
    let permissions;
    
    logger.debug('determining permissions for role', { role }, 'user-management');
    switch (role) {
      case 'admin':
        permissions = { read: true, write: true, control: true, admin: true };
        break;
      case 'user':
        permissions = { read: true, write: true, control: true, admin: false };
        break;
      case 'readonly':
        permissions = { read: true, write: false, control: false, admin: false };
        break;
      default:
        permissions = { read: true, write: false, control: false, admin: false };
    }
    
    logger.debug('permissions to grant', { permissions }, 'user-management');

    // Grant access to all service resources by default
    logger.debug('inserting default permissions into database', { userId }, 'user-management');
    const result = await query(`
      INSERT INTO tag_permissions (user_id, tag_key, tag_value, permissions, granted_by)
      VALUES ($1, 'resource_type', 'service', $2, $3)
      ON CONFLICT (user_id, tag_key, tag_value) DO NOTHING
    `, [userId, JSON.stringify(permissions), 1]); // System granted
    
    logger.info('default permissions granted successfully', { userId, role }, 'user-management');
    
  } catch (error) {
    logger.error('error granting default permissions', {
      error: error.message,
      code: error.code,
      detail: error.detail,
      userId,
      role
    }, 'user-management');
  }
}

class UserController {
  
  /**
   * Get all users
   * GET /api/users
   */
  async getAllUsers(req, res) {
    try {
      const users = await authService.getAllUsers();
      
      // Remove sensitive data
      const safeUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        last_login: user.last_login,
        sso_provider: user.sso_provider
      }));

      res.json({
        success: true,
        data: safeUsers,
        count: safeUsers.length
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch users',
        details: error.message
      });
    }
  }

  /**
   * Get a specific user
   * GET /api/users/:id
   */
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await authService.findUserById(id);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Get user's permissions summary
      const permissions = await this.getUserPermissionsSummary(id);
      
      const safeUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
        last_login: user.last_login,
        sso_provider: user.sso_provider,
        permissions: permissions
      };

      res.json({
        success: true,
        data: safeUser
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user',
        details: error.message
      });
    }
  }

  /**
   * Create a new user
   * POST /api/users
   */
  async createUser(req, res) {
    logger.debug('User creation request started', {
      requestBody: { ...req.body, password: req.body.password ? '[REDACTED]' : null },
      creatingUser: req.user?.username || 'unknown'
    }, 'user-management');
    
    try {
      const { username, email, password, role = 'user' } = req.body;
      logger.debug('User creation request parsed', { username, emailProvided: !!email, role }, 'user-management');

      // Validate required fields
      logger.debug('Validating required fields for user creation', {}, 'user-management');
      if (!username) {
        logger.warn('User creation validation failed: Username is required', {}, 'user-management');
        return res.status(400).json({
          success: false,
          error: 'Username is required'
        });
      }
      logger.debug('Username validation passed', { username }, 'user-management');

      // Email is optional now
      // if (!email) {
      //   return res.status(400).json({
      //     success: false,
      //     error: 'Email is required'
      //   });
      // }

      if (!password) {
        logger.warn('User creation validation failed: Password is required', { username }, 'user-management');
        return res.status(400).json({
          success: false,
          error: 'Password is required'
        });
      }
      logger.debug('Password validation passed', { username }, 'user-management');

      // Validate role
      const validRoles = ['admin', 'user', 'readonly'];
      logger.debug('Validating role', { role, validRoles }, 'user-management');
      if (!validRoles.includes(role)) {
        logger.warn('User creation validation failed: Invalid role', { role, validRoles }, 'user-management');
        return res.status(400).json({
          success: false,
          error: 'Invalid role. Must be one of: ' + validRoles.join(', ')
        });
      }
      logger.debug('Role validation passed', { role }, 'user-management');

      logger.debug('Creating user via authService', { username, role }, 'user-management');
      const newUser = await authService.createUser({
        username,
        email,
        password,
        role
      });
      logger.info('User created successfully', { id: newUser.id, username: newUser.username, role: newUser.role }, 'user-management');

      // Grant default permissions based on role
      logger.debug('Granting default permissions', { userId: newUser.id, role }, 'user-management');
      await grantDefaultPermissions(newUser.id, role);
      logger.debug('Default permissions granted successfully', { userId: newUser.id }, 'user-management');

      logger.debug('Sending user creation success response', { userId: newUser.id }, 'user-management');
      const responseData = {
        success: true,
        data: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          created_at: newUser.created_at
        },
        message: 'User created successfully'
      };
      logger.info('User creation completed successfully', { userId: newUser.id, username: newUser.username }, 'user-management');
      res.status(201).json(responseData);
    } catch (error) {
      const { username, email, role } = req.body;
      logger.error('User creation error', {
        error: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack,
        userData: { username, emailProvided: !!email, role }
      }, 'user-management');
      
      let errorResponse = {
        success: false,
        error: 'Failed to create user',
        details: error.message,
        code: 'USER_CREATION_FAILED'
      };

      if (error.message.includes('duplicate key')) {
        errorResponse.error = 'Username already exists';
        errorResponse.code = 'DUPLICATE_USERNAME';
        errorResponse.details = 'A user with this username already exists';
        return res.status(409).json(errorResponse);
      }

      if (error.message.includes('users_email_key')) {
        errorResponse.error = 'Email already exists';
        errorResponse.code = 'DUPLICATE_EMAIL';
        errorResponse.details = 'A user with this email already exists';
        return res.status(409).json(errorResponse);
      }

      if (error.message.includes('password')) {
        errorResponse.error = 'Password validation failed';
        errorResponse.code = 'INVALID_PASSWORD';
        errorResponse.details = error.message;
        return res.status(400).json(errorResponse);
      }

      if (error.message.includes('database') || error.code) {
        errorResponse.error = 'Database error';
        errorResponse.code = 'DATABASE_ERROR';
        errorResponse.details = `Database operation failed: ${error.message}`;
        logger.error('Database error during user creation', { code: error.code, detail: error.detail }, 'user-management');
      }
      
      res.status(500).json(errorResponse);
    }
  }

  /**
   * Update a user
   * PUT /api/users/:id
   */
  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Don't allow updating passwords through this endpoint
      delete updates.password;
      delete updates.password_hash;

      const updatedUser = await authService.updateUser(id, updates);

      res.json({
        success: true,
        data: updatedUser,
        message: 'User updated successfully'
      });
    } catch (error) {
      logger.error('Error updating user', { error: error.message, userId: req.params.id }, 'user-management');
      res.status(500).json({
        success: false,
        error: 'Failed to update user',
        details: error.message
      });
    }
  }

  /**
   * Delete a user
   * DELETE /api/users/:id
   */
  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      
      // Don't allow deleting yourself
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete your own account'
        });
      }

      const deletedUser = await authService.deleteUser(id);

      res.json({
        success: true,
        data: deletedUser,
        message: 'User deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting user', { error: error.message, userId: req.params.id }, 'user-management');
      res.status(500).json({
        success: false,
        error: 'Failed to delete user',
        details: error.message
      });
    }
  }

  /**
   * Grant tag-based permissions to a user
   * POST /api/users/:id/permissions/tags
   */
  async grantTagPermissions(req, res) {
    try {
      const { id } = req.params;
      const { tagKey, tagValue, permissions } = req.body;

      if (!tagKey || !tagValue || !permissions) {
        return res.status(400).json({
          success: false,
          error: 'tagKey, tagValue, and permissions are required'
        });
      }

      await query(`
        INSERT INTO tag_permissions (user_id, tag_key, tag_value, permissions, granted_by)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, tag_key, tag_value) 
        DO UPDATE SET 
          permissions = EXCLUDED.permissions,
          granted_by = EXCLUDED.granted_by,
          granted_at = CURRENT_TIMESTAMP
      `, [id, tagKey, tagValue, JSON.stringify(permissions), req.user.id]);

      res.json({
        success: true,
        message: 'Tag permissions granted successfully'
      });
    } catch (error) {
      logger.error('Error granting tag permissions', { error: error.message, userId: req.params.id }, 'user-management');
      res.status(500).json({
        success: false,
        error: 'Failed to grant tag permissions',
        details: error.message
      });
    }
  }

  /**
   * Grant resource-specific permissions
   * POST /api/users/:id/permissions/resources
   */
  async grantResourcePermissions(req, res) {
    try {
      const { id } = req.params;
      const { resourceId, permissions } = req.body;

      if (!resourceId || !permissions) {
        return res.status(400).json({
          success: false,
          error: 'resourceId and permissions are required'
        });
      }

      await query(`
        INSERT INTO resource_permissions (user_id, resource_id, permissions, granted_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, resource_id)
        DO UPDATE SET 
          permissions = EXCLUDED.permissions,
          granted_by = EXCLUDED.granted_by,
          granted_at = CURRENT_TIMESTAMP
      `, [id, resourceId, JSON.stringify(permissions), req.user.id]);

      res.json({
        success: true,
        message: 'Resource permissions granted successfully'
      });
    } catch (error) {
      logger.error('Error granting resource permissions', { error: error.message, userId: req.params.id }, 'user-management');
      res.status(500).json({
        success: false,
        error: 'Failed to grant resource permissions',
        details: error.message
      });
    }
  }

  /**
   * Get user's permissions
   * GET /api/users/:id/permissions
   */
  async getUserPermissions(req, res) {
    try {
      const { id } = req.params;
      const permissions = await this.getUserPermissionsSummary(id);

      res.json({
        success: true,
        data: permissions
      });
    } catch (error) {
      logger.error('Error fetching user permissions', { error: error.message, userId: req.params.id }, 'user-management');
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user permissions',
        details: error.message
      });
    }
  }

  /**
   * Remove user permissions
   * DELETE /api/users/:id/permissions
   */
  async removePermissions(req, res) {
    try {
      const { id } = req.params;
      const { type, tagKey, tagValue, resourceId } = req.query;

      if (type === 'tag' && tagKey && tagValue) {
        await query(`
          DELETE FROM tag_permissions 
          WHERE user_id = $1 AND tag_key = $2 AND tag_value = $3
        `, [id, tagKey, tagValue]);
      } else if (type === 'resource' && resourceId) {
        await query(`
          DELETE FROM resource_permissions 
          WHERE user_id = $1 AND resource_id = $2
        `, [id, resourceId]);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid permission removal request'
        });
      }

      res.json({
        success: true,
        message: 'Permissions removed successfully'
      });
    } catch (error) {
      logger.error('Error removing permissions', { error: error.message, userId: req.params.id }, 'user-management');
      res.status(500).json({
        success: false,
        error: 'Failed to remove permissions',
        details: error.message
      });
    }
  }

  /**
   * Get available permission templates
   * GET /api/users/permission-templates
   */
  async getPermissionTemplates(req, res) {
    try {
      const result = await query(`
        SELECT * FROM role_templates 
        ORDER BY is_system DESC, name ASC
      `);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      logger.error('Error fetching permission templates', { error: error.message }, 'user-management');
      res.status(500).json({
        success: false,
        error: 'Failed to fetch permission templates',
        details: error.message
      });
    }
  }

  /**
   * Apply permission template to user
   * POST /api/users/:id/apply-template
   */
  async applyPermissionTemplate(req, res) {
    try {
      const { id } = req.params;
      const { templateId, resourceType } = req.body;

      const template = await query('SELECT * FROM role_templates WHERE id = $1', [templateId]);
      if (template.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Permission template not found'
        });
      }

      const templateData = template.rows[0];
      
      // Apply template permissions based on resource type
      if (templateData.resource_type) {
        // Template is for specific resource type
        await query(`
          INSERT INTO tag_permissions (user_id, tag_key, tag_value, permissions, granted_by)
          VALUES ($1, 'resource_type', $2, $3, $4)
          ON CONFLICT (user_id, tag_key, tag_value)
          DO UPDATE SET 
            permissions = EXCLUDED.permissions,
            granted_by = EXCLUDED.granted_by,
            granted_at = CURRENT_TIMESTAMP
        `, [id, templateData.resource_type, JSON.stringify(templateData.permissions), req.user.id]);
      } else if (resourceType) {
        // Apply template to specified resource type
        await query(`
          INSERT INTO tag_permissions (user_id, tag_key, tag_value, permissions, granted_by)
          VALUES ($1, 'resource_type', $2, $3, $4)
          ON CONFLICT (user_id, tag_key, tag_value)
          DO UPDATE SET 
            permissions = EXCLUDED.permissions,
            granted_by = EXCLUDED.granted_by,
            granted_at = CURRENT_TIMESTAMP
        `, [id, resourceType, JSON.stringify(templateData.permissions), req.user.id]);
      }

      res.json({
        success: true,
        message: 'Permission template applied successfully'
      });
    } catch (error) {
      logger.error('Error applying permission template', { error: error.message, userId: req.params.id }, 'user-management');
      res.status(500).json({
        success: false,
        error: 'Failed to apply permission template',
        details: error.message
      });
    }
  }

  // Helper methods

  async getUserPermissionsSummary(userId) {
    try {
      // Get tag-based permissions
      const tagPermsResult = await query(`
        SELECT tag_key, tag_value, permissions, granted_at, granted_by
        FROM tag_permissions 
        WHERE user_id = $1
        ORDER BY tag_key, tag_value
      `, [userId]);

      // Get resource-specific permissions
      const resourcePermsResult = await query(`
        SELECT rp.resource_id, rp.permissions, rp.granted_at, rp.granted_by,
               r.name as resource_name, r.type as resource_type
        FROM resource_permissions rp
        JOIN resources r ON rp.resource_id = r.id
        WHERE rp.user_id = $1
        ORDER BY r.name
      `, [userId]);

      return {
        tagPermissions: tagPermsResult.rows,
        resourcePermissions: resourcePermsResult.rows,
        summary: {
          totalTagPermissions: tagPermsResult.rows.length,
          totalResourcePermissions: resourcePermsResult.rows.length
        }
      };
    } catch (error) {
      logger.error('Error getting user permissions summary', { error: error.message, userId }, 'user-management');
      return { tagPermissions: [], resourcePermissions: [], summary: { totalTagPermissions: 0, totalResourcePermissions: 0 } };
    }
  }

  async grantDefaultPermissions(userId, role) {
    try {
      let permissions;
      
      switch (role) {
        case 'admin':
          permissions = { read: true, write: true, control: true, admin: true };
          break;
        case 'user':
          permissions = { read: true, write: true, control: true, admin: false };
          break;
        case 'readonly':
          permissions = { read: true, write: false, control: false, admin: false };
          break;
        default:
          permissions = { read: true, write: false, control: false, admin: false };
      }

      // Grant access to all service resources by default
      await query(`
        INSERT INTO tag_permissions (user_id, tag_key, tag_value, permissions, granted_by)
        VALUES ($1, 'resource_type', 'service', $2, $3)
        ON CONFLICT (user_id, tag_key, tag_value) DO NOTHING
      `, [userId, JSON.stringify(permissions), 1]); // System granted
      
    } catch (error) {
      logger.error('Error granting default permissions in controller', { error: error.message, userId, role }, 'user-management');
    }
  }
}

module.exports = new UserController();