const net = require('net');
const dns = require('dns').promises;
const { promisify } = require('util');

/**
 * Port Scanner - Scans hosts for open ports and gathers network information
 */
class PortScanner {
  constructor() {
    this.commonPorts = {
      // Media Services
      radarr: [7878, 7879],
      sonarr: [8989, 8990],
      lidarr: [8686, 8687],
      readarr: [8787, 8788],
      bazarr: [6767, 6768],
      prowlarr: [9696, 9697],
      
      // Media Servers
      plex: [32400, 32401],
      jellyfin: [8096, 8920],
      emby: [8096, 8920],
      
      // Download Clients
      qbittorrent: [8080, 8081, 8999],
      deluge: [8112, 58846],
      transmission: [9091, 51413],
      sabnzbd: [8080, 8090],
      nzbget: [6789],
      
      // NAS/Storage
      unraid: [80, 443],
      synology: [5000, 5001],
      freenas: [80, 443],
      truenas: [80, 443],
      
      // Common Web Services
      http: [80, 8080, 8000, 3000, 3001, 8181],
      https: [443, 8443, 8001]
    };
  }
  
  /**
   * Scan a single host for open ports and network information
   * @param {string} ip - IP address to scan
   * @param {Object} options - Scan options
   * @returns {Object} Host scan results
   */
  async scanHost(ip, options = {}) {
    const {
      timeout = 3000,
      includeNonStandard = false,
      deepDetection = true
    } = options;
    
    console.log(`Scanning host ${ip}...`);
    
    try {
      // Get hostname and network info first
      const hostInfo = await this.getHostInfo(ip, { timeout });
      
      // Determine which ports to scan
      const portsToScan = this.getPortsToScan(includeNonStandard);
      
      // Scan ports concurrently with limited concurrency
      const openPorts = await this.scanPorts(ip, portsToScan, { timeout });
      
      return {
        ip,
        hostname: hostInfo.hostname,
        resolvedName: hostInfo.resolvedName,
        networkInfo: hostInfo.networkInfo,
        openPorts,
        scanTime: new Date().toISOString(),
        portsScanned: portsToScan.length
      };
    } catch (error) {
      console.error(`Host scan failed for ${ip}:`, error.message);
      return {
        ip,
        hostname: null,
        resolvedName: null,
        networkInfo: {},
        openPorts: [],
        scanTime: new Date().toISOString(),
        error: error.message
      };
    }
  }
  
  /**
   * Get hostname and network information for an IP
   * @param {string} ip - IP address
   * @param {Object} options - Options
   * @returns {Object} Host information
   */
  async getHostInfo(ip, options = {}) {
    const { timeout = 3000 } = options;
    const results = {
      hostname: null,
      resolvedName: null,
      networkInfo: {}
    };
    
    // Try multiple hostname detection methods
    const methods = [
      () => this.reverseDNSLookup(ip, timeout),
      () => this.netbiosLookup(ip, timeout),
      () => this.mdnsLookup(ip, timeout)
    ];
    
    for (const method of methods) {
      try {
        const result = await method();
        if (result.hostname && !results.hostname) {
          results.hostname = result.hostname;
          results.networkInfo.detectionMethod = result.method;
          results.networkInfo.confidence = result.confidence;
        }
        if (result.resolvedName && !results.resolvedName) {
          results.resolvedName = result.resolvedName;
        }
        
        // Merge additional network info
        Object.assign(results.networkInfo, result.networkInfo || {});
      } catch (error) {
        // Try next method
        continue;
      }
    }
    
    return results;
  }
  
  /**
   * Reverse DNS lookup
   * @param {string} ip - IP address
   * @param {number} timeout - Timeout in ms
   * @returns {Object} DNS lookup result
   */
  async reverseDNSLookup(ip, timeout = 3000) {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('DNS lookup timeout')), timeout);
      });
      
      const hostnames = await Promise.race([
        dns.reverse(ip),
        timeoutPromise
      ]);
      
      if (hostnames && hostnames.length > 0) {
        return {
          method: 'dns',
          hostname: hostnames[0],
          resolvedName: hostnames[0].split('.')[0], // Extract friendly name
          confidence: 90,
          networkInfo: {
            dnsResolved: true,
            allHostnames: hostnames
          }
        };
      }
    } catch (error) {
      // DNS lookup failed
    }
    
    throw new Error('DNS lookup failed');
  }
  
  /**
   * NetBIOS lookup (placeholder - would need platform-specific implementation)
   * @param {string} ip - IP address
   * @param {number} timeout - Timeout in ms
   * @returns {Object} NetBIOS lookup result
   */
  async netbiosLookup(ip, timeout = 3000) {
    // This would typically use nmblookup or similar tools
    // For now, we'll skip NetBIOS lookup in the initial implementation
    throw new Error('NetBIOS lookup not implemented');
  }
  
  /**
   * mDNS lookup (placeholder - would need mdns library)
   * @param {string} ip - IP address
   * @param {number} timeout - Timeout in ms
   * @returns {Object} mDNS lookup result
   */
  async mdnsLookup(ip, timeout = 3000) {
    // This would typically use mdns library for Bonjour/mDNS discovery
    // For now, we'll skip mDNS lookup in the initial implementation
    throw new Error('mDNS lookup not implemented');
  }
  
  /**
   * Get list of ports to scan
   * @param {boolean} includeNonStandard - Include non-standard ports
   * @returns {Array<number>} Array of ports to scan
   */
  getPortsToScan(includeNonStandard = false) {
    const standardPorts = [];
    
    // Add all service-specific ports
    for (const [service, ports] of Object.entries(this.commonPorts)) {
      standardPorts.push(...ports);
    }
    
    // Remove duplicates
    const uniquePorts = [...new Set(standardPorts)].sort((a, b) => a - b);
    
    if (includeNonStandard) {
      // Add some additional common ports
      const additionalPorts = [
        22, 23, 25, 53, 110, 143, 993, 995, // Standard internet services
        1900, 5353, 8008, 8888, 9000, 9090, // Common alternative ports
        32768, 32769, 32770, 32771, 32772 // Common high ports
      ];
      
      uniquePorts.push(...additionalPorts);
    }
    
    return [...new Set(uniquePorts)].sort((a, b) => a - b);
  }
  
  /**
   * Scan specific ports on a host
   * @param {string} ip - IP address
   * @param {Array<number>} ports - Ports to scan
   * @param {Object} options - Scan options
   * @returns {Array<Object>} Array of open port information
   */
  async scanPorts(ip, ports, options = {}) {
    const { timeout = 3000, concurrency = 10 } = options;
    const openPorts = [];
    
    // Process ports in batches to limit concurrency
    for (let i = 0; i < ports.length; i += concurrency) {
      const batch = ports.slice(i, i + concurrency);
      const batchPromises = batch.map(port => this.scanPort(ip, port, timeout));
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        if (result.status === 'fulfilled' && result.value) {
          openPorts.push(result.value);
        }
      }
    }
    
    return openPorts;
  }
  
  /**
   * Scan a single port
   * @param {string} ip - IP address
   * @param {number} port - Port number
   * @param {number} timeout - Timeout in ms
   * @returns {Object|null} Port information if open, null if closed
   */
  async scanPort(ip, port, timeout = 3000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const socket = new net.Socket();
      
      socket.setTimeout(timeout);
      
      socket.on('connect', () => {
        const responseTime = Date.now() - startTime;
        socket.destroy();
        
        resolve({
          port,
          open: true,
          responseTime,
          service: this.identifyService(port),
          ssl: this.isSSLPort(port)
        });
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(null);
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(null);
      });
      
      socket.connect(port, ip);
    });
  }
  
  /**
   * Identify service type based on port
   * @param {number} port - Port number
   * @returns {string|null} Service type or null
   */
  identifyService(port) {
    for (const [service, ports] of Object.entries(this.commonPorts)) {
      if (ports.includes(port)) {
        return service;
      }
    }
    return null;
  }
  
  /**
   * Check if port is typically SSL/HTTPS
   * @param {number} port - Port number
   * @returns {boolean} True if typically SSL
   */
  isSSLPort(port) {
    const sslPorts = [443, 8443, 8001, 5001, 32401];
    return sslPorts.includes(port);
  }
  
  /**
   * Perform massive concurrent scan with rate limiting
   * @param {Array<string>} ips - Array of IP addresses
   * @param {Object} options - Scan options
   * @param {Function} progressCallback - Progress callback function
   * @returns {Array<Object>} Array of scan results
   */
  async massiveScan(ips, options = {}, progressCallback = null) {
    const {
      concurrency = 20,
      timeout = 3000,
      includeNonStandard = false
    } = options;
    
    const results = [];
    let completed = 0;
    
    console.log(`Starting network scan of ${ips.length} hosts...`);
    
    // Process IPs in batches to limit concurrency
    for (let i = 0; i < ips.length; i += concurrency) {
      const batch = ips.slice(i, i + concurrency);
      const batchPromises = batch.map(ip => 
        this.scanHost(ip, { timeout, includeNonStandard })
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        completed++;
        
        if (result.status === 'fulfilled') {
          results.push(result.value);
          
          // Log discovered services
          if (result.value.openPorts.length > 0) {
            console.log(`Found ${result.value.openPorts.length} open ports on ${result.value.ip} ${result.value.hostname ? `(${result.value.hostname})` : ''}`);
          }
        }
        
        // Call progress callback if provided
        if (progressCallback) {
          progressCallback({
            completed,
            total: ips.length,
            current: result.status === 'fulfilled' ? result.value.ip : null
          });
        }
      }
    }
    
    console.log(`Network scan completed. Found ${results.filter(r => r.openPorts.length > 0).length} hosts with open ports.`);
    
    return results;
  }
}

module.exports = PortScanner;