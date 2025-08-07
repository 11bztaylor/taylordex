const express = require('express');
const router = express.Router();
const sonarrController = require('./controller');
const { authenticateToken, requireRole } = require('../../auth/middleware');

// Apply authentication to all routes
router.use(authenticateToken);

// Test Sonarr connection
router.post('/test', requireRole('user'), sonarrController.testConnection);

// Get stats for a specific Sonarr instance
router.get('/:id/stats', sonarrController.getStats);

module.exports = router;
