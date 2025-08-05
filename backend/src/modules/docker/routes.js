const express = require('express');
const dockerController = require('./controller');

const router = express.Router();

/**
 * Docker Management Routes
 * Provides REST API endpoints for managing Docker containers across multiple hosts
 */

// Host management
router.post('/hosts', dockerController.addHost);
router.get('/hosts', dockerController.getHosts);
router.delete('/hosts/:hostName', dockerController.disconnectHost);

// Container management
router.get('/hosts/:hostName/containers', dockerController.getContainers);
router.post('/hosts/:hostName/containers/:containerId/:action', dockerController.controlContainer);
router.get('/hosts/:hostName/containers/:containerId/stats', dockerController.getContainerStats);
router.get('/hosts/:hostName/containers/:containerId/logs', dockerController.getContainerLogs);
router.post('/hosts/:hostName/containers/:containerId/exec', dockerController.execInContainer);
router.post('/hosts/:hostName/containers', dockerController.createContainer);

// Image management
router.post('/hosts/:hostName/images/pull', dockerController.pullImage);

// Monitoring
router.post('/hosts/:hostName/monitor/start', dockerController.startMonitoring);
router.post('/hosts/:hostName/monitor/stop', dockerController.stopMonitoring);

// Real-time updates
router.get('/hosts/:hostName/stream', dockerController.getContainerStream);

module.exports = router;