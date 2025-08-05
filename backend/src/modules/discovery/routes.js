const express = require('express');
const router = express.Router();
const discoveryController = require('./controller');

/**
 * Network Discovery Routes
 * All routes are prefixed with /api/discovery
 */

// Start a new network discovery scan
router.post('/scan', discoveryController.startScan);

// Get scan status and results
router.get('/scan/:scanId', discoveryController.getScanStatus);

// Cancel an active scan
router.delete('/scan/:scanId', discoveryController.cancelScan);

// Get all active scans
router.get('/scans', discoveryController.getActiveScans);

// Test network range parsing
router.post('/test-range', discoveryController.testRange);

// Get scan history
router.get('/history', discoveryController.getScanHistory);

// Get discovery statistics
router.get('/stats', discoveryController.getDiscoveryStats);

module.exports = router;