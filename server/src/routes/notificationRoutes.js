import express from 'express';
import {
  getNotifications,
  markNotificationRead,
  deleteNotification
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get user notifications
router.get('/', getNotifications);

// Mark notification as read
router.patch('/:notificationId/read', markNotificationRead);

// Delete notification
router.delete('/:notificationId', deleteNotification);

export default router;
