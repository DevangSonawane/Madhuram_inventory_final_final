import { Op } from 'sequelize';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';

/**
 * Get audit logs/history
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const { entityType, entityId, userId, startDate, endDate, action, page = 1, limit = 50 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const whereClause = {};

    if (entityType) {
      whereClause.entity_type = entityType;
    }

    if (entityId) {
      whereClause.entity_id = entityId;
    }

    if (userId) {
      whereClause.user_id = parseInt(userId);
    }

    if (action) {
      whereClause.action = action;
    }

    if (startDate && endDate) {
      whereClause.timestamp = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereClause.timestamp = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      whereClause.timestamp = {
        [Op.lte]: new Date(endDate)
      };
    }

    const { count, rows: auditLogs } = await AuditLog.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'employeCode'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['timestamp', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        auditLogs,
        pagination: {
          totalItems: count,
          totalPages: Math.ceil(count / parseInt(limit)),
          currentPage: parseInt(page),
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get entity-specific history
 * GET /api/inventory/history/:entityType/:entityId
 */
export const getEntityHistory = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: auditLogs } = await AuditLog.findAndCountAll({
      where: {
        entity_type: entityType,
        entity_id: entityId,
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'employeCode'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['timestamp', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        entityType,
        entityId,
        auditLogs,
        pagination: {
          totalItems: count,
          totalPages: Math.ceil(count / parseInt(limit)),
          currentPage: parseInt(page),
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create audit log entry (helper function for other controllers)
 */
export const createAuditLog = async (entityType, entityId, action, userId, changes = null, ipAddress = null, userAgent = null) => {
  try {
    const auditLog = await AuditLog.create({
      entity_type: entityType,
      entity_id: entityId,
      action,
      user_id: userId,
      changes,
      ip_address: ipAddress,
      user_agent: userAgent,
      timestamp: new Date()
    });
    return auditLog;
  } catch (error) {
    console.error('Error creating audit log:', error);
    return null;
  }
};
