/**
 * Enhanced Logging Service with Environment Toggles
 * 
 * Environment Variables:
 * - LOG_LEVEL: debug|info|warn|error (default: info)
 * - DEBUG_MODE: true|false (enables verbose debugging)
 * - LOG_REQUESTS: true|false (enables request/response logging)
 * - LOG_DB_QUERIES: true|false (enables database query logging)
 * - LOG_AUTH: true|false (enables authentication logging)
 * - LOG_RBAC: true|false (enables RBAC decision logging)
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    // Log levels in order of severity
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    // Get configuration from environment
    this.currentLevel = this.levels[process.env.LOG_LEVEL?.toLowerCase()] ?? this.levels.info;
    this.debugMode = process.env.DEBUG_MODE?.toLowerCase() === 'true';
    this.logRequests = process.env.LOG_REQUESTS?.toLowerCase() === 'true';
    this.logDbQueries = process.env.LOG_DB_QUERIES?.toLowerCase() === 'true';
    this.logAuth = process.env.LOG_AUTH?.toLowerCase() === 'true';
    this.logRbac = process.env.LOG_RBAC?.toLowerCase() === 'true';

    // Create logs directory if it doesn't exist
    this.logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Initialize log files
    this.debugLogFile = path.join(this.logDir, 'debug.log');
    this.errorLogFile = path.join(this.logDir, 'error.log');
    this.auditLogFile = path.join(this.logDir, 'audit.log');

    console.log('🔧 Logger initialized:', {
      level: process.env.LOG_LEVEL || 'info',
      debugMode: this.debugMode,
      features: {
        requests: this.logRequests,
        dbQueries: this.logDbQueries,
        auth: this.logAuth,
        rbac: this.logRbac
      }
    });
  }

  // Core logging method
  log(level, message, context = {}, category = 'general') {
    const levelNum = this.levels[level];
    
    // Skip if below current log level
    if (levelNum < this.currentLevel) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      category,
      message,
      context: Object.keys(context).length > 0 ? context : undefined,
      pid: process.pid
    };

    // Format for console
    const consoleMessage = this.formatConsoleMessage(logEntry);
    
    // Output to console with colors
    this.outputToConsole(level, consoleMessage);

    // Write to log files
    this.writeToFile(level, logEntry);
  }

  // Convenience methods
  debug(message, context = {}, category = 'debug') {
    if (this.debugMode || this.currentLevel <= this.levels.debug) {
      this.log('debug', message, context, category);
    }
  }

  info(message, context = {}, category = 'info') {
    this.log('info', message, context, category);
  }

  warn(message, context = {}, category = 'warning') {
    this.log('warn', message, context, category);
  }

  error(message, context = {}, category = 'error') {
    this.log('error', message, context, category);
  }

  // Specialized logging methods
  request(req, message = 'Request received', context = {}) {
    if (!this.logRequests) return;

    this.log('info', message, {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('User-Agent'),
      user: req.user?.username,
      ...context
    }, 'request');
  }

  response(req, res, message = 'Response sent', context = {}) {
    if (!this.logRequests) return;

    this.log('info', message, {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      user: req.user?.username,
      responseTime: res.locals?.responseTime,
      ...context
    }, 'response');
  }

  dbQuery(query, duration, error = null, context = {}) {
    if (!this.logDbQueries) return;

    if (error) {
      this.log('error', 'Database query failed', {
        query: query.text || query,
        duration,
        error: error.message,
        code: error.code,
        ...context
      }, 'database');
    } else {
      this.log('debug', 'Database query executed', {
        query: query.text || query,
        duration,
        rows: context.rows,
        ...context
      }, 'database');
    }
  }

  auth(message, context = {}) {
    if (!this.logAuth) return;

    this.log('info', message, context, 'auth');
    
    // Also write to audit log for security events
    this.writeToFile('audit', {
      timestamp: new Date().toISOString(),
      event: 'auth',
      message,
      context
    });
  }

  rbac(user, resource, permission, granted, context = {}) {
    if (!this.logRbac) return;

    const message = `RBAC: ${granted ? 'GRANTED' : 'DENIED'} ${permission} on ${resource}`;
    
    this.log('debug', message, {
      user: user?.username || 'anonymous',
      userId: user?.id,
      role: user?.role,
      resource,
      permission,
      granted,
      ...context
    }, 'rbac');
  }

  security(event, message, context = {}) {
    this.log('warn', `SECURITY: ${event} - ${message}`, context, 'security');
    
    // Always write security events to audit log
    this.writeToFile('audit', {
      timestamp: new Date().toISOString(),
      event: 'security',
      type: event,
      message,
      context
    });
  }

  // Format console messages with emojis and colors
  formatConsoleMessage(logEntry) {
    const icons = {
      debug: '🐛',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌'
    };

    const categoryIcons = {
      request: '📥',
      response: '📤', 
      database: '💾',
      auth: '🔐',
      rbac: '🔒',
      security: '🚨',
      general: '📝'
    };

    const icon = icons[logEntry.level.toLowerCase()] || '📝';
    const categoryIcon = categoryIcons[logEntry.category] || '';
    
    let message = `${icon} ${categoryIcon} ${logEntry.message}`;
    
    if (logEntry.context) {
      const contextStr = Object.entries(logEntry.context)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(' ');
      message += ` [${contextStr}]`;
    }

    return message;
  }

  // Output to console with colors
  outputToConsole(level, message) {
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m'  // Red
    };
    const reset = '\x1b[0m';
    
    const color = colors[level] || '';
    console.log(`${color}${message}${reset}`);
  }

  // Write to log files
  writeToFile(level, logEntry) {
    const logLine = JSON.stringify(logEntry) + '\n';
    
    // Write to appropriate file
    try {
      if (level === 'error') {
        fs.appendFileSync(this.errorLogFile, logLine);
      }
      
      if (level === 'audit') {
        fs.appendFileSync(this.auditLogFile, logLine);
      }
      
      // Always write debug and above to debug file
      if (this.debugMode || level !== 'debug') {
        fs.appendFileSync(this.debugLogFile, logLine);
      }
    } catch (err) {
      console.error('Failed to write to log file:', err.message);
    }
  }

  // Utility: Create child logger with context
  child(defaultContext) {
    const parentLogger = this;
    return {
      debug: (msg, ctx = {}) => parentLogger.debug(msg, { ...defaultContext, ...ctx }),
      info: (msg, ctx = {}) => parentLogger.info(msg, { ...defaultContext, ...ctx }),
      warn: (msg, ctx = {}) => parentLogger.warn(msg, { ...defaultContext, ...ctx }),
      error: (msg, ctx = {}) => parentLogger.error(msg, { ...defaultContext, ...ctx }),
      request: (req, msg, ctx = {}) => parentLogger.request(req, msg, { ...defaultContext, ...ctx }),
      response: (req, res, msg, ctx = {}) => parentLogger.response(req, res, msg, { ...defaultContext, ...ctx }),
      auth: (msg, ctx = {}) => parentLogger.auth(msg, { ...defaultContext, ...ctx }),
      rbac: (user, resource, permission, granted, ctx = {}) => 
        parentLogger.rbac(user, resource, permission, granted, { ...defaultContext, ...ctx }),
      security: (event, msg, ctx = {}) => parentLogger.security(event, msg, { ...defaultContext, ...ctx })
    };
  }

  // Get current configuration
  getConfig() {
    return {
      logLevel: Object.keys(this.levels)[this.currentLevel],
      debugMode: this.debugMode,
      features: {
        requests: this.logRequests,
        dbQueries: this.logDbQueries,  
        auth: this.logAuth,
        rbac: this.logRbac
      },
      logFiles: {
        debug: this.debugLogFile,
        error: this.errorLogFile,
        audit: this.auditLogFile
      }
    };
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;