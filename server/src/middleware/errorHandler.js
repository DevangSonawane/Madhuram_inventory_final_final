export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors,
      code: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Resource already exists',
      errors: [{
        field: err.errors[0]?.path,
        message: err.errors[0]?.message || 'This resource already exists'
      }],
      code: 'UNIQUE_CONSTRAINT_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  // Sequelize database connection error
  if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
    return res.status(503).json({
      success: false,
      message: 'Database connection error. Please try again later.',
      code: 'DATABASE_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  // Sequelize foreign key constraint error
  if (err.name === 'SequelizeForeignKeyConstraintError' || err.name === 'SequelizeDatabaseError') {
    // Check if it's a foreign key constraint error
    if (err.message && (
      err.message.includes('foreign key constraint') ||
      err.message.includes('Cannot add or update a child row') ||
      err.message.includes('a foreign key constraint fails')
    )) {
      // Extract more details from the error
      let detailedMessage = 'Cannot perform this operation due to related records';
      if (err.message.includes('created_by')) {
        detailedMessage = 'Invalid user ID for created_by field. The user does not exist.';
      } else if (err.message.includes('group_id')) {
        detailedMessage = 'Invalid group ID. The group does not exist.';
      } else if (err.message.includes('team_id')) {
        detailedMessage = 'Invalid team ID. The team does not exist.';
      } else if (err.message.includes('from_stock_area_id') || err.message.includes('stock_area')) {
        detailedMessage = 'Invalid stock area ID. The stock area does not exist.';
      } else if (err.message.includes('requestor_id')) {
        detailedMessage = 'Invalid requestor ID. The requestor does not exist.';
      }
      
      return res.status(400).json({
        success: false,
        message: detailedMessage,
        code: 'FOREIGN_KEY_ERROR',
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && { 
          originalError: err.message 
        })
      });
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
      timestamp: new Date().toISOString()
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
      code: 'TOKEN_EXPIRED',
      timestamp: new Date().toISOString()
    });
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size exceeds the maximum allowed size',
      code: 'FILE_TOO_LARGE',
      timestamp: new Date().toISOString()
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Too many files uploaded',
      code: 'TOO_MANY_FILES',
      timestamp: new Date().toISOString()
    });
  }

  // Default error
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    code: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err.name 
    })
  });
};

export const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
};