const express = require('express');
const router = express.Router();
const qbittorrentService = require('./service');

/**
 * Get qBittorrent statistics
 * GET /api/services/:id/qbittorrent/stats
 */
router.get('/:id/qbittorrent/stats', async (req, res) => {
  try {
    console.log(`📊 qBittorrent stats requested for service ${req.params.id}`);
    
    const service = req.service; // Added by middleware
    const stats = await qbittorrentService.getStats(service);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('qBittorrent stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Test qBittorrent connection
 * POST /api/services/:id/qbittorrent/test
 */
router.post('/:id/qbittorrent/test', async (req, res) => {
  try {
    console.log(`🔧 qBittorrent connection test for service ${req.params.id}`);
    
    const service = req.service; // Added by middleware
    const result = await qbittorrentService.testConnection(service);
    
    res.json(result);
  } catch (error) {
    console.error('qBittorrent test error:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;