const express = require('express');
const router = express.Router();
const radarrController = require('./controller');
const { authenticateToken, requireRole } = require('../../auth/middleware');

// Apply authentication to all routes
router.use(authenticateToken);

// Test Radarr connection
router.post('/test', requireRole('user'), radarrController.testConnection);

// Get stats for a specific Radarr instance
router.get('/:id/stats', radarrController.getStats);

// Get recent activity
router.get('/:id/activity', radarrController.getActivity);

// Get download queue
router.get('/:id/queue', radarrController.getQueue);

module.exports = router;

