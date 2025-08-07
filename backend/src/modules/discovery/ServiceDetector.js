const axios = require('axios');
const https = require('https');

/**
 * Service Detector - Identifies services running on discovered ports
 */
class ServiceDetector {
  constructor() {
    // External source integrations (UniFi/Unraid/Docker knowledge)
    this.knownServices = new Map(); // IP:port -> service info from external sources
    this.dockerContainers = new Map(); // container -> service mapping
    this.unifiDevices = new Map(); // MAC -> device info
    
    // Common ports for services (helps with confidence scoring)
    this.commonPorts = {
      plex: [32400, 32401],
      radarr: [7878],
      sonarr: [8989],
      lidarr: [8686],
      readarr: [8787],
      bazarr: [6767],
      prowlarr: [9696],
      overseerr: [5055],
      qbittorrent: [8080, 8081, 8999],
      deluge: [8112, 58846],
      transmission: [9091, 51413],
      unraid: [80, 443],
      unifi: [443, 8443],
      synology: [5000, 5001]
    };
    
    // Service detection rules with multiple methods - ordered by specificity
    this.detectionRules = {
      // UniFi - very specific detection to avoid false positives
      unifi: [
        {
          method: 'GET',
          path: '/api/self',
          headers: {},
          expect: { contains: 'unifios', field: 'meta.product_line' },
          confidence: 95
        },
        {
          method: 'GET',
          path: '/manage',
          headers: {},
          expect: { title: /unifi/i },
          confidence: 90
        },
        {
          method: 'GET',
          path: '/',
          headers: {},
          expect: { title: /unifi/i },
          confidence: 85
        }
      ],
      
      // Plex - check first since it has specific ports/paths
      plex: [
        {
          method: 'GET',
          path: '/identity',
          headers: {},
          expect: { status: [200, 401] },
          confidence: 90
        },
        {
          method: 'GET',
          path: '/',
          headers: {},
          expect: { title: /plex/i },
          confidence: 80
        },
        {
          method: 'GET',
          path: '/web/index.html',
          headers: {},
          expect: { status: [200, 301, 302] },
          confidence: 70
        }
      ],
      
      // qBittorrent - multi-method verification to prevent false positives
      qbittorrent: [
        {
          method: 'GET',
          path: '/api/v2/app/version',
          headers: {},
          expect: { 
            contains: 'qBittorrent',
            headers: { 'content-type': 'text/plain' },
            matchThreshold: 0.8
          },
          confidence: 95
        },
        {
          method: 'GET',
          path: '/',
          headers: {},
          expect: { 
            title: /qbittorrent/i,
            contains: 'qbittorrent',
            matchThreshold: 0.8
          },
          confidence: 90
        },
        {
          method: 'GET',
          path: '/api/v2/auth/login',
          headers: {},
          expect: { 
            status: [200, 403],
            statusWithContent: { status: 403, content: 'Forbidden' }
          },
          confidence: 80
        }
      ],
      
      // Prowlarr - specific API paths
      prowlarr: [
        {
          method: 'GET',
          path: '/api/v1/system/status',
          headers: {},
          expect: { contains: 'prowlarr', field: 'appName' },
          confidence: 95
        },
        {
          method: 'GET',
          path: '/',
          headers: {},
          expect: { title: /prowlarr/i },
          confidence: 85
        },
        {
          method: 'GET',
          path: '/api/v1/indexer',
          headers: {},
          expect: { status: [200, 401] },
          confidence: 85  // Higher confidence for Prowlarr-specific endpoint
        }
      ],
      
      radarr: [
        {
          method: 'GET',
          path: '/',
          headers: {},
          expect: { title: /radarr/i },
          confidence: 90
        },
        {
          method: 'GET',
          path: '/api/v3/system/status',
          headers: {},
          expect: { status: [401, 403] }, // Expect unauthorized - means API exists but needs auth
          confidence: 85
        },
        {
          method: 'GET',
          path: '/login',
          headers: {},
          expect: { status: [200], title: /radarr/i },
          confidence: 75
        }
      ],
      
      sonarr: [
        {
          method: 'GET',
          path: '/',
          headers: {},
          expect: { 
            title: /sonarr/i,
            contains: 'sonarr',
            matchThreshold: 0.8
          },
          confidence: 90
        },
        {
          method: 'GET',
          path: '/api/v3/system/status',
          headers: {},
          expect: { status: [401, 403] }, // Expect unauthorized - API exists but needs auth
          confidence: 85
        },
        {
          method: 'GET',
          path: '/login',
          headers: {},
          expect: { status: [200], title: /sonarr/i },
          confidence: 75
        }
      ],
      
      lidarr: [
        {
          method: 'GET',
          path: '/',
          headers: {},
          expect: { title: /lidarr/i },
          confidence: 90
        },
        {
          method: 'GET',
          path: '/api/v1/system/status',
          headers: {},
          expect: { status: [401, 403] }, // Expect unauthorized - API exists but needs auth
          confidence: 80
        }
      ],
      
      readarr: [
        {
          method: 'GET',
          path: '/',
          headers: {},
          expect: { title: /readarr/i },
          confidence: 90
        },
        {
          method: 'GET',
          path: '/api/v1/system/status',
          headers: {},
          expect: { status: [401, 403] }, // Expect unauthorized - API exists but needs auth
          confidence: 80
        }
      ],
      
      bazarr: [
        {
          method: 'GET',
          path: '/',
          headers: {},
          expect: { title: /bazarr/i },
          confidence: 85
        },
        {
          method: 'GET',
          path: '/api/system/status',
          headers: {},
          expect: { status: [401, 403] }, // Expect unauthorized - API exists but needs auth
          confidence: 75
        }
      ],
      
      prowlarr: [
        {
          method: 'GET',
          path: '/',
          headers: {},
          expect: { title: /prowlarr/i },
          confidence: 90
        },
        {
          method: 'GET',
          path: '/api/v1/system/status',
          headers: {},
          expect: { status: [401, 403] }, // Expect unauthorized - API exists but needs auth
          confidence: 80
        }
      ],
      
      plex: [
        {
          method: 'GET',
          path: '/identity',
          headers: {},
          expect: { contains: 'plex', field: 'product' },
          confidence: 98
        },
        {
          method: 'GET',
          path: '/',
          headers: {},
          expect: { title: /plex/i },
          confidence: 85
        },
        {
          method: 'GET',
          path: '/web',
          headers: {},
          expect: { redirects: true, title: /plex/i },
          confidence: 90
        }
      ],
      
      jellyfin: [
        {
          method: 'GET',
          path: '/System/Info/Public',
          headers: {},
          expect: { contains: 'jellyfin', field: 'ProductName' },
          confidence: 95
        },
        {
          method: 'GET',
          path: '/',
          headers: {},
          expect: { title: /jellyfin/i },
          confidence: 80
        }
      ],
      
      emby: [
        {
          method: 'GET',
          path: '/System/Info/Public',
          headers: {},
          expect: { contains: 'emby', field: 'ProductName' },
          confidence: 95
        },
        {
          method: 'GET',
          path: '/',
          headers: {},
          expect: { title: /emby/i },
          confidence: 80
        }
      ],
      
      unraid: [
        {
          method: 'GET',
          path: '/',
          headers: {},
          expect: { title: /unraid/i, contains: 'unraid' },
          confidence: 95
        },
        {
          method: 'GET',
          path: '/webGui/images/unraid.png',
          headers: {},
          expect: { status: [200] }, // Unraid-specific image
          confidence: 90
        },
        {
          method: 'GET',
          path: '/login',
          headers: {},
          expect: { contains: 'unraid', title: /unraid/i },
          confidence: 85
        }
      ],
      
      deluge: [
        {
          method: 'GET',
          path: '/',
          headers: {},
          expect: { title: /deluge/i },
          confidence: 85
        },
        {
          method: 'GET',
          path: '/json',
          headers: {},
          expect: { status: [200, 401] },
          confidence: 40  // Very low confidence since this is generic
        }
      ],
      
      transmission: [
        {
          method: 'GET',
          path: '/transmission/rpc',
          headers: {},
          expect: { status: [409] }, // CSRF error indicates Transmission
          confidence: 90
        },
        {
          method: 'GET',
          path: '/',
          headers: {},
          expect: { title: /transmission/i },
          confidence: 75
        }
      ],
      
      sabnzbd: [
        {
          method: 'GET',
          path: '/api?mode=version',
          headers: {},
          expect: { contains: 'sabnzbd' },
          confidence: 90
        },
        {
          method: 'GET',
          path: '/',
          headers: {},
          expect: { title: /sabnzbd/i },
          confidence: 75
        }
      ],
      
      synology: [
        {
          method: 'GET',
          path: '/',
          headers: {},
          expect: { title: /synology|diskstation/i },
          confidence: 85
        },
        {
          method: 'GET',
          path: '/webapi/auth.cgi',
          headers: {},
          expect: { status: [200, 400] },
          confidence: 70
        }
      ]
    };
    
    // HTTP client with reasonable defaults
    this.httpClient = axios.create({
      timeout: 5000,
      maxRedirects: 3,
      validateStatus: () => true, // Don't throw on any status code
      httpsAgent: new https.Agent({
        rejectUnauthorized: false // Accept self-signed certificates
      })
    });
  }
  
  /**
   * Detect service running on host:port
   * @param {string} host - Host IP or hostname
   * @param {number} port - Port number
   * @param {Object} options - Detection options
   * @returns {Object|null} Service detection result
   */
  /**
   * Load known services from external sources
   */
  async loadExternalKnowledge() {
    try {
      // Try to get Docker container information
      await this.loadDockerInfo();
      
      // Try to get UniFi network information (if available)
      await this.loadUniFiInfo();
      
      // Try to get Unraid system information (if available)  
      await this.loadUnraidInfo();
      
      console.log(`Loaded ${this.knownServices.size} known services from external sources`);
    } catch (error) {
      console.log('External knowledge loading failed (this is normal):', error.message);
    }
  }
  
  /**
   * Load Docker container information
   */
  async loadDockerInfo() {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      // Get running containers with their ports and names
      const { stdout } = await execAsync('docker ps --format "table {{.Names}}\\t{{.Ports}}\\t{{.Image}}"');
      const lines = stdout.split('\n').slice(1); // Skip header
      
      for (const line of lines) {
        const [name, ports, image] = line.split('\t');
        if (name && ports) {
          this.parseDockerPorts(name, ports, image);
        }
      }
    } catch (error) {
      // Docker not available or accessible
    }
  }
  
  /**
   * Parse Docker port mappings and add to known services
   */
  parseDockerPorts(containerName, portString, image) {
    // Example: "0.0.0.0:7878->7878/tcp, 0.0.0.0:8989->8989/tcp"
    const portMatches = portString.match(/0\.0\.0\.0:(\d+)->(\d+)\/tcp/g);
    if (portMatches) {
      for (const match of portMatches) {
        const [, externalPort] = match.match(/0\.0\.0\.0:(\d+)->/);
        const serviceType = this.guessServiceFromContainer(containerName, image);
        
        if (serviceType) {
          this.knownServices.set(`*:${externalPort}`, {
            service: serviceType,
            source: 'docker',
            container: containerName,
            image: image,
            confidence: 85
          });
        }
      }
    }
  }
  
  /**
   * Guess service type from container name or image
   */
  guessServiceFromContainer(name, image) {
    const nameImage = `${name} ${image}`.toLowerCase();
    
    if (nameImage.includes('radarr')) return 'radarr';
    if (nameImage.includes('sonarr')) return 'sonarr';
    if (nameImage.includes('lidarr')) return 'lidarr';
    if (nameImage.includes('prowlarr')) return 'prowlarr';
    if (nameImage.includes('plex')) return 'plex';
    if (nameImage.includes('qbittorrent')) return 'qbittorrent';
    if (nameImage.includes('deluge')) return 'deluge';
    if (nameImage.includes('transmission')) return 'transmission';
    if (nameImage.includes('unifi')) return 'unifi';
    
    return null;
  }
  
  /**
   * Load UniFi network device information (placeholder)
   */
  async loadUniFiInfo() {
    // This would integrate with UniFi Controller API if available
    // For now, just a placeholder
  }
  
  /**
   * Load Unraid system information (placeholder)
   */
  async loadUnraidInfo() {
    // This would integrate with Unraid API if available  
    // For now, just a placeholder
  }

  async detectService(host, port, options = {}) {
    const { timeout = 5000, deepDetection = true } = options;
    
    // First check if we have external knowledge about this service
    const knownKey = `${host}:${port}`;
    const knownWildcard = `*:${port}`;
    const knownService = this.knownServices.get(knownKey) || this.knownServices.get(knownWildcard);
    
    if (knownService) {
      console.log(`Using external knowledge: ${knownKey} = ${knownService.service} (${knownService.source})`);
      // Still verify with HTTP but boost confidence significantly
    }
    
    // Try both HTTP and HTTPS, but prefer HTTPS for standard ports
    const protocols = port === 443 || port === 8443 ? ['https'] : 
                     port === 80 ? ['http'] : ['http', 'https'];
    
    for (const protocol of protocols) {
      const baseUrl = `${protocol}://${host}:${port}`;
      
      // Try to detect specific services - test ALL services and pick the best match
      let bestMatch = null;
      let highestConfidence = 0;
      
      for (const [serviceName, rules] of Object.entries(this.detectionRules)) {
        try {
          const result = await this.testServiceRules(baseUrl, rules, { timeout, deepDetection });
          
          if (result.detected) {
            // Apply port-based confidence boost
            let finalConfidence = result.confidence;
            const portBoost = this.commonPorts[serviceName] && this.commonPorts[serviceName].includes(port);
            if (portBoost) {
              finalConfidence = Math.min(100, finalConfidence + 15); // Boost confidence by 15 points
            }
            
            console.log(`Service detection: ${serviceName} = ${result.confidence}% (${portBoost ? '+15 port boost' : 'no port boost'}) = ${finalConfidence}% via ${result.method}`);
            
            // Apply external knowledge boost
            if (knownService && serviceName === knownService.service) {
              finalConfidence = Math.min(100, finalConfidence + 20); // +20% for external confirmation
              console.log(`External knowledge boost: ${serviceName} confidence increased to ${finalConfidence}%`);
            }
            
            // Keep track of the best match
            if (finalConfidence > highestConfidence) {
              highestConfidence = finalConfidence;
              bestMatch = {
                service: serviceName,
                confidence: finalConfidence,
                name: result.detectedName || serviceName,
                version: result.version,
                ssl: protocol === 'https',
                details: result.details + (portBoost ? ' (standard port)' : '') + (knownService && serviceName === knownService.service ? ` (${knownService.source} confirmed)` : ''),
                response: result.response,
                detectionMethod: result.method,
                externalSource: knownService && serviceName === knownService.service ? knownService.source : null
              };
              console.log(`New best match: ${serviceName} with ${finalConfidence}% confidence`);
            }
          }
        } catch (error) {
          // Continue to next service
          continue;
        }
      }
      
      // Return the best match if found
      if (bestMatch) {
        return bestMatch;
      }
      
      // If no specific service detected, check if it's a generic web service
      if (deepDetection) {
        try {
          const webService = await this.detectGenericWebService(baseUrl, { timeout });
          if (webService) {
            return {
              service: 'unknown',
              confidence: 30,
              name: webService.title || 'Unknown Web Service',
              ssl: protocol === 'https',
              details: `Web server detected: ${webService.server || 'Unknown'}`,
              response: webService,
              detectionMethod: 'generic'
            };
          }
        } catch (error) {
          // Continue to next protocol
          continue;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Test service detection rules
   * @param {string} baseUrl - Base URL to test
   * @param {Array} rules - Detection rules
   * @param {Object} options - Options
   * @returns {Object} Test result
   */
  async testServiceRules(baseUrl, rules, options = {}) {
    const { timeout = 5000, deepDetection = true } = options;
    
    let highestConfidence = 0;
    let bestMatch = null;
    
    for (const rule of rules) {
      try {
        const response = await this.makeRequest(baseUrl + rule.path, {
          method: rule.method || 'GET',
          timeout,
          headers: rule.headers || {},
          data: rule.body
        });
        
        const matches = this.evaluateExpectation(response, rule.expect);
        
        if (matches && rule.confidence > highestConfidence) {
          highestConfidence = rule.confidence;
          bestMatch = {
            detected: true,
            confidence: rule.confidence,
            response: response,
            detectedName: this.extractServiceName(response),
            version: this.extractVersion(response),
            details: `Detected via ${rule.method} ${rule.path}`,
            method: `${rule.method} ${rule.path}`
          };
        }
      } catch (error) {
        // Rule failed, try next one
        continue;
      }
    }
    
    return bestMatch || { detected: false };
  }
  
  /**
   * Make HTTP request with error handling
   * @param {string} url - URL to request
   * @param {Object} options - Request options
   * @returns {Object} Response object
   */
  async makeRequest(url, options = {}) {
    try {
      const response = await this.httpClient({
        url,
        method: options.method || 'GET',
        headers: options.headers || {},
        data: options.data,
        timeout: options.timeout || 5000
      });
      
      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        url: response.config.url,
        redirected: response.request.res?.responseUrl !== response.config.url
      };
    } catch (error) {
      if (error.response) {
        return {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data,
          url: error.config?.url,
          error: error.message
        };
      }
      throw error;
    }
  }
  
  /**
   * Evaluate expectation against response
   * @param {Object} response - HTTP response
   * @param {Object} expectation - Expectation to test
   * @returns {boolean} True if expectation matches
   */
  evaluateExpectation(response, expectation) {
    let matchCount = 0;
    let totalChecks = 0;
    
    // Check status codes
    if (expectation.status) {
      totalChecks++;
      const expectedStatuses = Array.isArray(expectation.status) ? expectation.status : [expectation.status];
      if (expectedStatuses.includes(response.status)) {
        matchCount++;
      } else {
        return false; // Status is mandatory
      }
    }
    
    // Check for content contains
    if (expectation.contains) {
      totalChecks++;
      const content = JSON.stringify(response.data).toLowerCase();
      const searchTerm = expectation.contains.toLowerCase();
      
      if (expectation.field && typeof response.data === 'object') {
        const fieldValue = this.getNestedValue(response.data, expectation.field);
        if (fieldValue && fieldValue.toLowerCase().includes(searchTerm)) {
          matchCount++;
        }
      } else if (content.includes(searchTerm)) {
        matchCount++;
      }
    }
    
    // Check title in HTML responses
    if (expectation.title && typeof response.data === 'string') {
      const titleMatch = response.data.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (!titleMatch || !expectation.title.test(titleMatch[1])) {
        return false;
      }
    }
    
    // Check for redirects
    if (expectation.redirects !== undefined) {
      if (expectation.redirects !== response.redirected) {
        return false;
      }
    }
    
    // Add new detection methods
    
    // Check HTTP headers for server identification
    if (expectation.headers) {
      totalChecks++;
      let headerMatch = false;
      for (const [headerName, expectedValue] of Object.entries(expectation.headers)) {
        const actualValue = response.headers[headerName.toLowerCase()];
        if (actualValue && actualValue.toLowerCase().includes(expectedValue.toLowerCase())) {
          headerMatch = true;
          break;
        }
      }
      if (headerMatch) matchCount++;
    }
    
    // Check for specific response patterns (e.g., JSON structure)
    if (expectation.jsonPattern && typeof response.data === 'object') {
      totalChecks++;
      if (this.matchesJsonPattern(response.data, expectation.jsonPattern)) {
        matchCount++;
      }
    }
    
    // Check for specific HTTP response codes AND content together
    if (expectation.statusWithContent) {
      totalChecks++;
      const { status, content } = expectation.statusWithContent;
      if (response.status === status && 
          JSON.stringify(response.data).toLowerCase().includes(content.toLowerCase())) {
        matchCount++;
      }
    }
    
    // Require minimum match percentage (default 70%)
    const requiredMatchPercentage = expectation.matchThreshold || 0.7;
    return totalChecks === 0 || (matchCount / totalChecks) >= requiredMatchPercentage;
  }
  
  /**
   * Check if JSON response matches expected pattern
   */
  matchesJsonPattern(data, pattern) {
    try {
      for (const [key, expectedValue] of Object.entries(pattern)) {
        const actualValue = this.getNestedValue(data, key);
        if (!actualValue || !actualValue.toString().toLowerCase().includes(expectedValue.toLowerCase())) {
          return false;
        }
      }
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Detect generic web service
   * @param {string} baseUrl - Base URL to test
   * @param {Object} options - Options
   * @returns {Object|null} Generic service info
   */
  async detectGenericWebService(baseUrl, options = {}) {
    try {
      const response = await this.makeRequest(baseUrl, options);
      
      if (response.status >= 200 && response.status < 400) {
        let title = 'Unknown Service';
        let server = response.headers.server || 'Unknown';
        
        // Extract title from HTML
        if (typeof response.data === 'string') {
          const titleMatch = response.data.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch) {
            title = titleMatch[1].trim();
          }
        }
        
        return {
          title,
          server,
          status: response.status,
          contentType: response.headers['content-type'] || 'unknown'
        };
      }
    } catch (error) {
      // Not a web service
    }
    
    return null;
  }
  
  /**
   * Extract service name from response
   * @param {Object} response - HTTP response
   * @returns {string|null} Service name
   */
  extractServiceName(response) {
    if (typeof response.data === 'object' && response.data) {
      // Try common service name fields
      const nameFields = ['appName', 'productName', 'name', 'product', 'application'];
      for (const field of nameFields) {
        const value = this.getNestedValue(response.data, field);
        if (value && typeof value === 'string') {
          return value;
        }
      }
    }
    
    // Try to extract from HTML title
    if (typeof response.data === 'string') {
      const titleMatch = response.data.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        return titleMatch[1].trim();
      }
    }
    
    return null;
  }
  
  /**
   * Extract version from response
   * @param {Object} response - HTTP response
   * @returns {string|null} Version string
   */
  extractVersion(response) {
    if (typeof response.data === 'object' && response.data) {
      // Try common version fields
      const versionFields = ['version', 'appVersion', 'productVersion', 'build', 'release'];
      for (const field of versionFields) {
        const value = this.getNestedValue(response.data, field);
        if (value && typeof value === 'string') {
          return value;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Get nested value from object using dot notation
   * @param {Object} obj - Object to search
   * @param {string} path - Dot notation path
   * @returns {any} Value or undefined
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}

module.exports = ServiceDetector;