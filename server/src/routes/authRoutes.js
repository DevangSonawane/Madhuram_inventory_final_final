import express from 'express';
import { body } from 'express-validator';
import { 
  register, 
  login, 
  getProfile, 
  refreshAccessToken, 
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  updateProfile
} from '../controllers/authController.js';
import {
  getPreferences,
  updatePreferences
} from '../controllers/preferencesController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

// Apply stricter rate limiting to authentication endpoints
const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }); // 5 attempts per 15 minutes
const loginRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }); // 5 login attempts per 15 minutes

// Validation rules
const registerValidation = [
  // Check for empty body
  body().custom((value, { req }) => {
    if (!req.body || Object.keys(req.body).length === 0) {
      throw new Error('Request body cannot be empty');
    }
    return true;
  }),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 255 })
    .withMessage('Name must not exceed 255 characters')
    .custom((value) => {
      if (value.trim().length === 0) {
        throw new Error('Name cannot be only whitespace');
      }
      return true;
    }),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('employeCode')
    .optional()
    .trim()
    .custom((value) => {
      if (value !== undefined && value !== null && value !== '') {
        if (value.trim().length === 0) {
          throw new Error('Employee code cannot be only whitespace');
        }
        if (value.length > 50) {
          throw new Error('Employee code must not exceed 50 characters');
        }
      }
      return true;
    }),
  body('phoneNumber')
    .optional()
    .trim()
    .custom((value) => {
      if (value !== undefined && value !== null && value !== '') {
        if (value.trim().length === 0) {
          throw new Error('Phone number cannot be only whitespace');
        }
        if (!/^[0-9]{10,20}$/.test(value)) {
          throw new Error('Phone number must be 10-20 digits');
        }
      }
      return true;
    }),
  body('email')
    .optional()
    .trim()
    .custom((value) => {
      if (value !== undefined && value !== null && value !== '') {
        if (value.trim().length === 0) {
          throw new Error('Email cannot be only whitespace');
        }
        if (value.length > 255) {
          throw new Error('Email must not exceed 255 characters');
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          throw new Error('Valid email is required if provided');
        }
      }
      return true;
    }),
  body().custom((value, { req }) => {
    const hasEmployeCode = req.body.employeCode && req.body.employeCode.trim().length > 0;
    const hasPhoneNumber = req.body.phoneNumber && req.body.phoneNumber.trim().length > 0;
    const hasEmail = req.body.email && req.body.email.trim().length > 0;
    
    if (!hasEmployeCode && !hasPhoneNumber && !hasEmail) {
      throw new Error('At least one of employeCode, phoneNumber, or email is required');
    }
    return true;
  })
];

const loginValidation = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Email, employee code, or phone number is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .custom((value) => {
      // Allow unicode characters in password
      if (typeof value !== 'string') {
        throw new Error('Password must be a string');
      }
      return true;
    })
];

const forgotPasswordValidation = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Email, employee code, or phone number is required')
];

const refreshTokenValidation = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required')
];

const changePasswordValidation = [
  body('oldPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

const updateProfileValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('phoneNumber')
    .optional()
    .matches(/^[0-9]{10,15}$/)
    .withMessage('Phone number must be 10-15 digits'),
  body('employeCode')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Employee code cannot be empty if provided')
];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
];

// Routes with rate limiting
router.post('/register', authRateLimit, registerValidation, validate, register);
router.post('/login', loginRateLimit, loginValidation, validate, login);
router.post('/refresh', rateLimit({ windowMs: 60_000, max: 10 }), refreshTokenValidation, validate, refreshAccessToken);
router.post('/logout', authenticate, logout);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfileValidation, validate, updateProfile);
router.post('/change-password', authenticate, rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), changePasswordValidation, validate, changePassword);
router.post('/forgot-password', rateLimit({ windowMs: 60 * 60 * 1000, max: 3 }), forgotPasswordValidation, validate, forgotPassword);
router.post('/reset-password', rateLimit({ windowMs: 60 * 60 * 1000, max: 5 }), resetPasswordValidation, validate, resetPassword);
router.get('/preferences', authenticate, getPreferences);
router.put('/preferences', authenticate, updatePreferences);

export default router;