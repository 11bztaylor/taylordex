const express = require('express');
const router = express.Router();
const UserController = require('./controller');
const { authenticateToken, requireRole } = require('../../auth/middleware');

// All user management routes require authentication
router.use(authenticateToken);

/**
 * User Management Routes
 * Only admins can manage other users
 */

// GET /api/users - Get all users (admin only)
router.get('/', requireRole('admin'), UserController.getAllUsers);

// GET /api/users/permission-templates - Get available permission templates (admin only)
router.get('/permission-templates', requireRole('admin'), UserController.getPermissionTemplates);

// GET /api/users/:id - Get specific user (admin only)
router.get('/:id', requireRole('admin'), UserController.getUserById);

// POST /api/users - Create new user (admin only)
router.post('/', requireRole('admin'), UserController.createUser);

// PUT /api/users/:id - Update user (admin only)
router.put('/:id', requireRole('admin'), UserController.updateUser);

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', requireRole('admin'), UserController.deleteUser);

// GET /api/users/:id/permissions - Get user permissions (admin only)
router.get('/:id/permissions', requireRole('admin'), UserController.getUserPermissions);

// POST /api/users/:id/permissions/tags - Grant tag-based permissions (admin only)
router.post('/:id/permissions/tags', requireRole('admin'), UserController.grantTagPermissions);

// POST /api/users/:id/permissions/resources - Grant resource-specific permissions (admin only)
router.post('/:id/permissions/resources', requireRole('admin'), UserController.grantResourcePermissions);

// POST /api/users/:id/apply-template - Apply permission template (admin only)
router.post('/:id/apply-template', requireRole('admin'), UserController.applyPermissionTemplate);

// DELETE /api/users/:id/permissions - Remove permissions (admin only)
router.delete('/:id/permissions', requireRole('admin'), UserController.removePermissions);

module.exports = router;