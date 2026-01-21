import ConsumptionRecord from '../models/ConsumptionRecord.js';
import ConsumptionItem from '../models/ConsumptionItem.js';
import Material from '../models/Material.js';
import StockArea from '../models/StockArea.js';
import InventoryMaster from '../models/InventoryMaster.js';
// validationResult removed - using validate middleware in routes instead
import { Op } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * Create new consumption record
 * POST /api/inventory/consumption
 */
export const createConsumption = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Validation is handled by validate middleware in route

    const {
      externalSystemRefId,
      ticketId, // New: Link to ticket
      customerData, // JSON object with customer details
      consumptionDate,
      stockAreaId,
      fromUserId, // New: If consuming from person stock
      items, // Array of {materialId, quantity, serialNumber, remarks}
      remarks
    } = req.body;

    const userId = req.user?.id || req.user?.user_id;

    // Validate stock area if provided
    if (stockAreaId) {
      const stockArea = await StockArea.findOne({
        where: req.withOrg
          ? req.withOrg({ area_id: stockAreaId, is_active: true })
          : { area_id: stockAreaId, is_active: true }
      });

      if (!stockArea) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid stock area'
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

    // Create consumption record
    const consumptionRecord = await ConsumptionRecord.create({
      external_system_ref_id: externalSystemRefId,
      ticket_id: ticketId || null,
      customer_data: customerData || null,
      consumption_date: consumptionDate || new Date().toISOString().split('T')[0],
      stock_area_id: stockAreaId || null,
      remarks: remarks || null,
      org_id: req.orgId || null,
      created_by: userId,
      is_active: true
    }, { transaction });

    // Create consumption items and update inventory_master
    const createdItems = [];
    for (const item of items) {
      const { materialId, quantity, serialNumber, remarks: itemRemarks } = item;

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
      const consumptionItem = await ConsumptionItem.create({
        consumption_id: consumptionRecord.consumption_id,
        material_id: materialId,
        quantity: itemQuantity,
        serial_number: serialNumber || null,
        remarks: itemRemarks || null
      }, { transaction });

      createdItems.push(consumptionItem);

      // Update inventory_master records
      if (serialNumber) {
        // Serialized item: Find and mark as consumed
        const whereClause = {
          serial_number: serialNumber,
          material_id: materialId,
          status: { [Op.ne]: 'CONSUMED' } // Not already consumed
        };

        // If consuming from person stock, validate it's in their stock
        if (fromUserId) {
          whereClause.current_location_type = 'PERSON';
          whereClause.location_id = fromUserId.toString();
          whereClause.ticket_id = ticketId || { [Op.ne]: null }; // Should be linked to ticket
        } else if (stockAreaId) {
          // Consuming from warehouse
          whereClause.current_location_type = 'WAREHOUSE';
          whereClause.location_id = stockAreaId;
        }

        const inventoryItem = await InventoryMaster.findOne({
          where: {
            ...whereClause,
            is_active: true,
            ...(req.orgId ? { org_id: req.orgId } : {})
          },
          transaction
        });

        if (!inventoryItem) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Serial number ${serialNumber} not found in ${fromUserId ? 'person stock' : 'warehouse'} or already consumed`
          });
        }

        // Mark as consumed
        await inventoryItem.update({
          current_location_type: 'CONSUMED',
          location_id: null,
          status: 'CONSUMED',
          ticket_id: ticketId || inventoryItem.ticket_id // Keep ticket_id if already set
        }, { transaction });
      } else {
        // Bulk item: Find and mark quantity number of items as consumed
        let availableItems = [];
        
        // Debug logging
        console.log(`[Consumption] Processing bulk item: materialId=${materialId}, quantity=${itemQuantity}, fromUserId=${fromUserId}, stockAreaId=${stockAreaId}`);
        
        // Build base where clause
        // Note: orgContext middleware is designed to show all records regardless of org_id
        // So we don't filter by org_id here to ensure backward compatibility with null org_id records
        const baseWhere = {
          material_id: materialId,
          serial_number: null, // Bulk items don't have serial numbers
          status: { [Op.ne]: 'CONSUMED' },
          is_active: true
          // Intentionally NOT filtering by org_id to match orgContext middleware behavior
        };
        
        // Strategy: Try person stock first (if fromUserId provided), then fall back to warehouse stock
        if (fromUserId) {
          // First, try to consume from person stock
          const personStockItems = await InventoryMaster.findAll({
            where: {
              ...baseWhere,
              current_location_type: 'PERSON',
              location_id: fromUserId.toString()
            },
            limit: itemQuantity,
            transaction
          });
          
          availableItems = personStockItems;
          
          // If insufficient in person stock, try warehouse stock (if stockAreaId provided)
          if (availableItems.length < itemQuantity && stockAreaId) {
            const warehouseItems = await InventoryMaster.findAll({
              where: {
                ...baseWhere,
                current_location_type: 'WAREHOUSE',
                location_id: stockAreaId
              },
              limit: itemQuantity - availableItems.length, // Only get what we still need
              transaction
            });
            
            availableItems = [...availableItems, ...warehouseItems];
          }
          
          // If still insufficient and no stockAreaId, try any warehouse (fallback)
          if (availableItems.length < itemQuantity && !stockAreaId) {
            const anyWarehouseItems = await InventoryMaster.findAll({
              where: {
                ...baseWhere,
                current_location_type: 'WAREHOUSE'
              },
              limit: itemQuantity - availableItems.length,
              transaction
            });
            
            availableItems = [...availableItems, ...anyWarehouseItems];
          }
        } else if (stockAreaId) {
          // Consuming from warehouse only
          availableItems = await InventoryMaster.findAll({
            where: {
              ...baseWhere,
              current_location_type: 'WAREHOUSE',
              location_id: stockAreaId
            },
            limit: itemQuantity,
            transaction
          });
        } else {
          // No specific location - try any warehouse
          availableItems = await InventoryMaster.findAll({
            where: {
              ...baseWhere,
              current_location_type: 'WAREHOUSE'
            },
            limit: itemQuantity,
            transaction
          });
        }

        // Debug logging
        console.log(`[Consumption] Found ${availableItems.length} available items out of ${itemQuantity} requested`);
        if (availableItems.length > 0) {
          console.log(`[Consumption] First item details:`, {
            id: availableItems[0].id,
            material_id: availableItems[0].material_id,
            status: availableItems[0].status,
            current_location_type: availableItems[0].current_location_type,
            location_id: availableItems[0].location_id,
            org_id: availableItems[0].org_id
          });
        }
        
        if (availableItems.length < itemQuantity) {
          await transaction.rollback();
          console.error(`[Consumption] ERROR: Insufficient stock. Available: ${availableItems.length}, Requested: ${itemQuantity}`);
          return res.status(400).json({
            success: false,
            message: `Insufficient stock. Available: ${availableItems.length}, Requested: ${itemQuantity}`
          });
        }

        // Mark each item as consumed
        for (const inventoryItem of availableItems) {
          await inventoryItem.update({
            current_location_type: 'CONSUMED',
            location_id: null,
            status: 'CONSUMED',
            ticket_id: ticketId || inventoryItem.ticket_id
          }, { transaction });
        }
      }
    }

    await transaction.commit();

    // Fetch complete consumption record with items
    const completeConsumption = await ConsumptionRecord.findOne({
      where: { consumption_id: consumptionRecord.consumption_id },
      include: [
        {
          model: ConsumptionItem,
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
          as: 'stockArea',
          attributes: ['area_id', 'area_name', 'location_code']
        }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'Consumption record created successfully',
      data: completeConsumption
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Get all consumption records with filtering and pagination
 * GET /api/inventory/consumption
 */
export const getAllConsumptions = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      externalSystemRefId = '',
      stockAreaId = '',
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

    if (externalSystemRefId) {
      whereClause.external_system_ref_id = externalSystemRefId;
    }

    if (stockAreaId) {
      whereClause.stock_area_id = stockAreaId;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      whereClause.consumption_date = {};
      if (dateFrom) {
        whereClause.consumption_date[Op.gte] = dateFrom;
      }
      if (dateTo) {
        whereClause.consumption_date[Op.lte] = dateTo;
      }
    }

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { external_system_ref_id: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: consumptions } = await ConsumptionRecord.findAndCountAll({
      where: whereClause,
      limit: limitNumber,
      offset: offset,
      order: [['consumption_date', 'DESC'], ['created_at', 'DESC']],
      include: [
        {
          model: StockArea,
          as: 'stockArea',
          attributes: ['area_id', 'area_name', 'location_code']
        }
      ],
      distinct: true,
    });

    const totalConsumptions = typeof count === 'number' ? count : 0;

    return res.status(200).json({
      success: true,
      data: {
        consumptions,
        pagination: {
          currentPage: pageNumber,
          totalPages: limitNumber ? Math.max(Math.ceil(totalConsumptions / limitNumber), 1) : 1,
          totalItems: totalConsumptions,
          itemsPerPage: limitNumber
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single consumption record by ID
 * GET /api/inventory/consumption/:id
 */
export const getConsumptionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const consumption = await ConsumptionRecord.findOne({
      where: req.withOrg
        ? req.withOrg({
          consumption_id: id,
          is_active: true
        })
        : {
          consumption_id: id,
          is_active: true
        },
      include: [
        {
          model: ConsumptionItem,
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
          as: 'stockArea'
        }
      ]
    });

    if (!consumption) {
      return res.status(404).json({
        success: false,
        message: 'Consumption record not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: consumption
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update consumption record
 * PUT /api/inventory/consumption/:id
 */
export const updateConsumption = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Validation is handled by validate middleware in route

    const { id } = req.params;
    const {
      externalSystemRefId,
      customerData,
      consumptionDate,
      stockAreaId,
      items,
      remarks
    } = req.body;

    const consumption = await ConsumptionRecord.findOne({
      where: req.withOrg
        ? req.withOrg({
          consumption_id: id,
          is_active: true
        })
        : {
          consumption_id: id,
          is_active: true
        }
    }, { transaction });

    if (!consumption) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Consumption record not found',
        code: 'CONSUMPTION_NOT_FOUND'
      });
    }

    // Validate stock area if provided
    if (stockAreaId && stockAreaId !== consumption.stock_area_id) {
      const stockArea = await StockArea.findOne({
        where: req.withOrg
          ? req.withOrg({ area_id: stockAreaId, is_active: true })
          : { area_id: stockAreaId, is_active: true }
      });

      if (!stockArea) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid stock area',
          code: 'STOCK_AREA_NOT_FOUND'
        });
      }
    }

    // Update consumption record
    await consumption.update({
      external_system_ref_id: externalSystemRefId || consumption.external_system_ref_id,
      customer_data: customerData !== undefined ? customerData : consumption.customer_data,
      consumption_date: consumptionDate || consumption.consumption_date,
      stock_area_id: stockAreaId !== undefined ? stockAreaId : consumption.stock_area_id,
      remarks: remarks !== undefined ? remarks : consumption.remarks
    }, { transaction });

    // Update items if provided
    if (items && Array.isArray(items)) {
      await ConsumptionItem.destroy({
        where: { consumption_id: id },
        transaction
      });

      for (const item of items) {
        const { materialId, quantity, serialNumber, remarks: itemRemarks } = item;

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

        await ConsumptionItem.create({
          consumption_id: id,
          material_id: materialId,
          quantity: parseInt(quantity) || 1,
          serial_number: serialNumber || null,
          remarks: itemRemarks || null
        }, { transaction });
      }
    }

    await transaction.commit();

    const updatedConsumption = await ConsumptionRecord.findOne({
      where: { consumption_id: id },
      include: [
        {
          model: ConsumptionItem,
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
      message: 'Consumption record updated successfully',
      data: updatedConsumption
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Delete consumption record (soft delete)
 * DELETE /api/inventory/consumption/:id
 */
export const deleteConsumption = async (req, res, next) => {
  try {
    const { id } = req.params;

    const consumption = await ConsumptionRecord.findOne({
      where: req.withOrg
        ? req.withOrg({
          consumption_id: id,
          is_active: true
        })
        : {
          consumption_id: id,
          is_active: true
        }
    });

    if (!consumption) {
      return res.status(404).json({
        success: false,
        message: 'Consumption record not found'
      });
    }

    await consumption.update({
      is_active: false
    });

    return res.status(200).json({
      success: true,
      message: 'Consumption record deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};










