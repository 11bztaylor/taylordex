const express = require('express');
const router = express.Router();
const ResourceController = require('./controller');
const { authenticateToken } = require('../../auth/middleware');

// Middleware to require authentication for all resource routes
router.use(authenticateToken);

/**
 * Resource Management Routes
 * 
 * These routes provide the new unified resource management API
 * They work alongside the existing service routes during migration
 */

// GET /api/resources - Get all resources with filtering
// Query params: type, subtype, enabled, tags[key]=value
router.get('/', ResourceController.getAllResources);

// GET /api/resources/types - Get resource types and counts
router.get('/types', ResourceController.getResourceTypes);

// GET /api/resources/tags - Get available tags
router.get('/tags', ResourceController.getAvailableTags);

// GET /api/resources/:id - Get a specific resource
router.get('/:id', ResourceController.getResourceById);

// POST /api/resources - Create a new resource
router.post('/', ResourceController.createResource);

// PUT /api/resources/:id - Update a resource
router.put('/:id', ResourceController.updateResource);

// DELETE /api/resources/:id - Delete a resource
router.delete('/:id', ResourceController.deleteResource);

// GET /api/resources/:id/stats - Get resource statistics
router.get('/:id/stats', ResourceController.getResourceStats);

// POST /api/resources/:id/tags - Add tags to a resource
router.post('/:id/tags', ResourceController.addResourceTags);

module.exports = router;