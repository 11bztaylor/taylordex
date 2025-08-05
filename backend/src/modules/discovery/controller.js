const NetworkScanner = require('./NetworkScanner');

// Global network scanner instance
const networkScanner = new NetworkScanner();

// Clean up old scans every hour
setInterval(() => {
  networkScanner.cleanupScans();
}, 3600000);

/**
 * Network Discovery Controller
 * Handles HTTP endpoints for network discovery functionality
 */
class DiscoveryController {
  
  /**
   * Start a network discovery scan
   * POST /api/discovery/scan
   */
  async startScan(req, res) {
    try {
      const { range, options = {} } = req.body;
      
      if (!range) {
        return res.status(400).json({
          success: false,
          error: 'Network range is required'
        });
      }
      
      // Validate scan options
      const scanOptions = {
        timeout: parseInt(options.timeout) || 3000,
        concurrency: Math.min(parseInt(options.concurrency) || 20, 50), // Max 50 concurrent
        includeNonStandard: Boolean(options.includeNonStandard),
        deepDetection: Boolean(options.deepDetection !== false) // Default to true
      };
      
      // Validate timeout range
      if (scanOptions.timeout < 1000 || scanOptions.timeout > 30000) {
        return res.status(400).json({
          success: false,
          error: 'Timeout must be between 1000 and 30000 milliseconds'
        });
      }
      
      const scanInfo = await networkScanner.startScan(range, scanOptions);
      
      res.json({
        success: true,
        scan: scanInfo
      });
      
    } catch (error) {
      console.error('Network scan start failed:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Get scan progress and results
   * GET /api/discovery/scan/:scanId
   */
  async getScanStatus(req, res) {
    try {
      const { scanId } = req.params;
      
      if (!scanId) {
        return res.status(400).json({
          success: false,
          error: 'Scan ID is required'
        });
      }
      
      const scanStatus = networkScanner.getScanStatus(scanId);
      
      res.json({
        success: true,
        scan: scanStatus
      });
      
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: error.message
        });
      }
      
      console.error('Get scan status failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get scan status'
      });
    }
  }
  
  /**
   * Cancel an active scan
   * DELETE /api/discovery/scan/:scanId
   */
  async cancelScan(req, res) {
    try {
      const { scanId } = req.params;
      
      if (!scanId) {
        return res.status(400).json({
          success: false,
          error: 'Scan ID is required'
        });
      }
      
      const cancelled = networkScanner.cancelScan(scanId);
      
      if (!cancelled) {
        return res.status(404).json({
          success: false,
          error: 'Scan not found or already completed'
        });
      }
      
      res.json({
        success: true,
        message: 'Scan cancelled successfully'
      });
      
    } catch (error) {
      console.error('Cancel scan failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel scan'
      });
    }
  }
  
  /**
   * Get all active scans
   * GET /api/discovery/scans
   */
  async getActiveScans(req, res) {
    try {
      const scans = networkScanner.getActiveScans();
      
      res.json({
        success: true,
        scans
      });
      
    } catch (error) {
      console.error('Get active scans failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get active scans'
      });
    }
  }
  
  /**
   * Test network range parsing
   * POST /api/discovery/test-range
   */
  async testRange(req, res) {
    try {
      const { range } = req.body;
      
      if (!range) {
        return res.status(400).json({
          success: false,
          error: 'Network range is required'
        });
      }
      
      const rangeParser = networkScanner.rangeParser;
      const rangeInfo = rangeParser.parseRange(range);
      const ips = rangeParser.generateIPs(rangeInfo);
      
      // Limit preview to first 20 IPs
      const previewIPs = ips.slice(0, 20);
      
      res.json({
        success: true,
        range: rangeInfo,
        totalIPs: ips.length,
        previewIPs,
        estimatedTime: this.estimateScanTime(ips.length)
      });
      
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
  
  /**
   * Get scan history (if we implement database storage)
   * GET /api/discovery/history
   */
  async getScanHistory(req, res) {
    try {
      // This would query the database for historical scans
      // For now, return empty array
      res.json({
        success: true,
        scans: []
      });
      
    } catch (error) {
      console.error('Get scan history failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get scan history'
      });
    }
  }
  
  /**
   * Get network discovery statistics
   * GET /api/discovery/stats
   */
  async getDiscoveryStats(req, res) {
    try {
      const activeScans = networkScanner.getActiveScans();
      const runningScans = activeScans.filter(scan => scan.status === 'running');
      const completedScans = activeScans.filter(scan => scan.status === 'completed');
      
      res.json({
        success: true,
        stats: {
          activeScans: activeScans.length,
          runningScans: runningScans.length,
          completedScans: completedScans.length,
          totalServicesDiscovered: completedScans.reduce((total, scan) => {
            return total + (scan.results?.length || 0);
          }, 0)
        }
      });
      
    } catch (error) {
      console.error('Get discovery stats failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get discovery statistics'
      });
    }
  }
  
  /**
   * Estimate scan time based on number of IPs
   * @param {number} ipCount - Number of IPs to scan
   * @returns {string} Estimated time
   */
  estimateScanTime(ipCount) {
    // Rough estimation: ~2 seconds per IP with default settings
    const seconds = Math.ceil(ipCount * 2);
    
    if (seconds < 60) {
      return `${seconds} seconds`;
    } else if (seconds < 3600) {
      return `${Math.ceil(seconds / 60)} minutes`;
    } else {
      return `${Math.ceil(seconds / 3600)} hours`;
    }
  }
}

module.exports = new DiscoveryController();