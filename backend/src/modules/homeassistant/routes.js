const express = require('express');
const homeAssistantController = require('./controller');

const router = express.Router();

// Test connection
router.post('/test', homeAssistantController.testConnection);

// Get basic stats
router.get('/:id/stats', homeAssistantController.getStats);

// Get enhanced stats with real-time data
router.get('/:id/enhanced-stats', homeAssistantController.getEnhancedStats);

// WebSocket connection management
router.post('/:id/connect', homeAssistantController.connectWebSocket);
router.get('/:id/connection-status', homeAssistantController.getConnectionStatus);

// Service calls
router.post('/:id/call-service', homeAssistantController.callService);

// Light controls
router.post('/:id/lights/control', homeAssistantController.controlLight);

// Automation controls
router.post('/:id/automations/run', homeAssistantController.runAutomation);

// Script controls
router.post('/:id/scripts/run', homeAssistantController.runScript);

// System controls
router.post('/:id/system/control', homeAssistantController.systemControl);

// Shell command execution
router.post('/:id/execute-command', homeAssistantController.executeCommand);

// Entity state queries
router.get('/:id/entities/states', homeAssistantController.getEntityStates);

module.exports = router;