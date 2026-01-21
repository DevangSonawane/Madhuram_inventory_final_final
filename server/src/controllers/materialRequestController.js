import MaterialRequest from '../models/MaterialRequest.js';
import MaterialRequestItem from '../models/MaterialRequestItem.js';
import Material from '../models/Material.js';
import User from '../models/User.js';
import Group from '../models/Group.js';
import Team from '../models/Team.js';
import StockArea from '../models/StockArea.js';
// validationResult removed - using validate middleware in routes instead
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { generateMR } from '../utils/slipGenerator.js';

/**
 * Create new material request
 * POST /api/inventory/material-request
 */
export const createMaterialRequest = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Validation is handled by validate middleware in route

    const {
      prNumbers, // Array of {prNumber, prDate}
      items, // Array of {materialId, requestedQuantity, uom, remarks}
      remarks,
      ticketId, // External system ticket ID
      fromStockAreaId, // Source stock area ID
      requestDate, // Request date (user selection or current day)
      requestorId, // Employee/Technician ID
      groupId, // Group ID
      teamId, // Team ID
      serviceArea // Service area (states in Goa)
    } = req.body;

    const userId = req.user?.id || req.user?.user_id;
    
    // Validate user exists (required for created_by foreign key)
    if (!userId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    const user = await User.findByPk(userId);
    if (!user) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'User not found. Cannot create material request.'
      });
    }
    
    // Set request date (user selection or current day)
    const requestDateValue = requestDate ? new Date(requestDate) : new Date();
    
    // Generate MR number based on the request date (month and year from selected date)
    const mrNumber = await generateMR(MaterialRequest, requestDateValue);

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'At least one item is required'
      });
    }

    // Validate group if provided
    if (groupId) {
      const group = await Group.findOne({
        where: req.withOrg
          ? req.withOrg({ group_id: groupId, is_active: true })
          : { group_id: groupId, is_active: true }
      });
      if (!group) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Group not found'
        });
      }
    }

    // Validate team if provided
    if (teamId) {
      const team = await Team.findOne({
        where: req.withOrg
          ? req.withOrg({ team_id: teamId, is_active: true })
          : { team_id: teamId, is_active: true }
      });
      if (!team) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Team not found'
        });
      }
      // Validate team belongs to group if group is provided
      if (groupId && team.group_id !== groupId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Team does not belong to the selected group'
        });
      }
    }

    // Validate stock area if provided
    if (fromStockAreaId) {
      const stockArea = await StockArea.findOne({
        where: req.withOrg
          ? req.withOrg({ area_id: fromStockAreaId, is_active: true })
          : { area_id: fromStockAreaId, is_active: true }
      });
      if (!stockArea) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Stock area not found'
        });
      }
    }

    // Validate requestor if provided
    if (requestorId) {
      const requestor = await User.findOne({
        where: { id: requestorId, isActive: true }
      });
      if (!requestor) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Requestor not found'
        });
      }
    }

    // Create material request (auto-submit to SUBMITTED status)
    // Note: created_by is nullable and has a foreign key constraint
    // If user validation passed, we can safely set created_by
    const materialRequest = await MaterialRequest.create({
      mr_number: mrNumber,
      request_date: requestDateValue,
      requestor_id: requestorId || null,
      group_id: groupId || null,
      team_id: teamId || null,
      service_area: serviceArea || null,
      from_stock_area_id: fromStockAreaId || null,
      pr_numbers: prNumbers && Array.isArray(prNumbers) && prNumbers.length > 0 ? prNumbers : null,
      status: 'SUBMITTED', // Auto-submit on create so it appears in Approval Center
      requested_by: userId, // This field is NOT NULL, so must have a value
      created_by: userId || null, // This has FK constraint to users.id, set to null if user doesn't exist (though we validated above)
      remarks: remarks || null,
      ticket_id: ticketId || null,
      org_id: req.orgId || null,
      is_active: true
    }, { 
      transaction,
      // Skip validation since we've already validated everything above
      validate: false
    });

    // Create request items
    const createdItems = [];
    for (const item of items) {
      const { materialId, requestedQuantity, uom, remarks: itemRemarks } = item;

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

      const requestItem = await MaterialRequestItem.create({
        request_id: materialRequest.request_id,
        material_id: materialId,
        requested_quantity: parseInt(requestedQuantity) || 1,
        approved_quantity: null,
        uom: uom || material.uom || 'PIECE(S)',
        remarks: itemRemarks || null
      }, { transaction });

      createdItems.push(requestItem);
    }

    await transaction.commit();

    // Fetch complete request with items and all associations
    const completeRequest = await MaterialRequest.findOne({
      where: { request_id: materialRequest.request_id },
      include: [
        {
          model: MaterialRequestItem,
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
          as: 'requester',
          attributes: ['id', 'name', 'employeCode', 'email']
        },
        {
          model: User,
          as: 'requestor',
          foreignKey: 'requestor_id',
          attributes: ['id', 'name', 'employeCode', 'email']
        },
        {
          model: User,
          as: 'creator',
          foreignKey: 'created_by',
          attributes: ['id', 'name', 'employeCode', 'email']
        },
        {
          model: Group,
          as: 'group',
          required: false
        },
        {
          model: Team,
          as: 'team',
          required: false
        },
        {
          model: StockArea,
          as: 'fromStockArea',
          foreignKey: 'from_stock_area_id',
          attributes: ['area_id', 'area_name', 'location_code']
        }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'Material request created successfully',
      data: completeRequest
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Get all material requests with filtering and pagination
 * GET /api/inventory/material-request
 */
export const getAllMaterialRequests = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      status = '',
      requestedBy = '',
      showInactive = false
    } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 50, 1);
    const offset = (pageNumber - 1) * limitNumber;

    // Build base where clause
    const baseWhere = {};
    
    if (!showInactive || showInactive === 'false') {
      baseWhere.is_active = true;
    }

    if (status) {
      // Ensure status is uppercase to match ENUM values (DRAFT, SUBMITTED, APPROVED, REJECTED, FULFILLED)
      const statusUpper = status.toUpperCase();
      // Validate status is one of the allowed values
      const allowedStatuses = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'FULFILLED'];
      if (allowedStatuses.includes(statusUpper)) {
        baseWhere.status = statusUpper;
      } else {
        // If invalid status, log warning but don't filter (show all)
        console.warn(`Invalid status filter value: ${status}. Allowed values: ${allowedStatuses.join(', ')}`);
      }
    }

    if (requestedBy) {
      baseWhere.requested_by = parseInt(requestedBy);
    }

    // Apply org filtering
    const whereClause = req.withOrg ? req.withOrg(baseWhere) : baseWhere;

    const { count, rows: requests } = await MaterialRequest.findAndCountAll({
      where: whereClause,
      limit: limitNumber,
      offset: offset,
      order: [['created_at', 'DESC']],
      distinct: true,
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'name', 'employeCode', 'email'],
          required: false
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'employeCode', 'email'],
          required: false
        },
        {
          model: User,
          as: 'requestor',
          foreignKey: 'requestor_id',
          attributes: ['id', 'name', 'employeCode', 'email'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          foreignKey: 'created_by',
          attributes: ['id', 'name', 'employeCode', 'email'],
          required: false
        },
        {
          model: StockArea,
          as: 'fromStockArea',
          foreignKey: 'from_stock_area_id',
          attributes: ['area_id', 'area_name', 'location_code'],
          required: false
        }
      ],
    });

    const totalRequests = typeof count === 'number' ? count : 0;

    return res.status(200).json({
      success: true,
      data: {
        materialRequests: requests, // Use materialRequests for consistency with frontend
        requests, // Keep for backward compatibility
        pagination: {
          currentPage: pageNumber,
          totalPages: limitNumber ? Math.max(Math.ceil(totalRequests / limitNumber), 1) : 1,
          totalItems: totalRequests,
          itemsPerPage: limitNumber
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single material request by ID
 * GET /api/inventory/material-request/:id
 */
export const getMaterialRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await MaterialRequest.findOne({
      where: req.withOrg
        ? req.withOrg({
          request_id: id,
          is_active: true
        })
        : {
          request_id: id,
          is_active: true
        },
      include: [
        {
          model: MaterialRequestItem,
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
          as: 'requester',
          attributes: ['id', 'name', 'employeCode', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'employeCode', 'email']
        },
        {
          model: User,
          as: 'requestor',
          foreignKey: 'requestor_id',
          attributes: ['id', 'name', 'employeCode', 'email']
        },
        {
          model: User,
          as: 'creator',
          foreignKey: 'created_by',
          attributes: ['id', 'name', 'employeCode', 'email']
        },
        {
          model: StockArea,
          as: 'fromStockArea',
          foreignKey: 'from_stock_area_id',
          attributes: ['area_id', 'area_name', 'location_code']
        }
      ]
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Material request not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: { materialRequest: request }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update material request
 * PUT /api/inventory/material-request/:id
 */
export const updateMaterialRequest = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Validation is handled by validate middleware in route

    const { id } = req.params;
    const {
      prNumbers,
      items,
      remarks,
      status,
      ticketId,
      fromStockAreaId,
      requestDate,
      requestorId,
      groupId,
      teamId,
      serviceArea
    } = req.body;

    const materialRequest = await MaterialRequest.findOne({
      where: req.withOrg
        ? req.withOrg({
          request_id: id,
          is_active: true
        })
        : {
          request_id: id,
          is_active: true
        }
    }, { transaction });

    if (!materialRequest) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Material request not found',
        code: 'MATERIAL_REQUEST_NOT_FOUND'
      });
    }

    // Validate group if provided
    if (groupId && groupId !== materialRequest.group_id) {
      const group = await Group.findOne({
        where: req.withOrg
          ? req.withOrg({ group_id: groupId, is_active: true })
          : { group_id: groupId, is_active: true }
      });
      if (!group) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Group not found',
          code: 'GROUP_NOT_FOUND'
        });
      }
    }

    // Validate team if provided
    if (teamId && teamId !== materialRequest.team_id) {
      const team = await Team.findOne({
        where: req.withOrg
          ? req.withOrg({ team_id: teamId, is_active: true })
          : { team_id: teamId, is_active: true }
      });
      if (!team) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Team not found',
          code: 'TEAM_NOT_FOUND'
        });
      }
      // Validate team belongs to group if group is provided
      if (groupId && team.group_id !== groupId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Team does not belong to the selected group',
          code: 'VALIDATION_ERROR'
        });
      }
    }

    // Validate stock area if provided
    if (fromStockAreaId && fromStockAreaId !== materialRequest.from_stock_area_id) {
      const stockArea = await StockArea.findOne({
        where: req.withOrg
          ? req.withOrg({ area_id: fromStockAreaId, is_active: true })
          : { area_id: fromStockAreaId, is_active: true }
      });
      if (!stockArea) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Stock area not found',
          code: 'STOCK_AREA_NOT_FOUND'
        });
      }
    }

    // Validate requestor if provided
    if (requestorId && requestorId !== materialRequest.requestor_id) {
      const requestor = await User.findOne({
        where: { id: requestorId, isActive: true }
      });
      if (!requestor) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Requestor not found',
          code: 'USER_NOT_FOUND'
        });
      }
    }

    // Update request
    const updateData = {
      remarks: remarks !== undefined ? remarks : materialRequest.remarks,
      status: status || materialRequest.status,
      ticket_id: ticketId !== undefined ? ticketId : materialRequest.ticket_id
    };

    // Handle PR numbers - allow null/empty to remove them
    if (prNumbers !== undefined) {
      updateData.pr_numbers = (prNumbers && Array.isArray(prNumbers) && prNumbers.length > 0) ? prNumbers : null;
    }

    // Add new fields if provided
    if (requestDate) updateData.request_date = new Date(requestDate);
    if (requestorId !== undefined) updateData.requestor_id = requestorId || null;
    if (groupId !== undefined) updateData.group_id = groupId || null;
    if (teamId !== undefined) updateData.team_id = teamId || null;
    if (serviceArea !== undefined) updateData.service_area = serviceArea || null;
    if (fromStockAreaId !== undefined) updateData.from_stock_area_id = fromStockAreaId || null;

    await materialRequest.update(updateData, { transaction });

    // Update items if provided
    if (items && Array.isArray(items)) {
      await MaterialRequestItem.destroy({
        where: { request_id: id },
        transaction
      });

      for (const item of items) {
        const { materialId, requestedQuantity, approvedQuantity, uom, remarks: itemRemarks } = item;

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

        await MaterialRequestItem.create({
          request_id: id,
          material_id: materialId,
          requested_quantity: parseInt(requestedQuantity) || 1,
          approved_quantity: approvedQuantity ? parseInt(approvedQuantity) : null,
          uom: uom || material.uom || 'PIECE(S)',
          remarks: itemRemarks || null
        }, { transaction });
      }
    }

    await transaction.commit();

    const updatedRequest = await MaterialRequest.findOne({
      where: { request_id: id },
      include: [
        {
          model: MaterialRequestItem,
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
          as: 'requester',
          attributes: ['id', 'name', 'employeCode', 'email']
        },
        {
          model: User,
          as: 'requestor',
          foreignKey: 'requestor_id',
          attributes: ['id', 'name', 'employeCode', 'email']
        },
        {
          model: User,
          as: 'creator',
          foreignKey: 'created_by',
          attributes: ['id', 'name', 'employeCode', 'email']
        },
        {
          model: Group,
          as: 'group',
          required: false
        },
        {
          model: Team,
          as: 'team',
          required: false
        },
        {
          model: StockArea,
          as: 'fromStockArea',
          foreignKey: 'from_stock_area_id',
          attributes: ['area_id', 'area_name', 'location_code']
        }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Material request updated successfully',
      data: updatedRequest
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Approve or reject material request
 * POST /api/inventory/material-request/:id/approve
 */
export const approveMaterialRequest = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Validation is handled by validate middleware in route

    const { id } = req.params;
    const { status, approvedItems, remarks } = req.body; // approvedItems: [{itemId, approvedQuantity}]

    const userId = req.user?.id || req.user?.user_id;

    const materialRequest = await MaterialRequest.findOne({
      where: req.withOrg
        ? req.withOrg({
          request_id: id,
          is_active: true
        })
        : {
          request_id: id,
          is_active: true
        },
      include: [
        {
          model: MaterialRequestItem,
          as: 'items'
        }
      ]
    }, { transaction });

    if (!materialRequest) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Material request not found',
        code: 'MATERIAL_REQUEST_NOT_FOUND'
      });
    }

    if (status !== 'APPROVED' && status !== 'REJECTED') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Status must be APPROVED or REJECTED',
        code: 'VALIDATION_ERROR'
      });
    }

    // Update request status
    await materialRequest.update({
      status: status,
      approved_by: userId,
      approval_date: new Date(),
      remarks: remarks || materialRequest.remarks
    }, { transaction });

    // Update approved quantities if provided
    if (approvedItems && Array.isArray(approvedItems) && status === 'APPROVED') {
      for (const approvedItem of approvedItems) {
        const { itemId, approvedQuantity } = approvedItem;
        
        const requestItem = await MaterialRequestItem.findOne({
          where: {
            item_id: itemId,
            request_id: id
          }
        }, { transaction });

        if (requestItem) {
          await requestItem.update({
            approved_quantity: parseInt(approvedQuantity) || requestItem.requested_quantity
          }, { transaction });
        }
      }
    }

    await transaction.commit();

    const updatedRequest = await MaterialRequest.findOne({
      where: { request_id: id },
      include: [
        {
          model: MaterialRequestItem,
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
          as: 'approver',
          attributes: ['id', 'name', 'employeCode', 'email']
        }
      ]
    });

    return res.status(200).json({
      success: true,
      message: `Material request ${status.toLowerCase()} successfully`,
      data: { materialRequest: updatedRequest }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Delete material request (soft delete)
 * DELETE /api/inventory/material-request/:id
 */
export const deleteMaterialRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const materialRequest = await MaterialRequest.findOne({
      where: req.withOrg
        ? req.withOrg({
          request_id: id,
          is_active: true
        })
        : {
          request_id: id,
          is_active: true
        }
    });

    if (!materialRequest) {
      return res.status(404).json({
        success: false,
        message: 'Material request not found'
      });
    }

    await materialRequest.update({
      is_active: false
    });

    return res.status(200).json({
      success: true,
      message: 'Material request deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};













