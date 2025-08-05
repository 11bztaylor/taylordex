const express = require('express');
const router = express.Router();
const unraidService = require('./service');

// Get Unraid stats
router.get('/:id/stats', async (req, res) => {
  try {
    const { query } = require('../../database/connection');
    const serviceId = req.params.id;
    
    // Get service configuration
    const result = await query(
      'SELECT * FROM services WHERE id = $1 AND type = $2',
      [serviceId, 'unraid']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Unraid service not found'
      });
    }
    
    const service = result.rows[0];
    const stats = await unraidService.getStats(service);
    
    // Store stats in database
    await query(
      'INSERT INTO service_stats (service_id, stats) VALUES ($1, $2)',
      [serviceId, JSON.stringify(stats)]
    );
    
    res.json({
      success: true,
      service: service.name,
      stats
    });
  } catch (error) {
    console.error('Error getting Unraid stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test Unraid endpoints (debug)
router.get('/:id/test-endpoints', async (req, res) => {
  try {
    const { query } = require('../../database/connection');
    const serviceId = req.params.id;
    
    const result = await query(
      'SELECT * FROM services WHERE id = $1 AND type = $2',
      [serviceId, 'unraid']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Unraid service not found'
      });
    }
    
    const service = result.rows[0];
    const testResults = [];
    
    // Test basic connection
    console.log(`Testing Unraid connection to ${service.host}:${service.port}`);
    const connectionTest = await unraidService.testConnection(service);
    testResults.push({
      endpoint: 'Connection Test',
      url: `${service.host}:${service.port}/graphql`,
      status: connectionTest.success ? 'OK' : 'FAILED',
      details: connectionTest
    });
    
    // Test system info query
    try {
      const systemQuery = `
        query {
          info {
            os { platform version }
            cpu { cores model }
            memory { total used percent }
          }
        }
      `;
      
      const url = unraidService.buildUrl(service.host, service.port, '/graphql');
      const response = await unraidService.axios.post(url, 
        { query: systemQuery },
        { headers: unraidService.getHeaders(service) }
      );
      
      testResults.push({
        endpoint: 'System Info',
        url: url,
        status: response.data.errors ? 'PARTIAL' : 'OK',
        details: response.data.errors || 'System info retrieved successfully'
      });
    } catch (error) {
      testResults.push({
        endpoint: 'System Info',
        url: `${service.host}:${service.port}/graphql`,
        status: 'FAILED',
        details: error.message
      });
    }
    
    // Test array status query
    try {
      const arrayQuery = `
        query {
          array {
            status
            protection
            numDisks
            size
            used
            free
          }
        }
      `;
      
      const url = unraidService.buildUrl(service.host, service.port, '/graphql');
      const response = await unraidService.axios.post(url, 
        { query: arrayQuery },
        { headers: unraidService.getHeaders(service) }
      );
      
      testResults.push({
        endpoint: 'Array Status',
        url: url,
        status: response.data.errors ? 'PARTIAL' : 'OK',
        details: response.data.errors || 'Array status retrieved successfully'
      });
    } catch (error) {
      testResults.push({
        endpoint: 'Array Status',
        url: `${service.host}:${service.port}/graphql`,
        status: 'FAILED',
        details: error.message
      });
    }
    
    // Test Docker query
    try {
      const dockerQuery = `
        query {
          docker {
            containers {
              name
              status
              state
            }
          }
        }
      `;
      
      const url = unraidService.buildUrl(service.host, service.port, '/graphql');
      const response = await unraidService.axios.post(url, 
        { query: dockerQuery },
        { headers: unraidService.getHeaders(service) }
      );
      
      testResults.push({
        endpoint: 'Docker Containers',
        url: url,
        status: response.data.errors ? 'PARTIAL' : 'OK',
        details: response.data.errors || `Found ${response.data.data?.docker?.containers?.length || 0} containers`
      });
    } catch (error) {
      testResults.push({
        endpoint: 'Docker Containers',
        url: `${service.host}:${service.port}/graphql`,
        status: 'FAILED',
        details: error.message
      });
    }
    
    const summary = {
      total: testResults.length,
      passed: testResults.filter(t => t.status === 'OK').length,
      partial: testResults.filter(t => t.status === 'PARTIAL').length,
      failed: testResults.filter(t => t.status === 'FAILED').length
    };
    
    res.json({
      success: true,
      service: service.name,
      summary,
      results: testResults,
      recommendations: generateRecommendations(testResults)
    });
  } catch (error) {
    console.error('Error testing Unraid endpoints:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get Unraid system health
router.get('/:id/health', async (req, res) => {
  try {
    const { query } = require('../../database/connection');
    const serviceId = req.params.id;
    
    const result = await query(
      'SELECT * FROM services WHERE id = $1 AND type = $2',
      [serviceId, 'unraid']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Unraid service not found'
      });
    }
    
    const service = result.rows[0];
    
    // Quick health check query
    const healthQuery = `
      query {
        info {
          os { platform version }
          cpu { usage }
          memory { percent }
        }
        array {
          status
          protection
        }
        notifications {
          count
          unread
        }
      }
    `;
    
    const url = unraidService.buildUrl(service.host, service.port, '/graphql');
    const response = await unraidService.axios.post(url, 
      { query: healthQuery },
      { headers: unraidService.getHeaders(service) }
    );
    
    const data = response.data.data || {};
    const health = {
      status: 'healthy',
      checks: [],
      score: 100,
      lastCheck: new Date().toISOString()
    };
    
    // CPU usage check
    const cpuUsage = data.info?.cpu?.usage || 0;
    health.checks.push({
      name: 'CPU Usage',
      status: cpuUsage < 80 ? 'good' : cpuUsage < 95 ? 'warning' : 'critical',
      value: `${cpuUsage}%`,
      message: cpuUsage < 80 ? 'Normal' : 'High CPU usage detected'
    });
    
    // Memory usage check
    const memoryPercent = data.info?.memory?.percent || 0;
    health.checks.push({
      name: 'Memory Usage',
      status: memoryPercent < 80 ? 'good' : memoryPercent < 95 ? 'warning' : 'critical',
      value: `${memoryPercent}%`,
      message: memoryPercent < 80 ? 'Normal' : 'High memory usage detected'
    });
    
    // Array status check
    const arrayStatus = data.array?.status || 'unknown';
    health.checks.push({
      name: 'Array Status',
      status: arrayStatus === 'started' ? 'good' : arrayStatus === 'stopped' ? 'warning' : 'critical',
      value: arrayStatus,
      message: arrayStatus === 'started' ? 'Array is online' : 'Array issue detected'
    });
    
    // Notifications check
    const unreadNotifications = data.notifications?.unread || 0;
    health.checks.push({
      name: 'Notifications',
      status: unreadNotifications === 0 ? 'good' : unreadNotifications < 5 ? 'warning' : 'critical',
      value: unreadNotifications,
      message: unreadNotifications === 0 ? 'No unread notifications' : `${unreadNotifications} unread notifications`
    });
    
    // Calculate overall health score
    const criticalCount = health.checks.filter(c => c.status === 'critical').length;
    const warningCount = health.checks.filter(c => c.status === 'warning').length;
    
    if (criticalCount > 0) {
      health.status = 'critical';
      health.score = Math.max(0, 100 - (criticalCount * 30) - (warningCount * 10));
    } else if (warningCount > 0) {
      health.status = 'warning';
      health.score = Math.max(50, 100 - (warningCount * 15));
    }
    
    res.json({
      success: true,
      service: service.name,
      health
    });
  } catch (error) {
    console.error('Error getting Unraid health:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      health: {
        status: 'unknown',
        checks: [],
        score: 0,
        lastCheck: new Date().toISOString()
      }
    });
  }
});

function generateRecommendations(testResults) {
  const recommendations = [];
  
  const failedTests = testResults.filter(t => t.status === 'FAILED');
  const partialTests = testResults.filter(t => t.status === 'PARTIAL');
  
  if (failedTests.length > 0) {
    recommendations.push({
      type: 'error',
      title: 'Connection Issues Detected',
      message: 'Some API endpoints are not accessible. Check network connectivity and API key permissions.',
      action: 'Verify Unraid server is running and API is enabled'
    });
  }
  
  if (partialTests.length > 0) {
    recommendations.push({
      type: 'warning',
      title: 'Partial API Access',
      message: 'Some queries returned errors. Check API key permissions and Unraid version compatibility.',
      action: 'Review GraphQL errors and update API permissions if needed'
    });
  }
  
  if (failedTests.length === 0 && partialTests.length === 0) {
    recommendations.push({
      type: 'success',
      title: 'All Tests Passed',
      message: 'Unraid integration is working correctly.',
      action: 'No action needed'
    });
  }
  
  return recommendations;
}

module.exports = router;