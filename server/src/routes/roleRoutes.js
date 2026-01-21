import express from 'express';
import { body } from 'express-validator';
import Role from '../models/Role.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Apply rate limiting
const roleRateLimit = rateLimit({ windowMs: 60 * 1000, max: 30 }); // 30 requests per minute

// Validation rules
const createRoleValidation = [
  body().custom((value, { req }) => {
    if (!req.body || Object.keys(req.body).length === 0) {
      throw new Error('Request body cannot be empty');
    }
    return true;
  }),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Role name is required')
    .isLength({ max: 100 })
    .withMessage('Role name must not exceed 100 characters')
    .custom((value) => {
      if (value.trim().length === 0) {
        throw new Error('Role name cannot be only whitespace');
      }
      return true;
    }),
  body('description')
    .optional()
    .trim()
    .custom((value) => {
      if (value !== undefined && value !== null && value !== '') {
        if (value.length > 500) {
          throw new Error('Description must not exceed 500 characters');
        }
      }
      return true;
    })
];

router.post('/', 
  roleRateLimit,
  createRoleValidation,
  validate,
  async (req, res, next) => {
    try {
      const { name, description } = req.body;

      // Trim fields
      const trimmedName = name?.trim();
      const trimmedDescription = description?.trim() || null;

      // Check if role already exists
      const existing = await Role.findOne({ where: { name: trimmedName } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Role already exists',
          code: 'DUPLICATE_ROLE'
        });
      }

      const role = await Role.create({ 
        name: trimmedName, 
        description: trimmedDescription 
      });
      
      res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data: role
      });
    } catch (err) {
      next(err);
    }
});

router.get('/', roleRateLimit, async (req, res, next) => {
  try {
    const roles = await Role.findAll({
      attributes: ['id', 'name', 'description', 'is_active'],
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      data: roles
    });
  } catch (err) {
    next(err);
  }
});

export default router;
