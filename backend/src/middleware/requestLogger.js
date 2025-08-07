/**
 * Request/Response Logging Middleware
 * Integrates with the enhanced logger system
 */

const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  // Skip logging for health checks and static assets
  if (req.url === '/api/health' || req.url.startsWith('/static/')) {
    return next();
  }

  const startTime = Date.now();
  
  // Log incoming request
  logger.request(req, 'Incoming request', {
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    bodySize: req.get('Content-Length')
  });

  // Capture original end method
  const originalEnd = res.end;
  
  // Override end method to log response
  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - startTime;
    res.locals.responseTime = responseTime;
    
    // Log outgoing response
    logger.response(req, res, 'Response sent', {
      responseTime: `${responseTime}ms`,
      contentLength: res.get('Content-Length')
    });
    
    // Log slow requests
    if (responseTime > 1000) {
      logger.warn('Slow request detected', {
        url: req.url,
        method: req.method,
        responseTime: `${responseTime}ms`,
        user: req.user?.username
      }, 'performance');
    }
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

module.exports = requestLogger;