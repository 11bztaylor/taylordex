/**
 * Service Repository - Centralized Service Data Access
 * 
 * CRITICAL: Single source of truth for ALL service data access
 * 
 * SOLVES AUTHENTICATION PROBLEMS:
 * - Ensures api_key is ALWAYS included when needed
 * - Eliminates 24+ duplicate service queries across modules
 * - Provides consistent validation and error handling
 * - Prevents security leaks and credential exposure
 * 
 * ALIGNS WITH ARCHITECTURE:
 * - Prepares for migration to Unified Resource Architecture
 * - Maintains backwards compatibility with current services table
 * - Provides typed methods for different use cases
 * - Enables future enterprise features
 */

const { query } = require('../database/connection');
const logger = require('../utils/logger');

class ServiceRepository {
  
  /**
   * Get services for stats collection and authentication
   * CRITICAL: Always includes api_key for service authentication
   * Used by: statsCollector, service operations requiring authentication
   */
  async getServicesForAuthentication(options = {}) {
    const { enabled = true, type = null } = options;
    
    try {
      let sql = 'SELECT id, name, type, host, port, api_key FROM services';
      const params = [];
      const conditions = [];
      
      if (enabled !== null) {
        conditions.push('enabled = $' + (params.length + 1));
        params.push(enabled);
      }
      
      if (type) {
        conditions.push('type = $' + (params.length + 1));
        params.push(type);
      }
      
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      
      sql += ' ORDER BY name';
      
      const result = await query(sql, params);
      
      // CRITICAL: Validate that services needing API keys have them
      const servicesNeedingAuth = result.rows.filter(s => 
        this._serviceNeedsAuthentication(s.type)
      );
      const missingApiKeys = servicesNeedingAuth.filter(s => !s.api_key);
      
      if (missingApiKeys.length > 0) {
        logger.error('🚨 CRITICAL: Services missing API keys:', 
          missingApiKeys.map(s => `${s.name} (${s.type})`));
      }
      
      logger.debug(`🔐 ServiceRepository.getServicesForAuthentication: ${result.rows.length} services`, {
        total: result.rows.length,
        needingAuth: servicesNeedingAuth.length,
        missingApiKeys: missingApiKeys.length,
        enabled,
        type
      });
      
      return result.rows;
    } catch (error) {
      logger.error('❌ ServiceRepository.getServicesForAuthentication failed', { 
        error: error.message, 
        options 
      });
      throw error;
    }
  }

  /**
   * Get services for display (frontend, lists)
   * SECURITY: Excludes api_key to prevent credential exposure
   * Used by: frontend service lists, dashboards, display components
   */
  async getServicesForDisplay(options = {}) {
    const { enabled = null, includeMetadata = true } = options;
    
    try {
      let fields = 'id, name, type, host, port, enabled, created_at';
      if (includeMetadata) {
        fields += ', metadata, group_name';
      }
      
      let sql = `SELECT ${fields} FROM services`;
      const params = [];
      
      if (enabled !== null) {
        sql += ' WHERE enabled = $1';
        params.push(enabled);
      }
      
      sql += ' ORDER BY name';
      
      const result = await query(sql, params);
      
      logger.debug(`📋 ServiceRepository.getServicesForDisplay: ${result.rows.length} services`, {
        count: result.rows.length,
        enabled,
        includeMetadata
      });
      
      return result.rows;
    } catch (error) {
      logger.error('❌ ServiceRepository.getServicesForDisplay failed', { 
        error: error.message, 
        options 
      });
      throw error;
    }
  }

  /**
   * Get single service with credentials for operations
   * SECURITY: Includes api_key with audit logging
   * Used by: service controllers, API operations, authentication flows
   */
  async getServiceWithCredentials(id, expectedType = null) {
    try {
      let sql = 'SELECT * FROM services WHERE id = $1';
      const params = [id];
      
      if (expectedType) {
        sql += ' AND type = $2';
        params.push(expectedType);
      }
      
      const result = await query(sql, params);
      
      if (result.rows.length === 0) {
        logger.warn(`⚠️ ServiceRepository.getServiceWithCredentials: Service not found`, { 
          id, 
          expectedType 
        });
        return null;
      }
      
      const service = result.rows[0];
      
      // Validate API key exists for services that need it
      if (this._serviceNeedsAuthentication(service.type) && !service.api_key) {
        logger.error(`🚨 ServiceRepository.getServiceWithCredentials: Missing API key`, {
          id: service.id,
          name: service.name,
          type: service.type
        });
      }
      
      // SECURITY: Log credential access for audit trail
      logger.info(`🔐 ServiceRepository.getServiceWithCredentials: Credential access`, {
        serviceId: service.id,
        serviceName: service.name,
        serviceType: service.type,
        hasApiKey: !!service.api_key,
        caller: this._getCaller()
      });
      
      return service;
    } catch (error) {
      logger.error('❌ ServiceRepository.getServiceWithCredentials failed', { 
        error: error.message, 
        id, 
        expectedType 
      });
      throw error;
    }
  }

  /**
   * Get single service without credentials for display
   * SECURITY: Safe for frontend consumption, no credentials exposed
   * Used by: service cards, display components, public APIs
   */
  async getServiceForDisplay(id, expectedType = null) {
    try {
      let sql = 'SELECT id, name, type, host, port, enabled, created_at, metadata, group_name FROM services WHERE id = $1';
      const params = [id];
      
      if (expectedType) {
        sql += ' AND type = $2';
        params.push(expectedType);
      }
      
      const result = await query(sql, params);
      
      if (result.rows.length === 0) {
        logger.warn(`⚠️ ServiceRepository.getServiceForDisplay: Service not found`, { 
          id, 
          expectedType 
        });
        return null;
      }
      
      logger.debug(`📋 ServiceRepository.getServiceForDisplay: Retrieved service`, {
        id: result.rows[0].id,
        name: result.rows[0].name,
        type: result.rows[0].type
      });
      
      return result.rows[0];
    } catch (error) {
      logger.error('❌ ServiceRepository.getServiceForDisplay failed', { 
        error: error.message, 
        id, 
        expectedType 
      });
      throw error;
    }
  }

  /**
   * Check if service exists (minimal query for validation)
   * Used by: validation middleware, existence checks
   */
  async serviceExists(id) {
    try {
      const result = await query('SELECT 1 FROM services WHERE id = $1', [id]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('❌ ServiceRepository.serviceExists failed', { 
        error: error.message, 
        id 
      });
      throw error;
    }
  }

  /**
   * Get service basic info for logging/display
   * Used by: logging, audit trails, notifications
   */
  async getServiceInfo(id) {
    try {
      const result = await query(
        'SELECT id, name, type, enabled FROM services WHERE id = $1', 
        [id]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('❌ ServiceRepository.getServiceInfo failed', { 
        error: error.message, 
        id 
      });
      throw error;
    }
  }

  /**
   * MIGRATION HELPER: Get service as future resource model
   * Prepares for migration to Unified Resource Architecture
   * Maps current service structure to future resource structure
   */
  async getServiceAsResource(id) {
    try {
      const service = await this.getServiceWithCredentials(id);
      if (!service) return null;
      
      // Map to future resource model structure
      return {
        id: service.id,
        name: service.name,
        type: 'service',
        subtype: service.type,
        host: service.host,
        port: service.port,
        protocol: 'http', // Default, will be enhanced
        auth_type: service.api_key ? 'api_key' : 'none',
        credentials: service.api_key ? { api_key: service.api_key } : {},
        config: service.metadata || {},
        enabled: service.enabled,
        created_at: service.created_at,
        // Future fields that will be added:
        path: null,
        health_status: 'unknown',
        last_check: null
      };
    } catch (error) {
      logger.error('❌ ServiceRepository.getServiceAsResource failed', { 
        error: error.message, 
        id 
      });
      throw error;
    }
  }

  /**
   * Private helper: Check if service type needs authentication
   */
  _serviceNeedsAuthentication(type) {
    const authServices = [
      'radarr', 'sonarr', 'lidarr', 'prowlarr', 'bazarr',
      'plex', 'jellyfin', 'emby',
      'homeassistant', 'hassio',
      'qbittorrent', 'deluge', 'transmission',
      'portainer', 'unraid'
    ];
    return authServices.includes(type?.toLowerCase());
  }

  /**
   * Private helper: Get caller info for audit logging
   */
  _getCaller() {
    const stack = new Error().stack;
    const callerLine = stack.split('\n')[3]; // Get actual caller
    return callerLine ? callerLine.trim().replace(process.cwd(), '.') : 'unknown';
  }

  /**
   * Utility: Get count by type for statistics
   */
  async getServiceCountByType() {
    try {
      const result = await query(`
        SELECT type, COUNT(*) as count 
        FROM services 
        WHERE enabled = true 
        GROUP BY type 
        ORDER BY count DESC
      `);
      return result.rows;
    } catch (error) {
      logger.error('❌ ServiceRepository.getServiceCountByType failed', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Utility: Get services by status for monitoring
   */
  async getServicesByHealthStatus() {
    try {
      // This will be enhanced when health_status is added to schema
      const result = await query(`
        SELECT id, name, type, enabled,
               CASE 
                 WHEN enabled = true THEN 'unknown'
                 ELSE 'disabled'
               END as health_status
        FROM services 
        ORDER BY name
      `);
      return result.rows;
    } catch (error) {
      logger.error('❌ ServiceRepository.getServicesByHealthStatus failed', { 
        error: error.message 
      });
      throw error;
    }
  }
}

module.exports = new ServiceRepository();