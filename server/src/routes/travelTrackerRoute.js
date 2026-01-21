import express from 'express';
import {
  createOrUpdateTravel,
  getAllTravels,
  getMonthlyTravels,
  getAllExecutives,
  getEmployeeTravelHistory,
} from '../controllers/travelTracker.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ➕ Add travel record
router.post('/', authenticate, createOrUpdateTravel);

// 📜 Get all travel records
router.get('/', authenticate, getAllTravels);

// 📅 Get month-wise travel records
router.get('/monthwise', authenticate, getMonthlyTravels);

// 👥 Get all executives who added records
router.get('/executives', authenticate, getAllExecutives);

// 👤 Get specific employee travel history
router.get('/employee/:user_id', authenticate, getEmployeeTravelHistory);

export default router;
