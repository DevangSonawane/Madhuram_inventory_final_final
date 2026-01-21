import Module from '../models/Module.js';
import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import { rateLimit } from '../middleware/rateLimit.js';

const ModuleRouter = express.Router();

// Apply authentication to all routes
ModuleRouter.use(authenticate);

// Apply rate limiting
const moduleRateLimit = rateLimit({ windowMs: 60 * 1000, max: 30 }); // 30 requests per minute

// Validation rules
const createModuleValidation = [
  body().custom((value, { req }) => {
    if (!req.body || Object.keys(req.body).length === 0) {
      throw new Error('Request body cannot be empty');
    }
    return true;
  }),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Module name is required')
    .isLength({ max: 100 })
    .withMessage('Module name must not exceed 100 characters')
    .custom((value) => {
      if (value.trim().length === 0) {
        throw new Error('Module name cannot be only whitespace');
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

ModuleRouter.post('/', 
  moduleRateLimit,
  createModuleValidation,
  validate,
  async (req, res, next) => {
    try {
      const { name, description } = req.body;

      // Trim fields
      const trimmedName = name?.trim();
      const trimmedDescription = description?.trim() || null;

      // Check if module already exists
      const existing = await Module.findOne({ where: { name: trimmedName } });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Module already exists',
          code: 'DUPLICATE_MODULE'
        });
      }

      const module = await Module.create({ 
        name: trimmedName, 
        description: trimmedDescription 
      });
      
      res.status(201).json({
        success: true,
        message: 'Module created successfully',
        data: module
      });
    } catch (err) {
      next(err);
    }
});

ModuleRouter.get('/', moduleRateLimit, async (req, res, next) => {
  try {
    const modules = await Module.findAll({
      attributes: ['id', 'name', 'description', 'is_active'],
      order: [['createdAt', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      data: modules
    });
  } catch (err) {
    next(err);
  }
});

export default ModuleRouter;
