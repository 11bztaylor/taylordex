const express = require('express');
const router = express.Router();
const servicesController = require('./controller');
const statusController = require('./statusController');
const resourceHelpers = require('./resourceHelpers');
const { authenticateToken, requireRole } = require('../../auth/middleware');

// Apply authentication to all routes
router.use(authenticateToken);

// Main service routes (all protected)
router.get('/', servicesController.getAllServices);
router.get('/:id', servicesController.getService);
router.get('/:id/stats', servicesController.getServiceStats);
router.post('/', requireRole('user'), servicesController.createService);
router.put('/:id', requireRole('user'), servicesController.updateService);
router.delete('/:id', requireRole('admin'), servicesController.deleteService);
router.post('/test', requireRole('user'), servicesController.testService);

// Enhanced status routes with comprehensive monitoring (read-only)
router.get('/status/comprehensive', statusController.getComprehensiveStatus);
router.get('/status/health', statusController.getServiceHealth);
router.get('/status/activity', statusController.getActivityFeed);
router.get('/status/history/:serviceId', statusController.getServiceHistory);

// Resource management and grouping routes
router.get('/groups', async (req, res) => {
  try {
    const groups = await resourceHelpers.getGroups();
    res.json({ success: true, groups });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/types', async (req, res) => {
  try {
    const types = await resourceHelpers.getResourceTypes();
    res.json({ success: true, types });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/tags', async (req, res) => {
  try {
    const tags = await resourceHelpers.getAllTags();
    res.json({ success: true, tags });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/by-group/:groupName', async (req, res) => {
  try {
    const services = await resourceHelpers.getServicesByGroup(req.params.groupName, req.user);
    res.json({ success: true, services });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/by-type/:type', async (req, res) => {
  try {
    const services = await resourceHelpers.getServicesByType(req.params.type, req.user);
    res.json({ success: true, services });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/permissions/summary', async (req, res) => {
  try {
    const summary = await resourceHelpers.getUserPermissionSummary(req.user);
    res.json({ success: true, permissions: summary });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Tagging operations (admin/write access required)
router.post('/:id/tags', requireRole('user'), async (req, res) => {
  try {
    const { key, value } = req.body;
    const result = await resourceHelpers.addTagToService(req.params.id, key, value);
    
    if (result) {
      res.json({ success: true, message: 'Tag added successfully' });
    } else {
      res.status(400).json({ success: false, error: 'Failed to add tag' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id/tags', requireRole('user'), async (req, res) => {
  try {
    const { key, value } = req.query;
    const result = await resourceHelpers.removeTagFromService(req.params.id, key, value);
    
    if (result) {
      res.json({ success: true, message: 'Tag removed successfully' });
    } else {
      res.status(400).json({ success: false, error: 'Failed to remove tag' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/group', requireRole('user'), async (req, res) => {
  try {
    const { group } = req.body;
    const result = await resourceHelpers.updateServiceGroup(req.params.id, group);
    
    if (result) {
      res.json({ success: true, message: 'Group updated successfully' });
    } else {
      res.status(400).json({ success: false, error: 'Failed to update group' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;