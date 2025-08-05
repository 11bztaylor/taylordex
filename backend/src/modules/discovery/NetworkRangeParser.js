const os = require('os');

/**
 * Network Range Parser - Converts various network range formats to IP arrays
 * Supports CIDR, IP ranges, single IPs, and auto-detection
 */
class NetworkRangeParser {
  
  /**
   * Parse different network range input formats
   * @param {string} input - Network range in various formats
   * @returns {Object} Parsed range information
   */
  parseRange(input) {
    const trimmed = input.trim().toLowerCase();
    
    if (trimmed === 'auto') {
      return this.detectLocalNetworks();
    }
    
    // CIDR notation (192.168.1.0/24)
    if (trimmed.includes('/')) {
      return this.parseCIDR(trimmed);
    }
    
    // IP range (192.168.1.1-192.168.1.50 or 192.168.1.1 - 192.168.1.50)
    if (trimmed.includes('-')) {
      return this.parseIPRange(trimmed);
    }
    
    // Single IP
    if (this.isValidIP(trimmed)) {
      return {
        type: 'single',
        startIP: trimmed,
        endIP: trimmed,
        totalIPs: 1,
        network: trimmed + '/32'
      };
    }
    
    throw new Error(`Invalid network range format: ${input}`);
  }
  
  /**
   * Generate array of IP addresses from parsed range
   * @param {Object} rangeInfo - Parsed range information
   * @returns {Array<string>} Array of IP addresses
   */
  generateIPs(rangeInfo) {
    switch (rangeInfo.type) {
      case 'single':
        return [rangeInfo.startIP];
      
      case 'cidr':
        return this.generateCIDRIPs(rangeInfo);
      
      case 'range':
        return this.generateRangeIPs(rangeInfo);
      
      case 'auto':
        // For auto-detection, return IPs from all detected networks
        return rangeInfo.networks.reduce((allIPs, network) => {
          const networkIPs = this.generateCIDRIPs(this.parseCIDR(network));
          return allIPs.concat(networkIPs);
        }, []);
      
      default:
        throw new Error(`Unknown range type: ${rangeInfo.type}`);
    }
  }
  
  /**
   * Parse CIDR notation
   * @param {string} cidr - CIDR notation string
   * @returns {Object} Parsed CIDR information
   */
  parseCIDR(cidr) {
    const [network, prefixLength] = cidr.split('/');
    
    if (!this.isValidIP(network)) {
      throw new Error(`Invalid network IP: ${network}`);
    }
    
    const prefix = parseInt(prefixLength);
    if (isNaN(prefix) || prefix < 0 || prefix > 32) {
      throw new Error(`Invalid prefix length: ${prefixLength}`);
    }
    
    const networkInt = this.ipToInt(network);
    const hostBits = 32 - prefix;
    const networkMask = (0xFFFFFFFF << hostBits) >>> 0;
    const networkAddress = (networkInt & networkMask) >>> 0;
    const broadcastAddress = (networkAddress | (0xFFFFFFFF >>> prefix)) >>> 0;
    
    return {
      type: 'cidr',
      network: cidr,
      networkAddress: this.intToIP(networkAddress),
      broadcastAddress: this.intToIP(broadcastAddress),
      prefixLength: prefix,
      totalIPs: Math.pow(2, hostBits) - 2, // Exclude network and broadcast
      usableRange: {
        start: this.intToIP(networkAddress + 1),
        end: this.intToIP(broadcastAddress - 1)
      }
    };
  }
  
  /**
   * Parse IP range format
   * @param {string} range - IP range string
   * @returns {Object} Parsed range information
   */
  parseIPRange(range) {
    const parts = range.split('-').map(ip => ip.trim());
    
    if (parts.length !== 2) {
      throw new Error(`Invalid IP range format: ${range}`);
    }
    
    const [startIP, endIP] = parts;
    
    if (!this.isValidIP(startIP) || !this.isValidIP(endIP)) {
      throw new Error(`Invalid IP addresses in range: ${range}`);
    }
    
    const startInt = this.ipToInt(startIP);
    const endInt = this.ipToInt(endIP);
    
    if (startInt > endInt) {
      throw new Error(`Start IP must be less than or equal to end IP: ${range}`);
    }
    
    return {
      type: 'range',
      startIP,
      endIP,
      totalIPs: endInt - startInt + 1
    };
  }
  
  /**
   * Auto-detect local networks
   * @returns {Object} Auto-detection information
   */
  detectLocalNetworks() {
    const networks = [];
    const interfaces = os.networkInterfaces();
    
    // Get networks from active network interfaces
    for (const [name, nets] of Object.entries(interfaces)) {
      for (const net of nets) {
        if (net.family === 'IPv4' && !net.internal) {
          const network = this.calculateNetwork(net.address, net.netmask);
          if (network && !networks.includes(network)) {
            networks.push(network);
          }
        }
      }
    }
    
    // Add common home networks if none detected
    if (networks.length === 0) {
      networks.push('192.168.1.0/24', '192.168.0.0/24', '10.0.0.0/24');
    }
    
    return {
      type: 'auto',
      networks,
      totalIPs: networks.reduce((total, network) => {
        const parsed = this.parseCIDR(network);
        return total + parsed.totalIPs;
      }, 0)
    };
  }
  
  /**
   * Calculate network address from IP and netmask
   * @param {string} ip - IP address
   * @param {string} netmask - Network mask
   * @returns {string} Network in CIDR notation
   */
  calculateNetwork(ip, netmask) {
    try {
      const ipInt = this.ipToInt(ip);
      const maskInt = this.ipToInt(netmask);
      const networkInt = (ipInt & maskInt) >>> 0;
      const prefixLength = this.countSetBits(maskInt);
      
      return `${this.intToIP(networkInt)}/${prefixLength}`;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Generate IP array from CIDR
   * @param {Object} cidrInfo - Parsed CIDR information
   * @returns {Array<string>} Array of IP addresses
   */
  generateCIDRIPs(cidrInfo) {
    const ips = [];
    const startInt = this.ipToInt(cidrInfo.usableRange.start);
    const endInt = this.ipToInt(cidrInfo.usableRange.end);
    
    // Limit to reasonable size to prevent memory issues
    const maxIPs = 1000;
    const totalIPs = Math.min(endInt - startInt + 1, maxIPs);
    
    for (let i = 0; i < totalIPs; i++) {
      ips.push(this.intToIP(startInt + i));
    }
    
    return ips;
  }
  
  /**
   * Generate IP array from range
   * @param {Object} rangeInfo - Parsed range information
   * @returns {Array<string>} Array of IP addresses
   */
  generateRangeIPs(rangeInfo) {
    const ips = [];
    const startInt = this.ipToInt(rangeInfo.startIP);
    const endInt = this.ipToInt(rangeInfo.endIP);
    
    // Limit to reasonable size
    const maxIPs = 1000;
    const totalIPs = Math.min(endInt - startInt + 1, maxIPs);
    
    for (let i = 0; i < totalIPs; i++) {
      ips.push(this.intToIP(startInt + i));
    }
    
    return ips;
  }
  
  /**
   * Validate IP address format
   * @param {string} ip - IP address to validate
   * @returns {boolean} True if valid IP
   */
  isValidIP(ip) {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    
    return parts.every(part => {
      const num = parseInt(part);
      return !isNaN(num) && num >= 0 && num <= 255;
    });
  }
  
  /**
   * Convert IP address to integer
   * @param {string} ip - IP address
   * @returns {number} IP as integer
   */
  ipToInt(ip) {
    const parts = ip.split('.').map(part => parseInt(part));
    return ((parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0;
  }
  
  /**
   * Convert integer to IP address
   * @param {number} int - Integer representation of IP
   * @returns {string} IP address
   */
  intToIP(int) {
    return [
      (int >>> 24) & 0xFF,
      (int >>> 16) & 0xFF,
      (int >>> 8) & 0xFF,
      int & 0xFF
    ].join('.');
  }
  
  /**
   * Count set bits in integer (for prefix length calculation)
   * @param {number} int - Integer to count bits in
   * @returns {number} Number of set bits
   */
  countSetBits(int) {
    let count = 0;
    while (int) {
      count += int & 1;
      int >>>= 1;
    }
    return count;
  }
}

module.exports = NetworkRangeParser;