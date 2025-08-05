const { v4: uuidv4 } = require('uuid');
const NetworkRangeParser = require('./NetworkRangeParser');
const PortScanner = require('./PortScanner');
const ServiceDetector = require('./ServiceDetector');

/**
 * Network Scanner - Main orchestrator for network discovery
 * Manages scan lifecycle and coordinates all discovery components
 */
class NetworkScanner {
  constructor() {
    this.activeScans = new Map(); // scanId -> NetworkScan instance
    this.rangeParser = new NetworkRangeParser();
    this.portScanner = new PortScanner();
    this.serviceDetector = new ServiceDetector();
  }
  
  /**
   * Start a new network discovery scan
   * @param {string} range - Network range to scan
   * @param {Object} options - Scan options
   * @returns {Object} Scan information
   */
  async startScan(range, options = {}) {
    const scanId = uuidv4();
    
    try {
      // Parse network range
      const rangeInfo = this.rangeParser.parseRange(range);
      const ips = this.rangeParser.generateIPs(rangeInfo);
      
      console.log(`Starting network scan ${scanId} for range: ${range}`);
      console.log(`Range parsed as: ${rangeInfo.type}, ${ips.length} IPs to scan`);
      
      // Create scan instance
      const scan = new NetworkScan(scanId, ips, rangeInfo, options, {
        portScanner: this.portScanner,
        serviceDetector: this.serviceDetector
      });
      
      // Store scan for progress tracking
      this.activeScans.set(scanId, scan);
      
      // Start scan asynchronously
      scan.start().catch(error => {
        console.error(`Scan ${scanId} failed:`, error);
        scan.markFailed(error.message);
      });
      
      return {
        scanId,
        range: rangeInfo,
        totalHosts: ips.length,
        status: 'started',
        startTime: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Failed to start scan: ${error.message}`);
      throw new Error(`Failed to start scan: ${error.message}`);
    }
  }
  
  /**
   * Get scan progress and results
   * @param {string} scanId - Scan ID
   * @returns {Object} Scan status and results
   */
  getScanStatus(scanId) {
    const scan = this.activeScans.get(scanId);
    
    if (!scan) {
      throw new Error(`Scan ${scanId} not found`);
    }
    
    return {
      scanId,
      status: scan.getStatus(),
      progress: scan.getProgress(),
      results: scan.getResults(),
      discoveryLog: scan.getDiscoveryLog(),
      startTime: scan.startTime,
      endTime: scan.endTime,
      error: scan.error
    };
  }
  
  /**
   * Cancel an active scan
   * @param {string} scanId - Scan ID
   * @returns {boolean} True if cancelled
   */
  cancelScan(scanId) {
    const scan = this.activeScans.get(scanId);
    
    if (!scan) {
      return false;
    }
    
    scan.cancel();
    return true;
  }
  
  /**
   * Clean up completed scans
   * @param {number} maxAge - Max age in milliseconds (default: 1 hour)
   */
  cleanupScans(maxAge = 3600000) {
    const now = Date.now();
    
    for (const [scanId, scan] of this.activeScans) {
      if (scan.isCompleted() && (now - scan.startTime.getTime()) > maxAge) {
        this.activeScans.delete(scanId);
        console.log(`Cleaned up scan ${scanId}`);
      }
    }
  }
  
  /**
   * Get all active scans
   * @returns {Array} Array of scan summaries
   */
  getActiveScans() {
    const scans = [];
    
    for (const [scanId, scan] of this.activeScans) {
      scans.push({
        scanId,
        status: scan.getStatus(),
        progress: scan.getProgress(),
        startTime: scan.startTime,
        endTime: scan.endTime
      });
    }
    
    return scans;
  }
}

/**
 * Individual Network Scan instance
 */
class NetworkScan {
  constructor(id, ips, rangeInfo, options, dependencies) {
    this.id = id;
    this.ips = ips;
    this.rangeInfo = rangeInfo;
    this.options = {
      timeout: options.timeout || 3000,
      concurrency: options.concurrency || 20,
      includeNonStandard: options.includeNonStandard || false,
      deepDetection: options.deepDetection || true,
      ...options
    };
    
    // Dependencies
    this.portScanner = dependencies.portScanner;
    this.serviceDetector = dependencies.serviceDetector;
    
    // Scan state
    this.status = 'pending';
    this.progress = { current: 0, total: ips.length };
    this.results = [];
    this.discoveryLog = []; // Live discovery events
    this.startTime = new Date();
    this.endTime = null;
    this.error = null;
    this.cancelled = false;
  }
  
  /**
   * Start the scan
   */
  async start() {
    if (this.status !== 'pending') {
      throw new Error('Scan already started or completed');
    }
    
    this.status = 'running';
    console.log(`Scan ${this.id} starting with ${this.ips.length} hosts`);
    
    this.addDiscoveryLog('scan_start', `Starting network scan with ${this.ips.length} hosts`, {
      totalHosts: this.ips.length,
      options: this.options
    });
    
    try {
      // Load external knowledge before scanning
      this.addDiscoveryLog('external_load', 'Loading external service knowledge...', {});
      await this.serviceDetector.loadExternalKnowledge();
      
      this.addDiscoveryLog('port_scan_start', 'Beginning port scan phase...', {});
      // Use the port scanner's massive scan method with progress tracking
      const scanResults = await this.portScanner.massiveScan(
        this.ips,
        this.options,
        (progress) => this.updateProgress(progress)
      );
      
      // Process scan results to detect services
      await this.processResults(scanResults);
      
      if (!this.cancelled) {
        this.status = 'completed';
        this.endTime = new Date();
        console.log(`Scan ${this.id} completed. Found ${this.results.length} services.`);
      }
    } catch (error) {
      this.markFailed(error.message);
      throw error;
    }
  }
  
  /**
   * Process scan results and detect services
   * @param {Array} scanResults - Raw scan results from port scanner
   */
  async processResults(scanResults) {
    console.log(`Processing ${scanResults.length} scan results for service detection...`);
    
    for (const hostResult of scanResults) {
      if (this.cancelled) break;
      
      // Skip hosts with no open ports
      if (!hostResult.openPorts || hostResult.openPorts.length === 0) {
        this.addDiscoveryLog('host_complete', `${hostResult.ip} - No open ports found`, {
          ip: hostResult.ip,
          hostname: hostResult.hostname
        });
        continue;
      }
      
      // Log found ports
      const portList = hostResult.openPorts.map(p => p.port).join(', ');
      this.addDiscoveryLog('ports_found', `${hostResult.ip} - Found open ports: ${portList}`, {
        ip: hostResult.ip,
        hostname: hostResult.hostname,
        ports: hostResult.openPorts.map(p => p.port)
      });
      
      // Detect services on each open port
      for (const portInfo of hostResult.openPorts) {
        if (this.cancelled) break;
        
        try {
          const detection = await this.serviceDetector.detectService(
            hostResult.hostname || hostResult.ip,
            portInfo.port,
            {
              timeout: this.options.timeout,
              deepDetection: this.options.deepDetection
            }
          );
          
          if (detection) {
            const serviceResult = {
              id: `${hostResult.ip}:${portInfo.port}`,
              ip: hostResult.ip,
              hostname: hostResult.hostname,
              resolvedName: hostResult.resolvedName,
              networkInfo: hostResult.networkInfo,
              port: portInfo.port,
              service: detection.service,
              serviceName: detection.name,
              confidence: detection.confidence,
              version: detection.version,
              ssl: detection.ssl,
              responseTime: portInfo.responseTime,
              details: detection.details,
              detectionMethod: detection.detectionMethod,
              discoveredAt: new Date().toISOString()
            };
            
            this.results.push(serviceResult);
            
            // Log service detection
            this.addDiscoveryLog('service_detected', `${hostResult.ip}:${portInfo.port} - Detected ${detection.service} (${detection.confidence}% confidence)`, {
              ip: hostResult.ip,
              port: portInfo.port,
              service: detection.service,
              confidence: detection.confidence,
              hostname: hostResult.hostname
            });
            
            console.log(`Detected ${detection.service} on ${hostResult.ip}:${portInfo.port} (${detection.confidence}% confidence)`);
          } else {
            // Log when no service is detected on an open port
            this.addDiscoveryLog('port_scanned', `${hostResult.ip}:${portInfo.port} - No service detected`, {
              ip: hostResult.ip,
              port: portInfo.port,
              hostname: hostResult.hostname
            });
          }
        } catch (error) {
          console.error(`Service detection failed for ${hostResult.ip}:${portInfo.port}:`, error.message);
        }
      }
    }
  }
  
  /**
   * Add discovery log entry
   * @param {string} type - Log type (host_scan, port_found, host_complete, service_detected)
   * @param {string} message - Log message
   * @param {Object} data - Additional data
   */
  addDiscoveryLog(type, message, data = {}) {
    this.discoveryLog.push({
      timestamp: new Date().toISOString(),
      type,
      message,
      data
    });
    
    // Keep only last 100 log entries to prevent memory issues
    if (this.discoveryLog.length > 100) {
      this.discoveryLog = this.discoveryLog.slice(-100);
    }
  }
  
  /**
   * Update scan progress
   * @param {Object} progress - Progress information
   */
  updateProgress(progress) {
    this.progress = {
      current: progress.completed,
      total: progress.total,
      currentHost: progress.current
    };
    
    // Add discovery log for host scanning
    if (progress.current) {
      this.addDiscoveryLog('host_scan', `Scanning ${progress.current}...`, {
        host: progress.current,
        completed: progress.completed,
        total: progress.total
      });
    }
  }
  
  /**
   * Mark scan as failed
   * @param {string} errorMessage - Error message
   */
  markFailed(errorMessage) {
    this.status = 'failed';
    this.error = errorMessage;
    this.endTime = new Date();
    console.error(`Scan ${this.id} failed: ${errorMessage}`);
  }
  
  /**
   * Cancel the scan
   */
  cancel() {
    if (this.status === 'running') {
      this.cancelled = true;
      this.status = 'cancelled';
      this.endTime = new Date();
      console.log(`Scan ${this.id} cancelled`);
    }
  }
  
  /**
   * Get current scan status
   * @returns {string} Status
   */
  getStatus() {
    return this.status;
  }
  
  /**
   * Get scan progress
   * @returns {Object} Progress information
   */
  getProgress() {
    return {
      ...this.progress,
      percentage: this.progress.total > 0 ? 
        Math.round((this.progress.current / this.progress.total) * 100) : 0
    };
  }
  
  /**
   * Get scan results
   * @returns {Array} Array of discovered services
   */
  getResults() {
    return this.results;
  }
  
  /**
   * Get discovery log
   * @returns {Array} Array of discovery log entries
   */
  getDiscoveryLog() {
    return this.discoveryLog;
  }
  
  /**
   * Check if scan is completed
   * @returns {boolean} True if completed
   */
  isCompleted() {
    return ['completed', 'failed', 'cancelled'].includes(this.status);
  }
}

module.exports = NetworkScanner;