const express = require('express');
const router = express.Router();
const sonarrController = require('./controller');

// Test Sonarr connection
router.post('/test', sonarrController.testConnection);

// Get stats for a specific Sonarr instance
router.get('/:id/stats', sonarrController.getStats);

module.exports = router;
