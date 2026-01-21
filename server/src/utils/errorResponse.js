/**
 * Standardized error response utility
 * Ensures consistent error response format across all controllers
 */

/**
 * Create a standardized error response
 * @param {Object} options - Error response options
 * @param {string} options.message - Human-readable error message
 * @param {Array} options.errors - Array of field-specific errors
 * @param {string} options.code - Error code
 * @param {number} options.statusCode - HTTP status code
 * @returns {Object} Standardized error response object
 */
export const createErrorResponse = ({
  message = 'An error occurred',
  errors = [],
  code = 'ERROR',
  statusCode = 500
}) => {
  return {
    success: false,
    message,
    errors: Array.isArray(errors) ? errors : [],
    code,
    timestamp: new Date().toISOString(),
    statusCode
  };
};

/**
 * Create validation error response
 * @param {Array} validationErrors - Array of validation errors
 * @param {string} message - Optional custom message
 * @returns {Object} Validation error response
 */
export const createValidationErrorResponse = (validationErrors, message = 'Validation failed') => {
  const errors = validationErrors.map(err => ({
    field: err.field || err.path || 'unknown',
    message: err.message || 'Invalid value'
  }));

  return createErrorResponse({
    message,
    errors,
    code: 'VALIDATION_ERROR',
    statusCode: 400
  });
};

/**
 * Create not found error response
 * @param {string} resource - Resource name (e.g., 'Purchase Order', 'Material')
 * @param {string} id - Resource ID
 * @returns {Object} Not found error response
 */
export const createNotFoundErrorResponse = (resource = 'Resource', id = null) => {
  return createErrorResponse({
    message: `${resource}${id ? ` with ID ${id}` : ''} not found`,
    code: 'NOT_FOUND',
    statusCode: 404
  });
};

/**
 * Create unauthorized error response
 * @param {string} message - Optional custom message
 * @returns {Object} Unauthorized error response
 */
export const createUnauthorizedErrorResponse = (message = 'Unauthorized access') => {
  return createErrorResponse({
    message,
    code: 'UNAUTHORIZED',
    statusCode: 401
  });
};

/**
 * Create forbidden error response
 * @param {string} message - Optional custom message
 * @returns {Object} Forbidden error response
 */
export const createForbiddenErrorResponse = (message = 'Access forbidden') => {
  return createErrorResponse({
    message,
    code: 'FORBIDDEN',
    statusCode: 403
  });
};

/**
 * Create database error response
 * @param {Error} error - Database error object
 * @returns {Object} Database error response
 */
export const createDatabaseErrorResponse = (error) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return createErrorResponse({
    message: 'Database operation failed',
    errors: isDevelopment && error.message ? [{ message: error.message }] : [],
    code: 'DATABASE_ERROR',
    statusCode: 503
  });
};
