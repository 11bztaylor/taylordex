const cron = require('node-cron');
const { query } = require('../database/connection');
const plexService = require('../modules/plex/service');
const ServiceRepository = require('../repositories/ServiceRepository');

class PlexDuplicateScheduler {
  constructor() {
    this.isRunning = false;
    this.schedule = null;
    console.log('🕒 PlexDuplicateScheduler initialized');
  }

  start() {
    // Run every day at 3 AM (when server usage is typically lowest)
    this.schedule = cron.schedule('0 3 * * *', async () => {
      console.log('🔍 Starting scheduled Plex duplicate scan at', new Date().toISOString());
      await this.runScheduledScan();
    }, {
      scheduled: true,
      timezone: 'America/New_York' // Adjust timezone as needed
    });

    console.log('✅ Plex duplicate scanner scheduled for daily 3 AM runs');
  }

  stop() {
    if (this.schedule) {
      this.schedule.stop();
      console.log('⏹️ Plex duplicate scanner stopped');
    }
  }

  async runScheduledScan() {
    if (this.isRunning) {
      console.log('⚠️ Duplicate scan already running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      // Get all active Plex services
      const plexServices = await query(
        'SELECT id, name, host, port, api_key FROM services WHERE type = $1 AND enabled = true',
        ['plex']
      );

      console.log(`📊 Found ${plexServices.rows.length} active Plex services to scan`);

      for (const service of plexServices.rows) {
        await this.scanService(service);
      }

      console.log('✅ Scheduled duplicate scan completed successfully');
    } catch (error) {
      console.error('❌ Scheduled duplicate scan failed:', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  async scanService(serviceConfig) {
    console.log(`🔍 Scanning service: ${serviceConfig.name} (ID: ${serviceConfig.id})`);

    // Record scan start
    const scanId = await this.recordScanStart(serviceConfig.id);

    try {
      // Check if service is accessible
      const testResult = await plexService.testConnection(serviceConfig);
      if (!testResult.success) {
        throw new Error(`Service unreachable: ${testResult.error}`);
      }

      // Get duplicates using enhanced detection
      const duplicates = await plexService.getDuplicates(serviceConfig);

      if (duplicates.success) {
        // Clear old cache for this service
        await query('DELETE FROM plex_duplicates WHERE service_id = $1', [serviceConfig.id]);

        let totalGroups = 0;
        let totalItems = 0;

        // Store each duplicate group in cache
        if (duplicates.duplicatesByLibrary) {
          for (const [libraryName, library] of Object.entries(duplicates.duplicatesByLibrary)) {
            for (const group of library.duplicateGroups) {
              await this.cacheGroup(serviceConfig.id, group, libraryName, library.libraryType);
              totalGroups++;
              totalItems += group.items.length;
            }
          }
        }

        // Record successful completion
        await this.recordScanComplete(scanId, totalGroups, totalItems, 'completed');

        console.log(`✅ ${serviceConfig.name}: Cached ${totalGroups} duplicate groups (${totalItems} items)`);
      } else {
        throw new Error(`Scan failed: ${duplicates.error}`);
      }

    } catch (error) {
      console.error(`❌ Failed to scan ${serviceConfig.name}:`, error.message);
      await this.recordScanComplete(scanId, 0, 0, 'failed', error.message);
    }
  }

  async recordScanStart(serviceId) {
    const result = await query(
      'INSERT INTO plex_scan_history (service_id, scan_started) VALUES ($1, NOW()) RETURNING id',
      [serviceId]
    );
    return result.rows[0].id;
  }

  async recordScanComplete(scanId, groupsFound, itemsFound, status, errorMessage = null) {
    await query(
      `UPDATE plex_scan_history 
       SET scan_completed = NOW(), total_groups_found = $2, total_items_found = $3, 
           scan_status = $4, error_message = $5 
       WHERE id = $1`,
      [scanId, groupsFound, itemsFound, status, errorMessage]
    );
  }

  async cacheGroup(serviceId, group, libraryName, libraryType) {
    await query(
      `INSERT INTO plex_duplicates 
       (service_id, group_title, group_year, items, total_size, duplicate_count, 
        quality_analysis, suggestions, detection_method, library_name, library_type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (service_id, group_title, group_year) 
       DO UPDATE SET 
         items = EXCLUDED.items,
         total_size = EXCLUDED.total_size,
         duplicate_count = EXCLUDED.duplicate_count,
         quality_analysis = EXCLUDED.quality_analysis,
         suggestions = EXCLUDED.suggestions,
         detection_method = EXCLUDED.detection_method,
         library_name = EXCLUDED.library_name,
         library_type = EXCLUDED.library_type,
         last_scanned = NOW()`,
      [
        serviceId,
        group.title,
        group.year || null,
        JSON.stringify(group.items),
        group.totalSize || 0,
        group.duplicateCount,
        JSON.stringify(group.qualityAnalysis || {}),
        JSON.stringify(group.suggestions || {}),
        group.detectionMethod || 'manual',
        libraryName,
        libraryType
      ]
    );
  }

  // Method to trigger manual scan (for testing or user request)
  async runManualScan(serviceId) {
    if (this.isRunning) {
      return { success: false, error: 'Scan already running' };
    }

    try {
      const service = await ServiceRepository.getServiceWithCredentials(serviceId, 'plex');
      if (!service) {
        return { success: false, error: 'Service not found' };
      }

      console.log(`🔍 Manual scan requested for ${service.name}`);
      await this.scanService(service);
      return { success: true, message: 'Manual scan completed' };
    } catch (error) {
      console.error('Manual scan failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Get cached duplicates for fast display
  async getCachedDuplicates(serviceId) {
    try {
      const result = await query(
        `SELECT group_title, group_year, items, total_size, duplicate_count, 
                quality_analysis, suggestions, detection_method, library_name, library_type,
                last_scanned
         FROM plex_duplicates 
         WHERE service_id = $1 
         ORDER BY duplicate_count DESC, total_size DESC`,
        [serviceId]
      );

      const scanHistory = await query(
        'SELECT * FROM plex_scan_history WHERE service_id = $1 ORDER BY scan_started DESC LIMIT 1',
        [serviceId]
      );

      // Group by library
      const duplicatesByLibrary = {};
      let totalDuplicates = 0;

      result.rows.forEach(row => {
        const libraryName = row.library_name;
        
        if (!duplicatesByLibrary[libraryName]) {
          duplicatesByLibrary[libraryName] = {
            libraryType: row.library_type,
            duplicateGroups: [],
            totalGroups: 0,
            totalItems: 0
          };
        }

        const group = {
          title: row.group_title,
          year: row.group_year,
          items: JSON.parse(row.items || '[]'),
          totalSize: row.total_size,
          duplicateCount: row.duplicate_count,
          qualityAnalysis: JSON.parse(row.quality_analysis || '{}'),
          suggestions: JSON.parse(row.suggestions || '{}')
        };

        duplicatesByLibrary[libraryName].duplicateGroups.push(group);
        duplicatesByLibrary[libraryName].totalGroups++;
        duplicatesByLibrary[libraryName].totalItems += group.duplicateCount;
        totalDuplicates += group.duplicateCount;
      });

      return {
        success: true,
        totalDuplicates,
        libraryCount: Object.keys(duplicatesByLibrary).length,
        duplicatesByLibrary,
        scannedAt: result.rows[0]?.last_scanned || null,
        lastScanHistory: scanHistory.rows[0] || null,
        note: 'Results from cached 24-hour background scan'
      };

    } catch (error) {
      console.error('Error fetching cached duplicates:', error.message);
      return {
        success: false,
        error: error.message,
        totalDuplicates: 0,
        libraryCount: 0,
        duplicatesByLibrary: {}
      };
    }
  }
}

module.exports = new PlexDuplicateScheduler();