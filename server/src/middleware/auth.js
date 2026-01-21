import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
        code: 'TOKEN_REQUIRED'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Access token has expired. Please refresh your token or login again',
          code: 'TOKEN_EXPIRED'
        });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Token signature is invalid or tampered',
          code: 'INVALID_TOKEN'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        code: 'TOKEN_ERROR'
      });
    }

    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    // if (!roles.includes(req.user.role)) { //TODO- check on basis of roles
    //   return res.status(403).json({
    //     success: false,
    //     message: 'You do not have permission to perform this action'
    //   });
    // }
    next();
  };
};