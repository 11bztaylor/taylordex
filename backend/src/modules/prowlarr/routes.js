const express = require('express');
const router = express.Router();
const prowlarrService = require('./service');
const { query } = require('../../database/connection');

// Get stats for a specific Prowlarr instance
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      'SELECT * FROM services WHERE id = $1 AND type = $2',
      [id, 'prowlarr']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Prowlarr service not found'
      });
    }

    const config = result.rows[0];
    const stats = await prowlarrService.getStats(config);

    await query(
      'INSERT INTO service_stats (service_id, stats) VALUES ($1, $2)',
      [id, JSON.stringify(stats)]
    );

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
