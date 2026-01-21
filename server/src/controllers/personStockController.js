import InventoryMaster from '../models/InventoryMaster.js';
import Material from '../models/Material.js';
import User from '../models/User.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * Get person stock (technician's assigned inventory)
 * GET /api/v1/inventory/person-stock
 */
export const getPersonStock = async (req, res, next) => {
  try {
    const {
      userId,
      ticketId,
      materialId,
      status = 'AVAILABLE,IN_TRANSIT', // Default: show available and in-transit items
      page = 1,
      limit = 50,
      orgId
    } = req.query;

    // If userId not provided, use authenticated user
    const targetUserId = userId || req.user?.id || req.user?.user_id;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 50, 1);
    const offset = (pageNumber - 1) * limitNumber;

    // Build where clause
    const whereClause = {
      current_location_type: 'PERSON',
      location_id: targetUserId.toString(),
      is_active: true
    };

    // Filter by status
    if (status) {
      const statusArray = status.split(',').map(s => s.trim());
      whereClause.status = { [Op.in]: statusArray };
    }

    // Filter by ticket
    if (ticketId) {
      whereClause.ticket_id = ticketId;
    }

    // Filter by material
    if (materialId) {
      whereClause.material_id = materialId;
    }

    // Filter by org
    if (orgId) {
      whereClause.org_id = orgId;
    }

    // Get person stock with material details
    const { count, rows } = await InventoryMaster.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Material,
          as: 'material',
          attributes: ['material_id', 'material_name', 'product_code', 'material_type', 'uom', 'properties']
        }
      ],
      limit: limitNumber,
      offset: offset,
      order: [['updated_at', 'DESC']]
    });

    // Group by ticket for summary
    const ticketSummary = await InventoryMaster.findAll({
      where: whereClause,
      attributes: [
        'ticket_id',
        [sequelize.fn('COUNT', sequelize.col('inventory_master.id')), 'item_count'],
        [sequelize.fn('COUNT', sequelize.literal('DISTINCT `inventory_master`.`material_id`')), 'material_count']
      ],
      group: ['ticket_id'],
      raw: true
    });

    return res.status(200).json({
      success: true,
      data: {
        items: rows,
        pagination: {
          total: count,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(count / limitNumber)
        },
        summary: {
          totalItems: count,
          ticketSummary: ticketSummary.map(t => ({
            ticketId: t.ticket_id,
            itemCount: parseInt(t.item_count) || 0,
            materialCount: parseInt(t.material_count) || 0
          }))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get person stock by ticket
 * GET /api/v1/inventory/person-stock/ticket/:ticketId
 */
export const getPersonStockByTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    const { userId, status, orgId } = req.query;

    // If userId not provided, use authenticated user
    const targetUserId = userId || req.user?.id || req.user?.user_id;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const whereClause = {
      current_location_type: 'PERSON',
      location_id: targetUserId.toString(),
      ticket_id: ticketId,
      is_active: true
    };

    if (status) {
      const statusArray = status.split(',').map(s => s.trim());
      whereClause.status = { [Op.in]: statusArray };
    }

    if (orgId) {
      whereClause.org_id = orgId;
    }

    const items = await InventoryMaster.findAll({
      where: whereClause,
      include: [
        {
          model: Material,
          as: 'material',
          attributes: ['material_id', 'material_name', 'product_code', 'material_type', 'uom', 'properties']
        }
      ],
      order: [['updated_at', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        ticketId,
        items,
        itemCount: items.length,
        materialCount: new Set(items.map(i => i.material_id)).size
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search person stock by serial number
 * GET /api/v1/inventory/person-stock/search
 */
export const searchPersonStockBySerial = async (req, res, next) => {
  try {
    const { serialNumber, userId, ticketId } = req.query;

    if (!serialNumber) {
      return res.status(400).json({
        success: false,
        message: 'Serial number is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // If userId not provided, use authenticated user
    const targetUserId = userId || req.user?.id || req.user?.user_id;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const whereClause = {
      current_location_type: 'PERSON',
      location_id: targetUserId.toString(),
      serial_number: serialNumber,
      status: { [Op.ne]: 'CONSUMED' },
      is_active: true
    };

    if (ticketId) {
      whereClause.ticket_id = ticketId;
    }

    const item = await InventoryMaster.findOne({
      where: whereClause,
      include: [
        {
          model: Material,
          as: 'material',
          attributes: ['material_id', 'material_name', 'product_code', 'material_type', 'uom', 'properties']
        }
      ]
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: `Serial number ${serialNumber} not found in your stock${ticketId ? ` for ticket ${ticketId}` : ''}`,
        code: 'ITEM_NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      data: item
    });
  } catch (error) {
    next(error);
  }
};

