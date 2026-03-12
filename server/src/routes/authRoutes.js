import express from 'express';
import { 
  createUser,
  signup, 
  login, 
  logout, 
  forgotPassword, 
  getAllUsers, 
  getUserById,
  updateUser, 
  deleteUser 
} from '../controllers/authController.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// AUTH APIs
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.post('/forgot-password', forgotPassword);

// USERS APIs
// Docs say: GET /api/auth/users
router.post('/users', authenticate, authorizeRoles('admin'), createUser);
router.get('/users', authenticate, authorizeRoles('admin'), getAllUsers);
router.get('/users/:id', authenticate, authorizeRoles('admin'), getUserById);
router.put('/users/:id', authenticate, authorizeRoles('admin'), updateUser);
router.delete('/users/:id', authenticate, authorizeRoles('admin'), deleteUser);

export default router;
