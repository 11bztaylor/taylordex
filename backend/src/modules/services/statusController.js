const dataCollector = require('../../utils/dataCollector');
const { query } = require('../../database/connection');

class StatusController {
  async getComprehensiveStatus(req, res) {
    try {
      // Get all enabled services
      const servicesResult = await query(
        'SELECT * FROM services WHERE enabled = true ORDER BY name'
      );
      
      const services = servicesResult.rows;
      
      // Collect data from all services in parallel
      console.log(`Collecting comprehensive data from ${services.length} services...`);
      const collectedData = await dataCollector.collectAllServicesData(services);
      
      // Aggregate the data
      const aggregatedData = dataCollector.aggregateData(collectedData);
      
      // Add raw service data for detailed views
      aggregatedData.services = collectedData;
      
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        data: aggregatedData
      });
    } catch (error) {
      console.error('Error getting comprehensive status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getServiceHistory(req, res) {
    try {
      const { serviceId } = req.params;
      const { hours = 24 } = req.query;
      
      const result = await query(
        `SELECT stats, fetched_at 
         FROM service_stats 
         WHERE service_id = $1 
           AND fetched_at > NOW() - INTERVAL '${hours} hours'
         ORDER BY fetched_at DESC`,
        [serviceId]
      );
      
      res.json({
        success: true,
        serviceId,
        hours,
        history: result.rows
      });
    } catch (error) {
      console.error('Error getting service history:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new StatusController();
