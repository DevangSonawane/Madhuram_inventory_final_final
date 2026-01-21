import { Op } from 'sequelize';
import Notification from '../models/Notification.js';

/**
 * Get user notifications
 */
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?.user_id;
    const { read, limit = 50 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const whereClause = {
      user_id: userId
    };

    if (read !== undefined) {
      whereClause.is_read = read === 'true';
    }

    const notifications = await Notification.findAll({
      where: whereClause,
      limit: parseInt(limit),
      order: [['created_at', 'DESC']]
    });

    const unreadCount = await Notification.count({
      where: {
        user_id: userId,
        is_read: false
      }
    });

    res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark notification as read
 */
export const markNotificationRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.id || req.user?.user_id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const notification = await Notification.findOne({
      where: {
        notification_id: notificationId,
        user_id: userId
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
        code: 'NOTIFICATION_NOT_FOUND'
      });
    }

    await notification.update({
      is_read: true,
      read_at: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete notification
 */
export const deleteNotification = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.id || req.user?.user_id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const notification = await Notification.findOne({
      where: {
        notification_id: notificationId,
        user_id: userId
      }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
        code: 'NOTIFICATION_NOT_FOUND'
      });
    }

    await notification.destroy();

    res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create notification (helper function for other controllers)
 */
export const createNotification = async (userId, type, message, title = null, entityType = null, entityId = null) => {
  try {
    const notification = await Notification.create({
      user_id: userId,
      type,
      title,
      message,
      entity_type: entityType,
      entity_id: entityId,
      is_read: false
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};











