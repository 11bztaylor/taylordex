const express = require('express');
const router = express.Router();
const radarrController = require('./controller');

// Test Radarr connection
router.post('/test', radarrController.testConnection);

// Get stats for a specific Radarr instance
router.get('/:id/stats', radarrController.getStats);

// Get recent activity
router.get('/:id/activity', radarrController.getActivity);

// Get download queue
router.get('/:id/queue', radarrController.getQueue);

module.exports = router;

// Import test routes
const testRoutes = require("./testEndpoints");

// Mount test routes
router.use("/", testRoutes);

