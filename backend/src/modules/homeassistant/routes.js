const express = require('express');
const homeAssistantController = require('./controller');
const { authenticateToken, requireRole } = require('../../auth/middleware');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Test connection
router.post('/test', requireRole('user'), homeAssistantController.testConnection);

// Get basic stats
router.get('/:id/stats', homeAssistantController.getStats);

// Get enhanced stats with real-time data
router.get('/:id/enhanced-stats', homeAssistantController.getEnhancedStats);

// WebSocket connection management
router.post('/:id/connect', requireRole('user'), homeAssistantController.connectWebSocket);
router.get('/:id/connection-status', homeAssistantController.getConnectionStatus);

// Service calls
router.post('/:id/call-service', requireRole('user'), homeAssistantController.callService);

// Light controls
router.post('/:id/lights/control', requireRole('user'), homeAssistantController.controlLight);

// Automation controls
router.post('/:id/automations/run', requireRole('user'), homeAssistantController.runAutomation);

// Script controls
router.post('/:id/scripts/run', requireRole('user'), homeAssistantController.runScript);

// System controls
router.post('/:id/system/control', requireRole('admin'), homeAssistantController.systemControl);

// Shell command execution
router.post('/:id/execute-command', requireRole('admin'), homeAssistantController.executeCommand);

// Entity state queries
router.get('/:id/entities/states', homeAssistantController.getEntityStates);

module.exports = router;