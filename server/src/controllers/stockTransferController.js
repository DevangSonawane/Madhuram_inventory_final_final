import StockTransfer from '../models/StockTransfer.js';
import StockTransferItem from '../models/StockTransferItem.js';
import Material from '../models/Material.js';
import StockArea from '../models/StockArea.js';
import MaterialRequest from '../models/MaterialRequest.js';
import InventoryMaster from '../models/InventoryMaster.js';
import User from '../models/User.js';
// validationResult removed - using validate middleware in routes instead
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { generateST, generateSTSequential } from '../utils/slipGenerator.js';

/**
 * Create new stock transfer
 * POST /api/inventory/stock-transfer
 */
export const createStockTransfer = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Validation is handled by validate middleware in route

    const {
      fromStockAreaId,
      toStockAreaId,
      to_stock_area_id,
      from_stock_area_id,
      toUserId,
      to_user_id,
      ticketId,
      materialRequestId,
      transferDate,
      items,
      remarks
    } = req.body;

    const normalizedFromStockAreaId = fromStockAreaId || from_stock_area_id;
    const normalizedToStockAreaId = (toStockAreaId || to_stock_area_id || normalizedFromStockAreaId || '').trim();
    const normalizedToUserId = toUserId || to_user_id;

    const userId = req.user?.id || req.user?.user_id;

    // Validate source stock area
    const fromStockArea = await StockArea.findOne({
      where: req.withOrg
        ? req.withOrg({ area_id: fromStockAreaId, is_active: true })
        : { area_id: fromStockAreaId, is_active: true }
    });

    if (!fromStockArea) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid source stock area'
      });
    }

    // Validate destination: destination stock area is REQUIRED; destination user is OPTIONAL (can have both)
    let toStockArea = null;
    let toUser = null;

    // Allow sentinel values 'PERSON'/'VAN' to map to source area (satisfy NOT NULL)
    const resolvedToStockAreaId =
      normalizedToStockAreaId &&
      (normalizedToStockAreaId.toUpperCase() === 'PERSON' || normalizedToStockAreaId.toUpperCase() === 'VAN')
        ? normalizedFromStockAreaId
        : normalizedToStockAreaId || normalizedFromStockAreaId;

    toStockArea = await StockArea.findOne({
      where: req.withOrg
        ? req.withOrg({ area_id: resolvedToStockAreaId, is_active: true })
        : { area_id: resolvedToStockAreaId, is_active: true }
    });

    if (!toStockArea) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid destination stock area'
      });
    }

    // Only validate stock area comparison if transferring to another warehouse (not to a person)
    // When transferring to a person (toUserId is provided), to_stock_area_id may be the same
    // as from_stock_area_id due to database constraints, but it's still a valid transfer
    if (normalizedFromStockAreaId === resolvedToStockAreaId && !normalizedToUserId) {
      // For sentinel mapping it's expected; allow only when original sentinel used
      if (!(normalizedToStockAreaId && (normalizedToStockAreaId.toUpperCase() === 'PERSON' || normalizedToStockAreaId.toUpperCase() === 'VAN'))) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Source and destination stock areas cannot be the same'
        });
      }
    }
    
    // If transferring to a person, the to_stock_area_id can be the same as from_stock_area_id
    // This is allowed because the actual destination is the person (to_user_id), not the warehouse
    // The to_stock_area_id field is just a database constraint requirement

    if (normalizedToUserId) {
      toUser = await User.findOne({
        where: req.withOrg
          ? req.withOrg({ id: normalizedToUserId, is_active: true })
          : { id: normalizedToUserId, is_active: true }
      });

      if (!toUser) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid destination user'
        });
      }
    }

    // Decide where the inventory items will end up: either another warehouse or a person
    const destinationType = normalizedToUserId ? 'PERSON' : 'WAREHOUSE';
    const destinationId = normalizedToUserId ? normalizedToUserId : resolvedToStockAreaId;

    // Validate material request if provided
    if (materialRequestId) {
      const materialRequest = await MaterialRequest.findOne({
        where: req.withOrg
          ? req.withOrg({ request_id: materialRequestId, is_active: true })
          : { request_id: materialRequestId, is_active: true }
      });

      if (!materialRequest) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid material request'
        });
      }
    }

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'At least one item is required'
      });
    }

    // Use provided slip/transfer number if given, else generate sequential
    let transferNumber = req.body.transferNumber || req.body.slipNumber;
    if (!transferNumber) {
      // Generate sequential ST number: ST-MONTH-YEAR-NUMBER
      transferNumber = await generateSTSequential(StockTransfer);
    } else {
      // Validate uniqueness if provided
      const existing = await StockTransfer.findOne({
        where: req.withOrg
          ? req.withOrg({ transfer_number: transferNumber })
          : { transfer_number: transferNumber }
      });
      if (existing) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Slip number already exists'
        });
      }
    }

    // Create stock transfer
    const stockTransfer = await StockTransfer.create({
      from_stock_area_id: fromStockAreaId,
      to_stock_area_id: resolvedToStockAreaId, // required (handles sentinel)
      to_user_id: normalizedToUserId || null, // optional
      ticket_id: ticketId || null,
      material_request_id: materialRequestId || null,
      transfer_date: transferDate || new Date().toISOString().split('T')[0],
      transfer_number: transferNumber,
      status: 'DRAFT',
      remarks: remarks || null,
      org_id: req.orgId || null,
      created_by: userId,
      updated_by: userId,
      is_active: true
    }, { transaction });

    // Create transfer items and update inventory_master
    const createdItems = [];
    for (const item of items) {
      const { materialId, quantity, serialNumbers, remarks: itemRemarks } = item;

      // Validate material exists
      const material = await Material.findOne({
        where: req.withOrg
          ? req.withOrg({ material_id: materialId, is_active: true })
          : { material_id: materialId, is_active: true }
      });

      if (!material) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Material with ID ${materialId} not found`
        });
      }

      const itemQuantity = parseInt(quantity) || 1;
      const transferItem = await StockTransferItem.create({
        transfer_id: stockTransfer.transfer_id,
        material_id: materialId,
        quantity: itemQuantity,
        serial_numbers: serialNumbers || null,
        remarks: itemRemarks || null
      }, { transaction });

      createdItems.push(transferItem);

      // Update inventory_master records
      if (serialNumbers && Array.isArray(serialNumbers) && serialNumbers.length > 0) {
        // Serialized items: Update specific serial numbers
        for (const serialNumber of serialNumbers) {
          const inventoryItem = await InventoryMaster.findOne({
            where: {
              serial_number: serialNumber,
              material_id: materialId,
              current_location_type: 'WAREHOUSE',
              location_id: fromStockAreaId,
              status: 'AVAILABLE',
              is_active: true,
              ...(req.orgId ? { org_id: req.orgId } : {})
            },
            transaction
          });

          if (!inventoryItem) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: `Serial number ${serialNumber} not found in source warehouse or not available`
            });
          }

          // Update inventory_master location
          await inventoryItem.update({
            current_location_type: destinationType,
            location_id: destinationId,
            ticket_id: ticketId || null,
            status: destinationType === 'PERSON' ? 'IN_TRANSIT' : 'AVAILABLE'
          }, { transaction });
        }
      } else {
        // Bulk items: Update quantity number of items from source warehouse
        const availableItems = await InventoryMaster.findAll({
          where: {
            material_id: materialId,
            current_location_type: 'WAREHOUSE',
            location_id: fromStockAreaId,
            status: 'AVAILABLE',
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
            message: `Insufficient stock. Available: ${availableItems.length}, Requested: ${itemQuantity}`
          });
        }

        // Update each item
        for (const inventoryItem of availableItems) {
          await inventoryItem.update({
            current_location_type: destinationType,
            location_id: destinationId,
            ticket_id: ticketId || null,
            status: destinationType === 'PERSON' ? 'IN_TRANSIT' : 'AVAILABLE'
          }, { transaction });
        }
      }
    }

    await transaction.commit();

    // Fetch complete transfer with items
    const completeTransfer = await StockTransfer.findOne({
      where: { transfer_id: stockTransfer.transfer_id },
      include: [
        {
          model: StockTransferItem,
          as: 'items',
          include: [
            {
              model: Material,
              as: 'material'
            }
          ]
        },
        {
          model: StockArea,
          as: 'fromStockArea',
          attributes: ['area_id', 'area_name', 'location_code']
        },
        {
          model: StockArea,
          as: 'toStockArea',
          attributes: ['area_id', 'area_name', 'location_code']
        },
        {
          model: MaterialRequest,
          as: 'materialRequest',
          attributes: ['request_id', 'status']
        }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'Stock transfer created successfully',
      data: completeTransfer
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Get all stock transfers with filtering and pagination
 * GET /api/inventory/stock-transfer
 */
export const getAllStockTransfers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      fromStockAreaId = '',
      toStockAreaId = '',
      status = '',
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

    if (fromStockAreaId) {
      whereClause.from_stock_area_id = fromStockAreaId;
    }

    if (toStockAreaId) {
      whereClause.to_stock_area_id = toStockAreaId;
    }

    if (status) {
      whereClause.status = status;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      whereClause.transfer_date = {};
      if (dateFrom) {
        whereClause.transfer_date[Op.gte] = dateFrom;
      }
      if (dateTo) {
        whereClause.transfer_date[Op.lte] = dateTo;
      }
    }

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { transfer_number: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: transfers } = await StockTransfer.findAndCountAll({
      where: whereClause,
      limit: limitNumber,
      offset: offset,
      order: [['transfer_date', 'DESC'], ['created_at', 'DESC']],
      include: [
        {
          model: StockArea,
          as: 'fromStockArea',
          attributes: ['area_id', 'area_name', 'location_code']
        },
        {
          model: StockArea,
          as: 'toStockArea',
          attributes: ['area_id', 'area_name', 'location_code']
        }
      ],
      distinct: true,
    });

    const totalTransfers = typeof count === 'number' ? count : 0;

    return res.status(200).json({
      success: true,
      data: {
        transfers,
        pagination: {
          currentPage: pageNumber,
          totalPages: limitNumber ? Math.max(Math.ceil(totalTransfers / limitNumber), 1) : 1,
          totalItems: totalTransfers,
          itemsPerPage: limitNumber
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single stock transfer by ID
 * GET /api/inventory/stock-transfer/:id
 */
export const getStockTransferById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const transfer = await StockTransfer.findOne({
      where: req.withOrg
        ? req.withOrg({
          transfer_id: id,
          is_active: true
        })
        : {
          transfer_id: id,
          is_active: true
        },
      include: [
        {
          model: StockTransferItem,
          as: 'items',
          include: [
            {
              model: Material,
              as: 'material'
            }
          ]
        },
        {
          model: StockArea,
          as: 'fromStockArea'
        },
        {
          model: StockArea,
          as: 'toStockArea'
        },
        {
          model: MaterialRequest,
          as: 'materialRequest'
        }
      ]
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Stock transfer not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: transfer
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update stock transfer
 * PUT /api/inventory/stock-transfer/:id
 */
export const updateStockTransfer = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Validation is handled by validate middleware in route

    const { id } = req.params;
    const {
      fromStockAreaId,
      toStockAreaId,
      materialRequestId,
      transferDate,
      status,
      items,
      remarks
    } = req.body;

    const userId = req.user?.id || req.user?.user_id;

    const transfer = await StockTransfer.findOne({
      where: req.withOrg
        ? req.withOrg({
          transfer_id: id,
          is_active: true
        })
        : {
          transfer_id: id,
          is_active: true
        }
    }, { transaction });

    if (!transfer) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Stock transfer not found',
        code: 'STOCK_TRANSFER_NOT_FOUND'
      });
    }

    // Validate stock areas if provided
    // Only validate if not transferring to a person (to_user_id takes precedence)
    const toUserId = req.body.toUserId || req.body.to_user_id || transfer.to_user_id;
    
    if (fromStockAreaId || toStockAreaId) {
      const finalFromId = fromStockAreaId || transfer.from_stock_area_id;
      const finalToId = toStockAreaId || transfer.to_stock_area_id;

      // Only check stock area comparison if NOT transferring to a person
      // When transferring to a person, to_stock_area_id may be the same as from_stock_area_id
      // but it's still valid because the actual destination is the person
      if (finalFromId === finalToId && !toUserId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Source and destination stock areas cannot be the same',
          code: 'VALIDATION_ERROR'
        });
      }
    }

    // Update transfer
    await transfer.update({
      from_stock_area_id: fromStockAreaId || transfer.from_stock_area_id,
      to_stock_area_id: toStockAreaId || transfer.to_stock_area_id,
      to_user_id: req.body.toUserId !== undefined ? req.body.toUserId : transfer.to_user_id,
      material_request_id: materialRequestId !== undefined ? materialRequestId : transfer.material_request_id,
      transfer_date: transferDate || transfer.transfer_date,
      status: status || transfer.status,
      remarks: remarks !== undefined ? remarks : transfer.remarks,
      updated_by: userId
    }, { transaction });

    // Update items if provided
    if (items && Array.isArray(items)) {
      await StockTransferItem.destroy({
        where: { transfer_id: id },
        transaction
      });

      for (const item of items) {
        const { materialId, quantity, serialNumbers, remarks: itemRemarks } = item;

        const material = await Material.findOne({
          where: req.withOrg
            ? req.withOrg({ material_id: materialId, is_active: true })
            : { material_id: materialId, is_active: true }
        });

        if (!material) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Material with ID ${materialId} not found`,
            code: 'MATERIAL_NOT_FOUND'
          });
        }

        await StockTransferItem.create({
          transfer_id: id,
          material_id: materialId,
          quantity: parseInt(quantity) || 1,
          serial_numbers: serialNumbers || null,
          remarks: itemRemarks || null
        }, { transaction });
      }
    }

    await transaction.commit();

    const updatedTransfer = await StockTransfer.findOne({
      where: { transfer_id: id },
      include: [
        {
          model: StockTransferItem,
          as: 'items',
          include: [
            {
              model: Material,
              as: 'material'
            }
          ]
        }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Stock transfer updated successfully',
      data: updatedTransfer
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Delete stock transfer (soft delete)
 * DELETE /api/inventory/stock-transfer/:id
 */
export const deleteStockTransfer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.user_id;

    const transfer = await StockTransfer.findOne({
      where: req.withOrg
        ? req.withOrg({
          transfer_id: id,
          is_active: true
        })
        : {
          transfer_id: id,
          is_active: true
        }
    });

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Stock transfer not found'
      });
    }

    await transfer.update({
      is_active: false,
      updated_by: userId
    });

    return res.status(200).json({
      success: true,
      message: 'Stock transfer deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};










