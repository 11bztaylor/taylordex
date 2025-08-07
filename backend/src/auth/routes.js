const express = require('express');
const router = express.Router();
const authController = require('./controller');
const { authenticateToken, requireRole, checkFirstRun, optionalAuth } = require('./middleware');

// Public routes (no authentication required)
router.get('/setup/check', authController.checkSetup);
router.post('/setup', authController.setup);
router.post('/login', authController.login);

// Optional registration (if enabled in settings)
router.post('/register', optionalAuth, authController.register);

// Protected routes (authentication required)
router.use(checkFirstRun); // Check if setup is required
router.use(authenticateToken); // Require authentication for all routes below

// User routes
router.get('/me', authController.me);
router.post('/change-password', authController.changePassword);
router.post('/logout', authController.logout);

// Admin routes (admin role required)
router.get('/users', requireRole('admin'), authController.getAllUsers);
router.post('/users', requireRole('admin'), authController.register);
router.put('/users/:id', requireRole('admin'), authController.updateUser);
router.delete('/users/:id', requireRole('admin'), authController.deleteUser);

// Settings routes (admin only)
router.get('/settings', requireRole('admin'), authController.getAuthSettings);
router.put('/settings', requireRole('admin'), authController.updateAuthSettings);

module.exports = router;