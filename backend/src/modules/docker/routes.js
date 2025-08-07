const express = require('express');
const dockerController = require('./controller');
const { authenticateToken, requireRole } = require('../../auth/middleware');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * Docker Management Routes
 * Provides REST API endpoints for managing Docker containers across multiple hosts
 */

// Host management
router.post('/hosts', requireRole('admin'), dockerController.addHost);
router.get('/hosts', dockerController.getHosts);
router.delete('/hosts/:hostName', requireRole('admin'), dockerController.disconnectHost);

// Container management
router.get('/hosts/:hostName/containers', dockerController.getContainers);
router.post('/hosts/:hostName/containers/:containerId/:action', requireRole('user'), dockerController.controlContainer);
router.get('/hosts/:hostName/containers/:containerId/stats', dockerController.getContainerStats);
router.get('/hosts/:hostName/containers/:containerId/logs', dockerController.getContainerLogs);
router.post('/hosts/:hostName/containers/:containerId/exec', requireRole('admin'), dockerController.execInContainer);
router.post('/hosts/:hostName/containers', requireRole('admin'), dockerController.createContainer);

// Image management
router.post('/hosts/:hostName/images/pull', requireRole('admin'), dockerController.pullImage);

// Monitoring
router.post('/hosts/:hostName/monitor/start', requireRole('user'), dockerController.startMonitoring);
router.post('/hosts/:hostName/monitor/stop', requireRole('user'), dockerController.stopMonitoring);

// Real-time updates
router.get('/hosts/:hostName/stream', dockerController.getContainerStream);

module.exports = router;