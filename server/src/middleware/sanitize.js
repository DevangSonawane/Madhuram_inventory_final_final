/**
 * Input sanitization middleware
 * Sanitizes user inputs to prevent XSS attacks and data corruption
 */

/**
 * Sanitize string input
 * Removes potentially dangerous characters and trims whitespace
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .replace(/&lt;/g, '')
    .replace(/&gt;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
};

/**
 * Recursively sanitize object
 */
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Sanitize key as well
        const sanitizedKey = sanitizeString(key);
        sanitized[sanitizedKey] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
};

/**
 * Middleware to sanitize request body, query, and params
 * Note: This is a basic sanitization. express-validator provides more robust validation.
 */
export const sanitizeInput = (req, res, next) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    // Skip sanitization for FormData (file uploads)
    if (!(req.body instanceof FormData)) {
      req.body = sanitizeObject(req.body);
    }
  }
  
  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  // Sanitize route parameters (only string values)
  if (req.params && typeof req.params === 'object') {
    for (const key in req.params) {
      if (Object.prototype.hasOwnProperty.call(req.params, key) && typeof req.params[key] === 'string') {
        req.params[key] = sanitizeString(req.params[key]);
      }
    }
  }
  
  next();
};

/**
 * Sanitize specific fields in request body
 * Use this for fields that should allow HTML but need basic sanitization
 */
export const sanitizeFields = (fields) => {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      fields.forEach(field => {
        if (req.body[field] && typeof req.body[field] === 'string') {
          req.body[field] = sanitizeString(req.body[field]);
        }
      });
    }
    next();
  };
};
