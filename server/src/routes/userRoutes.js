import express from 'express';
import { body } from 'express-validator';
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
} from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';

const router = express.Router();

// Validation rules
const createUserValidation = [
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
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Valid email is required')
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters')
    .custom((value) => {
      if (value.trim().length === 0) {
        throw new Error('Email cannot be only whitespace');
      }
      return true;
    }),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
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
        if (value.length > 20) {
          throw new Error('Phone number must not exceed 20 characters');
        }
        if (!/^[0-9]{10,20}$/.test(value)) {
          throw new Error('Phone number must be 10-20 digits');
        }
      }
      return true;
    }),
  body('role').optional().isIn(['user', 'admin']).withMessage('Invalid role')
];

const updateUserValidation = [
  body('name')
    .optional()
    .trim()
    .custom((value) => {
      if (value !== undefined && value !== null && value !== '') {
        if (value.trim().length === 0) {
          throw new Error('Name cannot be empty or only whitespace');
        }
        if (value.length > 255) {
          throw new Error('Name must not exceed 255 characters');
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
          throw new Error('Email cannot be empty or only whitespace');
        }
        if (value.length > 255) {
          throw new Error('Email must not exceed 255 characters');
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          throw new Error('Valid email is required');
        }
      }
      return true;
    }),
  body('employeCode')
    .optional()
    .trim()
    .custom((value) => {
      if (value !== undefined && value !== null && value !== '') {
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
        if (value.length > 20) {
          throw new Error('Phone number must not exceed 20 characters');
        }
        if (!/^[0-9]{10,20}$/.test(value)) {
          throw new Error('Phone number must be 10-20 digits');
        }
      }
      return true;
    }),
  body('role').optional().isIn(['user', 'admin']).withMessage('Invalid role')
];

// All routes require authentication
router.use(authenticate);

// Routes
router.post('/', authorize('admin'), createUserValidation, validate, createUser);
router.get('/', authorize('admin'), getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', authorize('admin'), updateUserValidation, validate, updateUser);
router.delete('/:id', authorize('admin'), deleteUser);

export default router;