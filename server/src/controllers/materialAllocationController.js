import MaterialAllocation from '../models/MaterialAllocation.js';
import MaterialRequest from '../models/MaterialRequest.js';
import MaterialRequestItem from '../models/MaterialRequestItem.js';
import InventoryMaster from '../models/InventoryMaster.js';
import Material from '../models/Material.js';
import StockArea from '../models/StockArea.js';
import User from '../models/User.js';
// validationResult removed - using validate middleware in routes instead
import { Op } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * Get available inventory for allocation (items in warehouse, not allocated)
 * GET /api/v1/inventory/material-request/:id/available-stock
 */
export const getAvailableStockForAllocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stockAreaId, materialId } = req.query;

    // Validate material request exists
    const materialRequest = await MaterialRequest.findOne({
      where: { request_id: id, is_active: true }
    });

    if (!materialRequest) {
      return res.status(404).json({
        success: false,
        message: 'Material request not found',
        code: 'MATERIAL_REQUEST_NOT_FOUND'
      });
    }

    // Build where clause for available inventory
    const whereClause = {
      current_location_type: 'WAREHOUSE',
      status: 'AVAILABLE',
      is_active: true
    };

    if (stockAreaId) {
      whereClause.location_id = stockAreaId;
    }

    if (materialId) {
      whereClause.material_id = materialId;
    }

    // Get available inventory items
    const availableItems = await InventoryMaster.findAll({
      where: whereClause,
      include: [
        {
          model: Material,
          as: 'material',
          attributes: ['material_id', 'material_name', 'product_code', 'material_type', 'uom']
        },
        {
          model: StockArea,
          as: 'stockAreaLocation',
          attributes: ['area_id', 'area_name'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Group by material and stock area
    const groupedItems = availableItems.reduce((acc, item) => {
      const key = `${item.material_id}_${item.location_id}`;
      if (!acc[key]) {
        acc[key] = {
          material: item.material,
          stockArea: item.stockAreaLocation,
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
        materialRequestId: id,
        availableStock: Object.values(groupedItems),
        totalItems: availableItems.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Allocate items to material request
 * POST /api/v1/inventory/material-request/:id/allocate
 */
export const allocateItems = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Validation is handled by validate middleware in route

    const { id } = req.params;
    const { allocations } = req.body; // Array of {materialRequestItemId, inventoryMasterIds: []}

    const userId = req.user?.id || req.user?.user_id;

    // Validate material request exists and is approved
    const materialRequest = await MaterialRequest.findOne({
      where: { request_id: id, is_active: true },
      include: [
        {
          model: MaterialRequestItem,
          as: 'items'
        }
      ],
      transaction
    });

    if (!materialRequest) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Material request not found',
        code: 'MATERIAL_REQUEST_NOT_FOUND'
      });
    }

    if (materialRequest.status !== 'APPROVED') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Material request must be approved before allocation',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate allocations
    if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'At least one allocation is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const createdAllocations = [];

    for (const allocation of allocations) {
      const { materialRequestItemId, inventoryMasterIds } = allocation;

      // Validate material request item
      const requestItem = await MaterialRequestItem.findOne({
        where: {
          item_id: materialRequestItemId,
          request_id: id
        },
        transaction
      });

      if (!requestItem) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Material request item ${materialRequestItemId} not found`,
          code: 'MATERIAL_REQUEST_ITEM_NOT_FOUND'
        });
      }

      // Validate inventory items
      if (!inventoryMasterIds || !Array.isArray(inventoryMasterIds) || inventoryMasterIds.length === 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `At least one inventory item is required for material request item ${materialRequestItemId}`,
          code: 'VALIDATION_ERROR'
        });
      }

      // Check if allocation exceeds requested quantity
      const existingAllocations = await MaterialAllocation.count({
        where: {
          material_request_item_id: materialRequestItemId,
          status: { [Op.in]: ['ALLOCATED', 'TRANSFERRED'] }
        },
        transaction
      });

      if (existingAllocations + inventoryMasterIds.length > requestItem.requested_quantity) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Allocation exceeds requested quantity. Requested: ${requestItem.requested_quantity}, Already allocated: ${existingAllocations}, Trying to allocate: ${inventoryMasterIds.length}`,
          code: 'VALIDATION_ERROR'
        });
      }

      // Validate and allocate each inventory item
      for (const inventoryMasterId of inventoryMasterIds) {
        // Check if item is available
        const inventoryItem = await InventoryMaster.findOne({
          where: {
            id: inventoryMasterId,
            material_id: requestItem.material_id,
            current_location_type: 'WAREHOUSE',
            status: 'AVAILABLE',
            is_active: true
          },
          transaction
        });

        if (!inventoryItem) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Inventory item ${inventoryMasterId} not found or not available`,
            code: 'INVENTORY_ITEM_NOT_FOUND'
          });
        }

        // Check if already allocated
        const existingAllocation = await MaterialAllocation.findOne({
          where: {
            inventory_master_id: inventoryMasterId,
            status: { [Op.in]: ['ALLOCATED', 'TRANSFERRED'] }
          },
          transaction
        });

        if (existingAllocation) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Inventory item ${inventoryMasterId} is already allocated`,
            code: 'VALIDATION_ERROR'
          });
        }

        // Create allocation
        const allocation = await MaterialAllocation.create({
          material_request_id: id,
          material_request_item_id: materialRequestItemId,
          inventory_master_id: inventoryMasterId,
          allocated_by: userId,
          status: 'ALLOCATED'
        }, { transaction });

        // Update inventory item status
        await inventoryItem.update({
          status: 'ALLOCATED'
        }, { transaction });

        createdAllocations.push(allocation);
      }
    }

    await transaction.commit();

    // Fetch complete allocation details
    const allocationDetails = await MaterialAllocation.findAll({
      where: {
        id: { [Op.in]: createdAllocations.map(a => a.id) }
      },
      include: [
        {
          model: InventoryMaster,
          as: 'inventoryItem',
          include: [
            {
              model: Material,
              as: 'material',
              attributes: ['material_id', 'material_name', 'product_code']
            }
          ]
        },
        {
          model: MaterialRequestItem,
          as: 'materialRequestItem'
        },
        {
          model: User,
          as: 'allocator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'Items allocated successfully',
      data: {
        allocations: allocationDetails,
        totalAllocated: createdAllocations.length
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Get allocations for a material request
 * GET /api/v1/inventory/material-request/:id/allocations
 */
export const getAllocations = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate material request exists
    const materialRequest = await MaterialRequest.findOne({
      where: { request_id: id, is_active: true }
    });

    if (!materialRequest) {
      return res.status(404).json({
        success: false,
        message: 'Material request not found',
        code: 'MATERIAL_REQUEST_NOT_FOUND'
      });
    }

    // Get all allocations for this request
    const allocations = await MaterialAllocation.findAll({
      where: { material_request_id: id },
      include: [
        {
          model: InventoryMaster,
          as: 'inventoryItem',
          include: [
            {
              model: Material,
              as: 'material',
              attributes: ['material_id', 'material_name', 'product_code', 'material_type', 'uom']
            }
          ]
        },
        {
          model: MaterialRequestItem,
          as: 'materialRequestItem',
          include: [
            {
              model: Material,
              as: 'material',
              attributes: ['material_id', 'material_name', 'product_code']
            }
          ]
        },
        {
          model: User,
          as: 'allocator',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['allocated_at', 'DESC']]
    });

    // Group by material request item
    const groupedAllocations = allocations.reduce((acc, allocation) => {
      const itemId = allocation.material_request_item_id;
      if (!acc[itemId]) {
        acc[itemId] = {
          materialRequestItem: allocation.materialRequestItem,
          allocations: []
        };
      }
      acc[itemId].allocations.push(allocation);
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: {
        materialRequestId: id,
        allocations: Object.values(groupedAllocations),
        totalAllocations: allocations.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel allocation
 * DELETE /api/v1/inventory/material-request/:id/allocations/:allocationId
 */
export const cancelAllocation = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id, allocationId } = req.params;

    // Validate material request exists
    const materialRequest = await MaterialRequest.findOne({
      where: { request_id: id, is_active: true },
      transaction
    });

    if (!materialRequest) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Material request not found',
        code: 'MATERIAL_REQUEST_NOT_FOUND'
      });
    }

    // Find allocation
    const allocation = await MaterialAllocation.findOne({
      where: {
        id: allocationId,
        material_request_id: id,
        status: 'ALLOCATED' // Can only cancel allocated items, not transferred ones
      },
      include: [
        {
          model: InventoryMaster,
          as: 'inventoryItem'
        }
      ],
      transaction
    });

    if (!allocation) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Allocation not found or cannot be cancelled',
        code: 'ALLOCATION_NOT_FOUND'
      });
    }

    // Update allocation status
    await allocation.update({
      status: 'CANCELLED'
    }, { transaction });

    // Update inventory item status back to AVAILABLE
    if (allocation.inventoryItem) {
      await allocation.inventoryItem.update({
        status: 'AVAILABLE'
      }, { transaction });
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: 'Allocation cancelled successfully'
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

