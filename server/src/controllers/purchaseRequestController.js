import PurchaseRequest from '../models/PurchaseRequest.js';
import PurchaseRequestItem from '../models/PurchaseRequestItem.js';
import Material from '../models/Material.js';
import User from '../models/User.js';
import BusinessPartner from '../models/BusinessPartner.js';
// validationResult removed - using validate middleware in routes instead
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { isValidMaterialType } from '../utils/materialTypeValidator.js';

/**
 * Generate PR number in format: PR-MONTH-YEAR-order
 * e.g., PR-AUG-2025-001 (August 2025, first PR of the month)
 * Month abbreviations: JAN, FEB, MAR, APR, MAY, JUN, JUL, AUG, SEP, OCT, NOV, DEC
 */
const generatePRNumber = async (requestedDate = null) => {
  const date = requestedDate ? new Date(requestedDate) : new Date();
  const year = date.getFullYear();
  
  // Month abbreviations
  const monthAbbr = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = monthAbbr[date.getMonth()];
  
  // Find the last PR number for this month
  const lastPR = await PurchaseRequest.findOne({
    where: {
      pr_number: {
        [Op.like]: `PR-${month}-${year}-%`
      },
      is_active: true
    },
    order: [['pr_number', 'DESC']]
  });
  
  let orderNumber = 1;
  if (lastPR) {
    // Extract order number from last PR (format: PR-MONTH-YYYY-XXX)
    const parts = lastPR.pr_number.split('-');
    if (parts.length === 4) {
      const lastOrder = parseInt(parts[3], 10);
      if (!isNaN(lastOrder)) {
        orderNumber = lastOrder + 1;
      }
    }
  }
  
  const orderStr = String(orderNumber).padStart(3, '0');
  return `PR-${month}-${year}-${orderStr}`;
};

/**
 * Generate PR number based on requested date
 * GET /api/inventory/purchase-requests/generate-pr-number
 */
export const generatePRNumberEndpoint = async (req, res, next) => {
  try {
    const { requestedDate } = req.query;

    if (!requestedDate) {
      return res.status(400).json({
        success: false,
        message: 'Requested date is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate date format
    const date = new Date(requestedDate);
    if (isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format',
        code: 'VALIDATION_ERROR'
      });
    }

    const prNumber = await generatePRNumber(requestedDate);

    return res.status(200).json({
      success: true,
      data: { prNumber }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all purchase requests with filtering and pagination
 * GET /api/inventory/purchase-requests
 */
export const getAllPurchaseRequests = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      status = ''
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = req.withOrg ? req.withOrg({ is_active: true }) : { is_active: true };

    if (status) {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { pr_number: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await PurchaseRequest.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      // Order by created_at first (always present, reflects actual creation time)
      // Then by requested_date and pr_number for consistent ordering
      order: [
        ['created_at', 'DESC'],
        ['requested_date', 'DESC'],
        ['pr_number', 'DESC']
      ],
      include: [
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: PurchaseRequestItem,
          as: 'items',
          required: false,
          include: [
            {
              model: Material,
              as: 'material',
              attributes: ['material_id', 'material_name', 'price', 'gst_percentage', 'sgst_percentage'],
              required: false
            }
          ]
        }
      ]
    });

    // Calculate item count and total amount for each purchase request
    const purchaseRequestsWithTotals = rows.map(pr => {
      const items = pr.items || [];
      const itemCount = items.length;
      
      // Calculate total amount from items (quantity * material price)
      const totalAmount = items.reduce((sum, item) => {
        const quantity = parseInt(item.requested_quantity) || 0;
        const price = parseFloat(item.material?.price) || 0;
        return sum + (quantity * price);
      }, 0);

      // Convert to plain object and add calculated fields
      const prData = pr.toJSON();
      return {
        ...prData,
        itemCount,
        total_amount: totalAmount,
        totalAmount: totalAmount,
        items: items.map(item => item.toJSON())
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        purchaseRequests: purchaseRequestsWithTotals,
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
 * Get single purchase request by ID with items
 * GET /api/inventory/purchase-requests/:id
 */
export const getPurchaseRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const purchaseRequest = await PurchaseRequest.findOne({
      where: req.withOrg
        ? req.withOrg({ pr_id: id, is_active: true })
        : { pr_id: id, is_active: true },
      include: [
        {
          model: PurchaseRequestItem,
          as: 'items',
          include: [
            {
              model: Material,
              as: 'material',
              attributes: ['material_id', 'material_name', 'product_code', 'material_type', 'uom', 'price', 'gst_percentage', 'sgst_percentage'],
              required: false
            },
            {
              model: BusinessPartner,
              as: 'businessPartner',
              attributes: ['partner_id', 'partner_name', 'partner_type'],
              required: false
            }
          ]
        },
        {
          model: User,
          as: 'requester',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ]
    });

    if (!purchaseRequest) {
      return res.status(404).json({
        success: false,
        message: 'Purchase request not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: { purchaseRequest }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new purchase request with items
 * POST /api/inventory/purchase-requests
 */
export const createPurchaseRequest = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Validation is handled by validate middleware in route

    const {
      prNumber,
      requestedDate,
      items,
      remarks
    } = req.body;

    const userId = req.user?.id || req.user?.user_id;
    const orgId = req.orgId; // Use orgId from middleware instead of request body

    // Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'At least one item is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Generate PR number if not provided
    let finalPRNumber = prNumber;
    if (!finalPRNumber) {
      finalPRNumber = await generatePRNumber(requestedDate);
      // Double-check uniqueness (shouldn't happen with sequential numbering, but safety check)
      const existing = await PurchaseRequest.findOne({
        where: { pr_number: finalPRNumber }
      });
      if (existing) {
        await transaction.rollback();
        return res.status(500).json({
          success: false,
          message: 'Failed to generate unique PR number. Please try again.',
          code: 'PR_NUMBER_GENERATION_ERROR'
        });
      }
    }

    // Create purchase request
    const purchaseRequest = await PurchaseRequest.create({
      pr_number: finalPRNumber,
      requested_by: userId,
      requested_date: requestedDate || new Date().toISOString().split('T')[0],
      status: 'DRAFT',
      remarks: remarks || null,
      org_id: orgId || null, // Use orgId from middleware (req.orgId)
      is_active: true
    }, { transaction });

    // Create items
    const createdItems = [];
    for (const item of items) {
      const { 
        materialId, 
        requestedQuantity, 
        uom, 
        remarks: itemRemarks,
        prName,
        businessPartnerId,
        materialType,
        shippingAddress,
        billingAddress,
        description
      } = item;

      // Validate required fields
      if (!prName) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'PR name is required for each item',
          code: 'VALIDATION_ERROR'
        });
      }

      if (!materialType || (typeof materialType === 'string' && materialType.trim() === '')) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Material type is required for each item',
          code: 'VALIDATION_ERROR'
        });
      }

      // Validate material type dynamically against database
      const trimmedMaterialType = typeof materialType === 'string' ? materialType.trim() : materialType;
      const isValid = await isValidMaterialType(trimmedMaterialType, {
        orgId: orgId,
        withOrg: req.withOrg
      });
      
      if (!isValid) {
        // Get valid types for error message
        const { getValidMaterialTypes } = await import('../utils/materialTypeValidator.js');
        const validTypes = await getValidMaterialTypes({
          orgId: orgId,
          withOrg: req.withOrg
        });
        
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: validTypes.length > 0 
            ? `Invalid material type. Must be one of: ${validTypes.join(', ')}`
            : 'Invalid material type. Please ensure material types are configured in the system.',
          code: 'VALIDATION_ERROR'
        });
      }

      // Validate material exists (if materialId is provided)
      if (materialId) {
        const material = await Material.findOne({
          where: { material_id: materialId, is_active: true }
        });

        if (!material) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Material with ID ${materialId} not found`,
            code: 'MATERIAL_NOT_FOUND'
          });
        }
      }

      // Validate business partner exists (if provided)
      if (businessPartnerId) {
        const businessPartner = await BusinessPartner.findOne({
          where: { partner_id: businessPartnerId, is_active: true }
        });

        if (!businessPartner) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Business partner with ID ${businessPartnerId} not found`,
            code: 'BUSINESS_PARTNER_NOT_FOUND'
          });
        }
      }

      const prItem = await PurchaseRequestItem.create({
        pr_id: purchaseRequest.pr_id,
        material_id: materialId || null,
        requested_quantity: parseInt(requestedQuantity) || 1,
        uom: uom || 'PIECE(S)',
        remarks: itemRemarks || null,
        pr_name: prName,
        business_partner_id: businessPartnerId || null,
        material_type: materialType,
        shipping_address: shippingAddress || null,
        billing_address: billingAddress || null,
        description: description || null
      }, { transaction });

      createdItems.push(prItem);
    }

    await transaction.commit();

    // Fetch created PR with items
    const createdPR = await PurchaseRequest.findOne({
      where: { pr_id: purchaseRequest.pr_id },
      include: [
        {
          model: PurchaseRequestItem,
          as: 'items',
          include: [
            {
              model: Material,
              as: 'material',
              attributes: ['material_id', 'material_name', 'product_code', 'material_type', 'uom', 'price', 'gst_percentage', 'sgst_percentage']
            }
          ]
        }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'Purchase request created successfully',
      data: { purchaseRequest: createdPR }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Update purchase request
 * PUT /api/inventory/purchase-requests/:id
 */
export const updatePurchaseRequest = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Validation is handled by validate middleware in route
    const { id } = req.params;
    const {
      requestedDate,
      items,
      remarks
    } = req.body;

    const purchaseRequest = await PurchaseRequest.findOne({
      where: { pr_id: id, is_active: true }
    });

    if (!purchaseRequest) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Purchase request not found',
        code: 'PURCHASE_REQUEST_NOT_FOUND'
      });
    }

    // Only allow updates if status is DRAFT
    if (purchaseRequest.status !== 'DRAFT') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Only DRAFT purchase requests can be updated',
        code: 'INVALID_STATUS'
      });
    }

    // Update PR fields
    if (requestedDate !== undefined) {
      purchaseRequest.requested_date = requestedDate;
    }
    if (remarks !== undefined) {
      purchaseRequest.remarks = remarks;
    }
    await purchaseRequest.save({ transaction });

    // Update items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items
      await PurchaseRequestItem.destroy({
        where: { pr_id: id },
        transaction
      });

      // Create new items
      for (const item of items) {
        const { 
          materialId, 
          requestedQuantity, 
          uom, 
          remarks: itemRemarks,
          prName,
          businessPartnerId,
          materialType,
          shippingAddress,
          billingAddress,
          description
        } = item;

        // Validate required fields
        if (!prName) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'PR name is required for each item',
            code: 'VALIDATION_ERROR'
          });
        }

        if (!materialType || (typeof materialType === 'string' && materialType.trim() === '')) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'Material type is required for each item',
            code: 'VALIDATION_ERROR'
          });
        }

        // Validate material type dynamically against database
        const trimmedMaterialType = typeof materialType === 'string' ? materialType.trim() : materialType;
        const isValid = await isValidMaterialType(trimmedMaterialType, {
          orgId: req.orgId,
          withOrg: req.withOrg
        });
        
        if (!isValid) {
          // Get valid types for error message
          const { getValidMaterialTypes } = await import('../utils/materialTypeValidator.js');
          const validTypes = await getValidMaterialTypes({
            orgId: req.orgId,
            withOrg: req.withOrg
          });
          
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: validTypes.length > 0 
              ? `Invalid material type. Must be one of: ${validTypes.join(', ')}`
              : 'Invalid material type. Please ensure material types are configured in the system.',
            code: 'VALIDATION_ERROR'
          });
        }

        // Validate material exists (if materialId is provided)
        if (materialId) {
          const material = await Material.findOne({
            where: { material_id: materialId, is_active: true }
          });

          if (!material) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: `Material with ID ${materialId} not found`,
              code: 'MATERIAL_NOT_FOUND'
            });
          }
        }

        // Validate business partner exists (if provided)
        if (businessPartnerId) {
          const businessPartner = await BusinessPartner.findOne({
            where: { partner_id: businessPartnerId, is_active: true }
          });

          if (!businessPartner) {
            await transaction.rollback();
            return res.status(400).json({
              success: false,
              message: `Business partner with ID ${businessPartnerId} not found`,
              code: 'BUSINESS_PARTNER_NOT_FOUND'
            });
          }
        }

        await PurchaseRequestItem.create({
          pr_id: id,
          material_id: materialId || null,
          requested_quantity: parseInt(requestedQuantity) || 1,
          uom: uom || 'PIECE(S)',
          remarks: itemRemarks || null,
          pr_name: prName,
          business_partner_id: businessPartnerId || null,
          material_type: materialType,
          shipping_address: shippingAddress || null,
          description: description || null
        }, { transaction });
      }
    }

    await transaction.commit();

    // Fetch updated PR
    const updatedPR = await PurchaseRequest.findOne({
      where: { pr_id: id },
      include: [
        {
          model: PurchaseRequestItem,
          as: 'items',
          include: [
            {
              model: Material,
              as: 'material',
              attributes: ['material_id', 'material_name', 'product_code', 'material_type', 'uom', 'price', 'gst_percentage', 'sgst_percentage']
            }
          ]
        }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Purchase request updated successfully',
      data: { purchaseRequest: updatedPR }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Submit purchase request (DRAFT -> SUBMITTED)
 * PUT /api/inventory/purchase-requests/:id/submit
 */
export const submitPurchaseRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const purchaseRequest = await PurchaseRequest.findOne({
      where: { pr_id: id, is_active: true }
    });

    if (!purchaseRequest) {
      return res.status(404).json({
        success: false,
        message: 'Purchase request not found',
        code: 'PURCHASE_REQUEST_NOT_FOUND'
      });
    }

    if (purchaseRequest.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Only DRAFT purchase requests can be submitted',
        code: 'INVALID_STATUS'
      });
    }

    await purchaseRequest.update({ status: 'SUBMITTED' });

    return res.status(200).json({
      success: true,
      message: 'Purchase request submitted successfully',
      data: { purchaseRequest }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve purchase request
 * PUT /api/inventory/purchase-requests/:id/approve
 */
export const approvePurchaseRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const userId = req.user?.id || req.user?.user_id;

    // Since route has roleGuard('admin'), user is guaranteed to be admin
    // Admins can approve any status - no status restriction needed
    const purchaseRequest = await PurchaseRequest.findOne({
      where: req.withOrg
        ? req.withOrg({ pr_id: id, is_active: true })
        : { pr_id: id, is_active: true }
    });

    if (!purchaseRequest) {
      return res.status(404).json({
        success: false,
        message: 'Purchase request not found',
        code: 'PURCHASE_REQUEST_NOT_FOUND'
      });
    }

    // Admins can approve any status (route is protected by roleGuard('admin'))
    await purchaseRequest.update({
      status: 'APPROVED',
      approved_by: userId,
      approval_date: new Date(),
      remarks: remarks || purchaseRequest.remarks
    });

    return res.status(200).json({
      success: true,
      message: 'Purchase request approved successfully',
      data: { purchaseRequest }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject purchase request
 * PUT /api/inventory/purchase-requests/:id/reject
 */
export const rejectPurchaseRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const userId = req.user?.id || req.user?.user_id;

    if (!remarks) {
      return res.status(400).json({
        success: false,
        message: 'Rejection remarks are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Since route has roleGuard('admin'), user is guaranteed to be admin
    // Admins can reject any status - no status restriction needed
    const purchaseRequest = await PurchaseRequest.findOne({
      where: req.withOrg
        ? req.withOrg({ pr_id: id, is_active: true })
        : { pr_id: id, is_active: true }
    });

    if (!purchaseRequest) {
      return res.status(404).json({
        success: false,
        message: 'Purchase request not found',
        code: 'PURCHASE_REQUEST_NOT_FOUND'
      });
    }

    // Admins can reject any status (route is protected by roleGuard('admin'))
    await purchaseRequest.update({
      status: 'REJECTED',
      approved_by: userId,
      approval_date: new Date(),
      remarks: remarks
    });

    return res.status(200).json({
      success: true,
      message: 'Purchase request rejected successfully',
      data: { purchaseRequest }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete purchase request (soft delete)
 * DELETE /api/inventory/purchase-requests/:id
 */
export const deletePurchaseRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const purchaseRequest = await PurchaseRequest.findOne({
      where: { pr_id: id, is_active: true }
    });

    if (!purchaseRequest) {
      return res.status(404).json({
        success: false,
        message: 'Purchase request not found',
        code: 'PURCHASE_REQUEST_NOT_FOUND'
      });
    }

    // Only allow deletion if status is DRAFT
    if (purchaseRequest.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Only DRAFT purchase requests can be deleted',
        code: 'INVALID_STATUS'
      });
    }

    await purchaseRequest.update({ is_active: false });

    return res.status(200).json({
      success: true,
      message: 'Purchase request deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

