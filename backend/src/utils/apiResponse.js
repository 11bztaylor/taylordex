/**
 * Standardized API Response Utility
 * Ensures consistent response format across all endpoints
 */

class ApiResponse {
  /**
   * Success response
   * @param {*} data - The response data
   * @param {string} message - Success message (optional)
   * @param {object} meta - Additional metadata (optional)
   * @returns {object} Standardized success response
   */
  static success(data, message = 'Success', meta = {}) {
    return {
      success: true,
      data,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };
  }

  /**
   * Error response
   * @param {string} message - Error message
   * @param {string} code - Error code (optional)
   * @param {number} statusCode - HTTP status code (optional)
   * @param {*} details - Additional error details (optional)
   * @returns {object} Standardized error response
   */
  static error(message, code = 'ERROR', statusCode = 500, details = null) {
    const response = {
      success: false,
      error: {
        message,
        code,
        timestamp: new Date().toISOString()
      }
    };

    if (details && process.env.NODE_ENV !== 'production') {
      response.error.details = details;
    }

    // Add statusCode for middleware to use
    response.statusCode = statusCode;
    
    return response;
  }

  /**
   * Validation error response
   * @param {array|object} errors - Validation errors
   * @param {string} message - Main error message (optional)
   * @returns {object} Standardized validation error response
   */
  static validationError(errors, message = 'Validation failed') {
    return {
      success: false,
      error: {
        message,
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString(),
        details: errors
      },
      statusCode: 400
    };
  }

  /**
   * Not found error response
   * @param {string} resource - What resource was not found
   * @returns {object} Standardized not found response
   */
  static notFound(resource = 'Resource') {
    return {
      success: false,
      error: {
        message: `${resource} not found`,
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString()
      },
      statusCode: 404
    };
  }

  /**
   * Unauthorized error response
   * @param {string} message - Error message (optional)
   * @returns {object} Standardized unauthorized response
   */
  static unauthorized(message = 'Authentication required') {
    return {
      success: false,
      error: {
        message,
        code: 'UNAUTHORIZED',
        timestamp: new Date().toISOString()
      },
      statusCode: 401
    };
  }

  /**
   * Forbidden error response
   * @param {string} message - Error message (optional)
   * @returns {object} Standardized forbidden response
   */
  static forbidden(message = 'Access denied') {
    return {
      success: false,
      error: {
        message,
        code: 'FORBIDDEN',
        timestamp: new Date().toISOString()
      },
      statusCode: 403
    };
  }

  /**
   * Too many requests error response
   * @param {string} message - Error message (optional)
   * @returns {object} Standardized rate limit response
   */
  static tooManyRequests(message = 'Too many requests') {
    return {
      success: false,
      error: {
        message,
        code: 'TOO_MANY_REQUESTS',
        timestamp: new Date().toISOString()
      },
      statusCode: 429
    };
  }

  /**
   * Service unavailable error response
   * @param {string} service - Service name (optional)
   * @returns {object} Standardized service unavailable response
   */
  static serviceUnavailable(service = 'Service') {
    return {
      success: false,
      error: {
        message: `${service} is temporarily unavailable`,
        code: 'SERVICE_UNAVAILABLE',
        timestamp: new Date().toISOString()
      },
      statusCode: 503
    };
  }

  /**
   * Paginated success response
   * @param {array} data - The data array
   * @param {number} page - Current page
   * @param {number} limit - Items per page
   * @param {number} total - Total count
   * @param {string} message - Success message (optional)
   * @returns {object} Standardized paginated response
   */
  static paginated(data, page, limit, total, message = 'Success') {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      success: true,
      data,
      message,
      meta: {
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext,
          hasPrev
        },
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Express middleware to send standardized responses
 * Adds helper methods to the response object
 */
function addResponseHelpers(req, res, next) {
  // Success response
  res.success = (data, message, meta) => {
    const response = ApiResponse.success(data, message, meta);
    return res.json(response);
  };

  // Error response
  res.error = (message, code, statusCode, details) => {
    const response = ApiResponse.error(message, code, statusCode, details);
    return res.status(response.statusCode).json(response);
  };

  // Validation error
  res.validationError = (errors, message) => {
    const response = ApiResponse.validationError(errors, message);
    return res.status(response.statusCode).json(response);
  };

  // Not found
  res.notFound = (resource) => {
    const response = ApiResponse.notFound(resource);
    return res.status(response.statusCode).json(response);
  };

  // Unauthorized
  res.unauthorized = (message) => {
    const response = ApiResponse.unauthorized(message);
    return res.status(response.statusCode).json(response);
  };

  // Forbidden
  res.forbidden = (message) => {
    const response = ApiResponse.forbidden(message);
    return res.status(response.statusCode).json(response);
  };

  // Service unavailable
  res.serviceUnavailable = (service) => {
    const response = ApiResponse.serviceUnavailable(service);
    return res.status(response.statusCode).json(response);
  };

  next();
}

module.exports = {
  ApiResponse,
  addResponseHelpers
};