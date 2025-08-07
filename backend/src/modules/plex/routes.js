const express = require('express');
const router = express.Router();
const plexService = require('./service');
const { query } = require('../../database/connection');
const { authenticateToken, requireRole } = require('../../auth/middleware');
const ServiceRepository = require('../../repositories/ServiceRepository');
const plexDuplicateScheduler = require('../../schedulers/plexDuplicateScheduler');

// Apply authentication to all routes
router.use(authenticateToken);

// Test Plex connection
router.post('/test', requireRole('user'), async (req, res) => {
  try {
    const { host, port, apiKey } = req.body;
    
    if (!host || !port || !apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: host, port, apiKey'
      });
    }

    const config = {
      host,
      port,
      api_key: apiKey
    };

    const result = await plexService.testConnection(config);
    res.json(result);
  } catch (error) {
    console.error('Plex connection test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test Plex connection'
    });
  }
});

// Get stats for a specific Plex instance
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get service config using ServiceRepository
    const config = await ServiceRepository.getServiceWithCredentials(id, 'plex');

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Plex service not found'
      });
    }
    const stats = await plexService.getStats(config);

    // Cache stats in database
    await query(
      'INSERT INTO service_stats (service_id, stats) VALUES ($1, $2)',
      [id, JSON.stringify(stats)]
    );

    res.json({
      success: true,
      stats,
      service: {
        id: config.id,
        name: config.name,
        host: config.host,
        port: config.port
      }
    });
  } catch (error) {
    console.error('Plex stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Plex stats'
    });
  }
});

// Get duplicates for a specific Plex instance (cached results from background scan)
router.get('/:id/duplicates', requireRole('user'), async (req, res) => {
  try {
    const { id } = req.params;
    const { force_scan } = req.query;
    
    // Get service config using ServiceRepository
    const config = await ServiceRepository.getServiceWithCredentials(id, 'plex');

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Plex service not found'
      });
    }

    let duplicates;

    if (force_scan === 'true') {
      // Force a live scan (for testing or manual refresh)
      console.log('🔍 Force scan requested, running live duplicate detection...');
      duplicates = await plexService.getDuplicates(config);
    } else {
      // Use cached results for fast display
      console.log('📊 Fetching cached duplicate results...');
      duplicates = await plexDuplicateScheduler.getCachedDuplicates(id);
      
      // If no cached results exist, run a scan
      if (!duplicates.success || duplicates.totalDuplicates === 0) {
        console.log('⚠️ No cached results found, running live scan...');
        duplicates = await plexService.getDuplicates(config);
      }
    }

    res.json({
      success: true,
      ...duplicates,
      service: {
        id: config.id,
        name: config.name,
        host: config.host,
        port: config.port
      },
      cached: force_scan !== 'true'
    });
  } catch (error) {
    console.error('Plex duplicates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Plex duplicates'
    });
  }
});

// Investigate Plex native duplicate detection
router.get('/:id/duplicates/investigate', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get service config using ServiceRepository
    const config = await ServiceRepository.getServiceWithCredentials(id, 'plex');

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Plex service not found'
      });
    }

    console.log('🔬 Investigating Plex native duplicate detection capabilities...');
    
    // Run investigation
    await plexService.checkNativeDuplicateAPIs(config);
    
    res.json({
      success: true,
      message: 'Check console logs for investigation results'
    });
  } catch (error) {
    console.error('Investigation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to investigate Plex APIs'
    });
  }
});

// Trigger manual duplicate scan
router.post('/:id/duplicates/scan', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔍 Manual duplicate scan requested for service:', id);
    const result = await plexDuplicateScheduler.runManualScan(parseInt(id));
    
    res.json(result);
  } catch (error) {
    console.error('Manual scan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start manual scan'
    });
  }
});

// Delete a specific duplicate item
router.delete('/:id/duplicates/:ratingKey', requireRole('admin'), async (req, res) => {
  try {
    const { id, ratingKey } = req.params;
    
    // Get service config using ServiceRepository
    const config = await ServiceRepository.getServiceWithCredentials(id, 'plex');

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Plex service not found'
      });
    }
    const deleteResult = await plexService.deleteDuplicate(config, ratingKey);

    res.json(deleteResult);
  } catch (error) {
    console.error('Plex delete duplicate error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete Plex duplicate'
    });
  }
});

module.exports = router;
