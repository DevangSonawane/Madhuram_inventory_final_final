import express from 'express';
import { 
  signup, 
  login, 
  logout, 
  forgotPassword, 
  getAllUsers, 
  updateUser, 
  deleteUser 
} from '../controllers/authController.js';

const router = express.Router();

// AUTH APIs
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);

// USERS APIs
// Docs say: GET /api/auth/users
router.get('/users', getAllUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

export default router;
