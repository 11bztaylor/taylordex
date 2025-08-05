const express = require('express');
const router = express.Router();
const logController = require('./controller');

/**
 * Log Collection Routes
 * All routes are prefixed with /api/logs
 */

// Start collecting logs from a specific service
router.post('/start/:serviceId', logController.startCollection);

// Stop collecting logs from a specific service  
router.delete('/stop/:serviceId', logController.stopCollection);

// Get logs from a specific service with optional filtering
router.get('/service/:serviceId', logController.getServiceLogs);

// Get logs from all services with optional filtering
router.get('/all', logController.getAllLogs);

// Get available facilities for a service
router.get('/facilities/:serviceId', logController.getServiceFacilities);

// Get log collection status and statistics
router.get('/status', logController.getStatus);

// Get live log stream (Server-Sent Events)
router.get('/stream', logController.getLogStream);

// Test log collection for a service
router.post('/test', logController.testCollection);

module.exports = router;