import ReturnRecord from '../models/ReturnRecord.js';
import ReturnItem from '../models/ReturnItem.js';
import InventoryMaster from '../models/InventoryMaster.js';
import Material from '../models/Material.js';
import User from '../models/User.js';
import ConsumptionRecord from '../models/ConsumptionRecord.js';
import StockArea from '../models/StockArea.js';
// validationResult removed - using validate middleware in routes instead
import { Op } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * Create new return record
 * POST /api/v1/inventory/returns
 */
export const createReturn = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Validation is handled by validate middleware in route

    const {
      consumptionId,
      ticketId,
      technicianId,
      returnDate,
      reason,
      items, // Array of {materialId, inventoryMasterId, serialNumber, macId, quantity, remarks}
      remarks
    } = req.body;

    const userId = req.user?.id || req.user?.user_id;
    const targetTechnicianId = technicianId || userId;

    // Validate technician exists
    const technician = await User.findOne({
      where: req.withOrg
        ? req.withOrg({ id: targetTechnicianId, is_active: true })
        : { id: targetTechnicianId, is_active: true },
      transaction
    });

    if (!technician) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid technician',
        code: 'TECHNICIAN_NOT_FOUND'
      });
    }

    // Validate consumption if provided
    if (consumptionId) {
      const consumption = await ConsumptionRecord.findOne({
        where: req.withOrg
          ? req.withOrg({ consumption_id: consumptionId, is_active: true })
          : { consumption_id: consumptionId, is_active: true },
        transaction
      });

      if (!consumption) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid consumption record',
          code: 'CONSUMPTION_NOT_FOUND'
        });
      }
    }

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'At least one item is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Create return record
    const returnRecord = await ReturnRecord.create({
      consumption_id: consumptionId || null,
      ticket_id: ticketId || null,
      technician_id: targetTechnicianId,
      return_date: returnDate || new Date().toISOString().split('T')[0],
      reason: reason,
      remarks: remarks || null,
      status: 'PENDING',
      org_id: req.orgId || null,
      created_by: userId,
      updated_by: userId,
      is_active: true
    }, { transaction });

    // Create return items and validate inventory
    const createdItems = [];
    for (const item of items) {
      const { materialId, inventoryMasterId, serialNumber, macId, quantity, remarks: itemRemarks } = item;

      // Validate material exists
      const material = await Material.findOne({
        where: req.withOrg
          ? req.withOrg({ material_id: materialId, is_active: true })
          : { material_id: materialId, is_active: true },
        transaction
      });

      if (!material) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Material with ID ${materialId} not found`,
          code: 'MATERIAL_NOT_FOUND'
        });
      }

      const itemQuantity = parseInt(quantity) || 1;

      // If serialNumber provided, validate it's in technician's person stock
      if (serialNumber || inventoryMasterId) {
        const whereClause = {
          material_id: materialId,
          current_location_type: 'PERSON',
          location_id: targetTechnicianId.toString(),
          status: { [Op.ne]: 'CONSUMED' },
          is_active: true,
          ...(req.orgId ? { org_id: req.orgId } : {})
        };

        if (inventoryMasterId) {
          whereClause.id = inventoryMasterId;
        } else if (serialNumber) {
          whereClause.serial_number = serialNumber;
        }

        const inventoryItem = await InventoryMaster.findOne({
          where: whereClause,
          transaction
        });

        if (!inventoryItem) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Serial number ${serialNumber || inventoryMasterId} not found in technician's stock or already consumed`,
            code: 'INVENTORY_NOT_FOUND'
          });
        }

        // Create return item with inventory reference
        const returnItem = await ReturnItem.create({
          return_id: returnRecord.return_id,
          material_id: materialId,
          inventory_master_id: inventoryItem.id,
          serial_number: inventoryItem.serial_number,
          mac_id: inventoryItem.mac_id,
          quantity: 1, // Serialized items are always quantity 1
          remarks: itemRemarks || null
        }, { transaction });

        createdItems.push(returnItem);
      } else {
        // Bulk item: find items in technician's person stock
        const availableItems = await InventoryMaster.findAll({
          where: {
            material_id: materialId,
            current_location_type: 'PERSON',
            location_id: targetTechnicianId.toString(),
            status: { [Op.ne]: 'CONSUMED' },
            serial_number: null, // Bulk items don't have serial numbers
            is_active: true,
            ...(req.orgId ? { org_id: req.orgId } : {})
          },
          limit: itemQuantity,
          transaction
        });

        if (availableItems.length < itemQuantity) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Insufficient stock. Available: ${availableItems.length}, Requested: ${itemQuantity}`,
            code: 'INSUFFICIENT_STOCK'
          });
        }

        // Create return items for each bulk item
        for (const inventoryItem of availableItems) {
          const returnItem = await ReturnItem.create({
            return_id: returnRecord.return_id,
            material_id: materialId,
            inventory_master_id: inventoryItem.id,
            serial_number: null,
            mac_id: null,
            quantity: 1,
            remarks: itemRemarks || null
          }, { transaction });

          createdItems.push(returnItem);
        }
      }
    }

    await transaction.commit();

    // Fetch complete return record with items
    const completeReturn = await ReturnRecord.findOne({
      where: { return_id: returnRecord.return_id },
      include: [
        {
          model: ReturnItem,
          as: 'items',
          include: [
            {
              model: Material,
              as: 'material',
              attributes: ['material_id', 'material_name', 'product_code', 'material_type', 'uom']
            },
            {
              model: InventoryMaster,
              as: 'inventoryItem'
            }
          ]
        },
        {
          model: User,
          as: 'technician',
          attributes: ['id', 'name', 'email']
        },
        {
          model: ConsumptionRecord,
          as: 'consumptionRecord',
          required: false
        }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'Return record created successfully',
      data: completeReturn
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Get all return records with filtering and pagination
 * GET /api/v1/inventory/returns
 */
export const getAllReturns = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      technicianId = '',
      status = '',
      reason = '',
      dateFrom = '',
      dateTo = '',
      showInactive = false
    } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 50, 1);
    const offset = (pageNumber - 1) * limitNumber;

    const whereClause = req.withOrg ? req.withOrg({}) : {};

    if (!showInactive || showInactive === 'false') {
      whereClause.is_active = true;
    }

    if (technicianId) {
      whereClause.technician_id = technicianId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (reason) {
      whereClause.reason = reason;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      whereClause.return_date = {};
      if (dateFrom) {
        whereClause.return_date[Op.gte] = dateFrom;
      }
      if (dateTo) {
        whereClause.return_date[Op.lte] = dateTo;
      }
    }

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { ticket_id: { [Op.like]: `%${search}%` } },
        { remarks: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await ReturnRecord.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'technician',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: ReturnItem,
          as: 'items',
          include: [
            {
              model: Material,
              as: 'material',
              attributes: ['material_id', 'material_name', 'product_code']
            }
          ]
        }
      ],
      limit: limitNumber,
      offset: offset,
      order: [['return_date', 'DESC'], ['created_at', 'DESC']]
    });

    return res.status(200).json({
      success: true,
      data: {
        returns: rows,
        pagination: {
          total: count,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(count / limitNumber)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single return record by ID
 * GET /api/v1/inventory/returns/:id
 */
export const getReturnById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const returnRecord = await ReturnRecord.findOne({
      where: req.withOrg
        ? req.withOrg({ return_id: id, is_active: true })
        : { return_id: id, is_active: true },
      include: [
        {
          model: ReturnItem,
          as: 'items',
          include: [
            {
              model: Material,
              as: 'material',
              attributes: ['material_id', 'material_name', 'product_code', 'material_type', 'uom']
            },
            {
              model: InventoryMaster,
              as: 'inventoryItem'
            }
          ]
        },
        {
          model: User,
          as: 'technician',
          attributes: ['id', 'name', 'email', 'phoneNumber']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: ConsumptionRecord,
          as: 'consumptionRecord',
          required: false
        }
      ]
    });

    if (!returnRecord) {
      return res.status(404).json({
        success: false,
        message: 'Return record not found',
        code: 'RETURN_NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      data: { returnRecord }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve return record and transfer items back to warehouse
 * PUT /api/v1/inventory/returns/:id/approve
 */
export const approveReturn = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { stockAreaId, remarks: approvalRemarks } = req.body;

    const userId = req.user?.id || req.user?.user_id;

    // Find return record
    const returnRecord = await ReturnRecord.findOne({
      where: req.withOrg
        ? req.withOrg({
          return_id: id,
          status: 'PENDING',
          is_active: true
        })
        : {
          return_id: id,
          status: 'PENDING',
          is_active: true
        },
      include: [
        {
          model: ReturnItem,
          as: 'items',
          include: [
            {
              model: InventoryMaster,
              as: 'inventoryItem'
            }
          ]
        }
      ],
      transaction
    });

    if (!returnRecord) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Return record not found or already processed'
      });
    }

    // Validate stock area if provided
    let targetStockAreaId = stockAreaId;
    if (stockAreaId) {
      const stockArea = await StockArea.findOne({
        where: req.withOrg
          ? req.withOrg({ area_id: stockAreaId, is_active: true })
          : { area_id: stockAreaId, is_active: true },
        transaction
      });

      if (!stockArea) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid stock area',
          code: 'STOCK_AREA_NOT_FOUND'
        });
      }
    } else {
      // Use default stock area or first available
      const defaultStockArea = await StockArea.findOne({
        where: req.withOrg ? req.withOrg({ is_active: true }) : { is_active: true },
        transaction
      });

      if (!defaultStockArea) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'No stock area available. Please specify a stock area.',
          code: 'STOCK_AREA_NOT_FOUND'
        });
      }

      targetStockAreaId = defaultStockArea.area_id;
    }

    // Update return record status
    await returnRecord.update({
      status: 'APPROVED',
      approved_by: userId,
      approval_date: new Date(),
      remarks: approvalRemarks || returnRecord.remarks,
      updated_by: userId
    }, { transaction });

    // Update inventory_master records - move back to warehouse
    for (const returnItem of returnRecord.items) {
      if (returnItem.inventoryItem) {
        const newStatus = returnRecord.reason === 'FAULTY' ? 'FAULTY' : 'AVAILABLE';
        
        await returnItem.inventoryItem.update({
          current_location_type: 'WAREHOUSE',
          location_id: targetStockAreaId,
          status: newStatus,
          ticket_id: null // Remove ticket link
        }, { transaction });
      }
    }

    await transaction.commit();

    // Fetch updated return record
    const updatedReturn = await ReturnRecord.findOne({
      where: { return_id: id },
      include: [
        {
          model: ReturnItem,
          as: 'items',
          include: [
            {
              model: Material,
              as: 'material'
            },
            {
              model: InventoryMaster,
              as: 'inventoryItem'
            }
          ]
        },
        {
          model: User,
          as: 'technician',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Return approved and items transferred to warehouse',
      data: { returnRecord: updatedReturn }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Reject return record
 * PUT /api/v1/inventory/returns/:id/reject
 */
export const rejectReturn = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { remarks: rejectionRemarks } = req.body;

    const userId = req.user?.id || req.user?.user_id;

    // Find return record
    const returnRecord = await ReturnRecord.findOne({
      where: req.withOrg
        ? req.withOrg({
          return_id: id,
          status: 'PENDING',
          is_active: true
        })
        : {
          return_id: id,
          status: 'PENDING',
          is_active: true
        },
      transaction
    });

    if (!returnRecord) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Return record not found or already processed',
        code: 'RETURN_NOT_FOUND'
      });
    }

    // Update return record status
    await returnRecord.update({
      status: 'REJECTED',
      approved_by: userId,
      approval_date: new Date(),
      remarks: rejectionRemarks || returnRecord.remarks,
      updated_by: userId
    }, { transaction });

    await transaction.commit();

    // Fetch updated return record
    const updatedReturn = await ReturnRecord.findOne({
      where: { return_id: id },
      include: [
        {
          model: ReturnItem,
          as: 'items',
          include: [
            {
              model: Material,
              as: 'material'
            }
          ]
        },
        {
          model: User,
          as: 'technician',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Return rejected',
      data: { returnRecord: updatedReturn }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Get technician's items available for return (from person stock)
 * GET /api/v1/inventory/returns/available-items
 */
export const getAvailableItemsForReturn = async (req, res, next) => {
  try {
    const { technicianId, ticketId, materialId } = req.query;

    // If technicianId not provided, use authenticated user
    const targetTechnicianId = technicianId || req.user?.id || req.user?.user_id;

    if (!targetTechnicianId) {
      return res.status(400).json({
        success: false,
        message: 'Technician ID is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const whereClause = {
      current_location_type: 'PERSON',
      location_id: targetTechnicianId.toString(),
      status: { [Op.in]: ['AVAILABLE', 'IN_TRANSIT'] }, // Can return available or in-transit items
      is_active: true,
      ...(req.orgId ? { org_id: req.orgId } : {})
    };

    if (ticketId) {
      whereClause.ticket_id = ticketId;
    }

    if (materialId) {
      whereClause.material_id = materialId;
    }

    const items = await InventoryMaster.findAll({
      where: whereClause,
      include: [
        {
          model: Material,
          as: 'material',
          attributes: ['material_id', 'material_name', 'product_code', 'material_type', 'uom']
        }
      ],
      order: [['updated_at', 'DESC']]
    });

    // Group by material
    const groupedItems = items.reduce((acc, item) => {
      const key = item.material_id;
      if (!acc[key]) {
        acc[key] = {
          material: item.material,
          items: [],
          totalQuantity: 0
        };
      }
      acc[key].items.push(item);
      acc[key].totalQuantity += 1;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: {
        technicianId: targetTechnicianId,
        availableItems: Object.values(groupedItems),
        totalItems: items.length
      }
    });
  } catch (error) {
    next(error);
  }
};

