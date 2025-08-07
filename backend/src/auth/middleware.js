const authService = require('./authService');
const logger = require('../utils/logger');

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    // Always require authentication - no bypass mode for security

    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access token required',
        code: 'TOKEN_REQUIRED'
      });
    }

    // Verify token
    const decoded = authService.verifyToken(token);
    
    // Get fresh user data (in case role changed)
    const user = await authService.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.message === 'Invalid token') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }
    
    logger.error('Authentication middleware error', { error: error.message, url: req.url, method: req.method }, 'auth');
    return res.status(500).json({ 
      success: false, 
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

// Role-based authorization middleware
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const roleHierarchy = {
      'readonly': 1,
      'user': 2,
      'admin': 3
    };

    const userLevel = roleHierarchy[req.user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 999;

    if (userLevel < requiredLevel) {
      return res.status(403).json({ 
        success: false, 
        error: `${requiredRole} role required`,
        code: 'INSUFFICIENT_ROLE'
      });
    }

    next();
  };
};

// Permission-based authorization middleware
const requirePermission = (permission, resourceType = null) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    try {
      const hasPermission = await authService.hasPermission(req.user, permission, resourceType);
      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          error: `Permission '${permission}' required for ${resourceType || 'resource'}`,
          code: 'INSUFFICIENT_PERMISSION'
        });
      }

      next();
    } catch (error) {
      logger.error('Permission check error in middleware', { error: error.message, permission, resourceType, userId: req.user?.id }, 'auth');
      return res.status(500).json({ 
        success: false, 
        error: 'Permission check failed',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
};

// Service access middleware
const requireServiceAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  try {
    const serviceType = req.params.serviceType || 'service';
    const canAccess = await authService.canAccessService(req.user, serviceType);
    
    if (!canAccess) {
      return res.status(403).json({ 
        success: false, 
        error: 'Service access denied',
        code: 'SERVICE_ACCESS_DENIED'
      });
    }

    next();
  } catch (error) {
    logger.error('Service access check error', { error: error.message, serviceType: req.params.serviceType, userId: req.user?.id }, 'auth');
    return res.status(500).json({ 
      success: false, 
      error: 'Service access check failed',
      code: 'SERVICE_ACCESS_ERROR'
    });
  }
};

// Docker access middleware
const requireDockerAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  try {
    const canControlDocker = await authService.canControlDocker(req.user);
    
    if (!canControlDocker) {
      return res.status(403).json({ 
        success: false, 
        error: 'Docker access denied',
        code: 'DOCKER_ACCESS_DENIED'
      });
    }

    next();
  } catch (error) {
    logger.error('Docker access check error', { error: error.message, userId: req.user?.id }, 'auth');
    return res.status(500).json({ 
      success: false, 
      error: 'Docker access check failed',
      code: 'DOCKER_ACCESS_ERROR'
    });
  }
};

// Optional authentication (for public endpoints that benefit from user context)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = authService.verifyToken(token);
      const user = await authService.findUserById(decoded.id);
      if (user) {
        req.user = user;
      }
    }
  } catch (error) {
    // Ignore auth errors for optional auth
  }
  
  next();
};

// First-run setup middleware
const checkFirstRun = async (req, res, next) => {
  try {
    const isFirstRun = await authService.isFirstRun();
    if (isFirstRun) {
      // Allow access to setup endpoints only
      if (req.path === '/auth/setup' && req.method === 'POST') {
        return next();
      }
      
      return res.status(423).json({ 
        success: false, 
        error: 'First-time setup required',
        code: 'SETUP_REQUIRED',
        setupUrl: '/auth/setup'
      });
    }
    next();
  } catch (error) {
    logger.error('First run check error', { error: error.message }, 'auth');
    next();
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
  requireServiceAccess,
  requireDockerAccess,
  optionalAuth,
  checkFirstRun
};