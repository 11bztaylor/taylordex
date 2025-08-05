const express = require('express');
const router = express.Router();
const servicesController = require('./controller');
const statusController = require('./statusController');

// Main service routes
router.get('/', servicesController.getAllServices);
router.get('/:id', servicesController.getService);
router.post('/', servicesController.createService);
router.put('/:id', servicesController.updateService);
router.delete('/:id', servicesController.deleteService);
router.post('/test', servicesController.testService);

// Enhanced status routes with comprehensive monitoring
router.get('/status/comprehensive', statusController.getComprehensiveStatus);
router.get('/status/health', statusController.getServiceHealth);
router.get('/status/activity', statusController.getActivityFeed);
router.get('/status/history/:serviceId', statusController.getServiceHistory);

module.exports = router;