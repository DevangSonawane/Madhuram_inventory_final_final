import { validationResult } from 'express-validator';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg
      })),
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

/**
 * Middleware to parse items JSON string from FormData before validation
 */
export const parseInwardItems = (req, res, next) => {
  // Parse items if it's a JSON string (from FormData)
  if (req.body.items && typeof req.body.items === 'string') {
    try {
      req.body.items = JSON.parse(req.body.items);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid items format',
        code: 'VALIDATION_ERROR',
        errors: [{ field: 'items', message: 'Invalid items JSON format' }],
        timestamp: new Date().toISOString()
      });
    }
  }
  next();
};