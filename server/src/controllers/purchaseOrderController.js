import PurchaseOrder from '../models/PurchaseOrder.js';
import PurchaseOrderItem from '../models/PurchaseOrderItem.js';
import PurchaseRequest from '../models/PurchaseRequest.js';
import PurchaseRequestItem from '../models/PurchaseRequestItem.js';
import Material from '../models/Material.js';
import BusinessPartner from '../models/BusinessPartner.js';
// validationResult removed - using validate middleware in routes instead
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { sendPOEmailToVendor } from '../utils/emailService.js';

/**
 * Generate PO number based on PR number
 */
const generatePONumber = (prNumber = null) => {
  if (prNumber) {
    // Format: PO-{PR details} (e.g., if PR is PR-AUG-2025-001, PO becomes PO-AUG-2025-001)
    return prNumber.replace('PR-', 'PO-');
  }
  // Fallback: Generate based on date if no PR
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PO-${year}-${month}-${random}`;
};

/**
 * Get all purchase orders with filtering and pagination
 * GET /api/inventory/purchase-orders
 */
export const getAllPurchaseOrders = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      status = '',
      vendorId = ''
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = req.withOrg ? req.withOrg({ is_active: true }) : { is_active: true };

    if (status) {
      where.status = status;
    }

    if (vendorId) {
      where.vendor_id = vendorId;
    }

    if (search) {
      where[Op.or] = [
        { po_number: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await PurchaseOrder.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['po_date', 'DESC'], ['created_at', 'DESC']],
      include: [
        {
          model: PurchaseRequest,
          as: 'purchaseRequest',
          attributes: ['pr_id', 'pr_number'],
          required: false
        },
        {
          model: BusinessPartner,
          as: 'vendor',
          attributes: ['partner_id', 'partner_name'],
          required: false
        }
      ]
    });

    return res.status(200).json({
      success: true,
      data: {
        purchaseOrders: rows,
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
 * Get single purchase order by ID with items
 * GET /api/inventory/purchase-orders/:id
 */
export const getPurchaseOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const purchaseOrder = await PurchaseOrder.findOne({
      where: req.withOrg
        ? req.withOrg({ po_id: id, is_active: true })
        : { po_id: id, is_active: true },
      include: [
        {
          model: PurchaseOrderItem,
          as: 'items',
          include: [
            {
              model: Material,
              as: 'material',
              attributes: ['material_id', 'material_name', 'product_code', 'material_type', 'uom', 'price', 'gst_percentage', 'sgst_percentage']
            }
          ]
        },
        {
          model: PurchaseRequest,
          as: 'purchaseRequest',
          attributes: ['pr_id', 'pr_number'],
          required: false
        },
        {
          model: BusinessPartner,
          as: 'vendor',
          required: false
        }
      ]
    });

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
        code: 'PURCHASE_ORDER_NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      data: { purchaseOrder }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create purchase order from purchase request
 * POST /api/inventory/purchase-orders/from-pr/:prId
 */
export const createPOFromPR = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { prId } = req.params;
    const {
      poNumber,
      vendorId,
      poDate,
      items, // Override items from PR if needed
      remarks,
      orgId
    } = req.body;

    // Get the purchase request
    const purchaseRequest = await PurchaseRequest.findOne({
      where: { pr_id: prId, is_active: true },
      include: [
        {
          model: PurchaseRequestItem,
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

    if (!purchaseRequest) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Purchase request not found',
        code: 'PURCHASE_REQUEST_NOT_FOUND'
      });
    }

    if (purchaseRequest.status !== 'APPROVED') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Only APPROVED purchase requests can be converted to purchase orders',
        code: 'INVALID_STATUS'
      });
    }

    // Validate vendor if provided
    if (vendorId) {
      const vendor = await BusinessPartner.findOne({
        where: { partner_id: vendorId, is_active: true }
      });
      if (!vendor) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid vendor ID',
          code: 'VENDOR_NOT_FOUND'
        });
      }
    }

    // Generate PO number if not provided
    let finalPONumber = poNumber;
    if (!finalPONumber) {
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 10) {
        finalPONumber = generatePONumber();
        const existing = await PurchaseOrder.findOne({
          where: { po_number: finalPONumber }
        });
        if (!existing) {
          isUnique = true;
        } else {
          attempts++;
        }
      }
      if (!isUnique) {
        await transaction.rollback();
        return res.status(500).json({
          success: false,
          message: 'Failed to generate unique PO number',
          code: 'PO_NUMBER_GENERATION_ERROR'
        });
      }
    }

    // Use items from PR or provided items
    const itemsToUse = items && Array.isArray(items) && items.length > 0 
      ? items 
      : purchaseRequest.items.map(item => ({
          materialId: item.material_id,
          quantity: item.requested_quantity,
          uom: item.uom,
          unitPrice: null,
          remarks: item.remarks
        }));

    // Create purchase order
    let totalAmount = 0;
    const purchaseOrder = await PurchaseOrder.create({
      po_number: finalPONumber,
      pr_id: prId,
      vendor_id: vendorId || null,
      po_date: poDate || new Date().toISOString().split('T')[0],
      status: 'DRAFT',
      total_amount: 0,
      remarks: remarks || null,
      documents: [],
      org_id: orgId || null,
      is_active: true
    }, { transaction });

    // Create items
    const createdItems = [];
    for (const item of itemsToUse) {
      const { materialId, quantity, unitPrice, uom, remarks: itemRemarks } = item;

      // Validate material exists
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

      const qty = parseInt(quantity) || 1;
      const price = unitPrice ? parseFloat(unitPrice) : null;
      const itemTotal = price ? qty * price : 0;
      totalAmount += itemTotal;

      const poItem = await PurchaseOrderItem.create({
        po_id: purchaseOrder.po_id,
        material_id: materialId,
        quantity: qty,
        unit_price: price,
        total_amount: itemTotal,
        uom: uom || material.uom || 'PIECE(S)',
        remarks: itemRemarks || null
      }, { transaction });

      createdItems.push(poItem);
    }

    // Update total amount
    await purchaseOrder.update({ total_amount: totalAmount }, { transaction });

    await transaction.commit();

    // Fetch created PO with items
    const createdPO = await PurchaseOrder.findOne({
      where: { po_id: purchaseOrder.po_id },
      include: [
        {
          model: PurchaseOrderItem,
          as: 'items',
          include: [
            {
              model: Material,
              as: 'material',
              attributes: ['material_id', 'material_name', 'product_code', 'material_type', 'uom', 'price', 'gst_percentage', 'sgst_percentage']
            }
          ]
        },
        {
          model: PurchaseRequest,
          as: 'purchaseRequest'
        },
        {
          model: BusinessPartner,
          as: 'vendor'
        }
      ]
    });

    return res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      data: { purchaseOrder: createdPO }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Create new purchase order (standalone, not from PR)
 * POST /api/inventory/purchase-orders
 */
export const createPurchaseOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Validation is handled by validate middleware in route

    const {
      poNumber,
      vendorId,
      poDate,
      items,
      remarks,
      orgId,
      prId
    } = req.body;

    // Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'At least one item is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate vendor if provided
    if (vendorId) {
      const vendor = await BusinessPartner.findOne({
        where: { partner_id: vendorId, is_active: true }
      });
      if (!vendor) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Invalid vendor ID',
          code: 'VENDOR_NOT_FOUND'
        });
      }
    }

    // Get PR number if prId is provided for PO number generation
    let prNumber = null;
    if (prId) {
      const pr = await PurchaseRequest.findOne({
        where: { pr_id: prId, is_active: true },
        attributes: ['pr_number']
      });
      if (pr) {
        prNumber = pr.pr_number;
      }
    }

    // Generate PO number if not provided (based on PR number if available)
    let finalPONumber = poNumber;
    if (!finalPONumber) {
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 10) {
        finalPONumber = generatePONumber(prNumber);
        const existing = await PurchaseOrder.findOne({
          where: { po_number: finalPONumber }
        });
        if (!existing) {
          isUnique = true;
        } else {
          attempts++;
        }
      }
      if (!isUnique) {
        await transaction.rollback();
        return res.status(500).json({
          success: false,
          message: 'Failed to generate unique PO number',
          code: 'PO_NUMBER_GENERATION_ERROR'
        });
      }
    }

    // Create purchase order
    let totalAmount = 0;
    const purchaseOrder = await PurchaseOrder.create({
      po_number: finalPONumber,
      pr_id: prId || null,
      vendor_id: vendorId || null,
      po_date: poDate || new Date().toISOString().split('T')[0],
      status: 'DRAFT',
      total_amount: 0,
      remarks: remarks || null,
      documents: [],
      org_id: req.orgId || orgId || null,
      is_active: true
    }, { transaction });

    // Create items
    for (const item of items) {
      const { materialId, quantity, unitPrice, uom, remarks: itemRemarks } = item;

      // Validate material exists
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

      const qty = parseInt(quantity) || 1;
      const price = unitPrice ? parseFloat(unitPrice) : null;
      const itemTotal = price ? qty * price : 0;
      totalAmount += itemTotal;

      await PurchaseOrderItem.create({
        po_id: purchaseOrder.po_id,
        material_id: materialId,
        quantity: qty,
        unit_price: price,
        total_amount: itemTotal,
        uom: uom || material.uom || 'PIECE(S)',
        remarks: itemRemarks || null
      }, { transaction });
    }

    // Update total amount
    await purchaseOrder.update({ total_amount: totalAmount }, { transaction });

    await transaction.commit();

    // Fetch created PO
    const createdPO = await PurchaseOrder.findOne({
      where: { po_id: purchaseOrder.po_id },
          include: [
            {
              model: PurchaseOrderItem,
              as: 'items',
              include: [
                {
                  model: Material,
                  as: 'material',
                  attributes: ['material_id', 'material_name', 'product_code', 'material_type', 'uom', 'price', 'gst_percentage', 'sgst_percentage']
                }
              ]
            },
            {
              model: BusinessPartner,
              as: 'vendor'
            }
          ]
        });

    return res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      data: { purchaseOrder: createdPO }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Update purchase order
 * PUT /api/inventory/purchase-orders/:id
 */
export const updatePurchaseOrder = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Validation is handled by validate middleware in route

    const { id } = req.params;
    const {
      vendorId,
      poDate,
      items,
      remarks,
      status
    } = req.body;

    const purchaseOrder = await PurchaseOrder.findOne({
      where: req.withOrg
        ? req.withOrg({ po_id: id, is_active: true })
        : { po_id: id, is_active: true }
    });

    if (!purchaseOrder) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
        code: 'PURCHASE_ORDER_NOT_FOUND'
      });
    }

    // Only allow updates if status is DRAFT
    if (purchaseOrder.status !== 'DRAFT' && status !== purchaseOrder.status) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Only DRAFT purchase orders can be updated',
        code: 'INVALID_STATUS'
      });
    }

    // Update PO fields
    if (vendorId !== undefined) {
      if (vendorId) {
        const vendor = await BusinessPartner.findOne({
          where: { partner_id: vendorId, is_active: true }
        });
        if (!vendor) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: 'Invalid vendor ID',
            code: 'VENDOR_NOT_FOUND'
          });
        }
      }
      purchaseOrder.vendor_id = vendorId || null;
    }
    if (poDate !== undefined) purchaseOrder.po_date = poDate;
    if (remarks !== undefined) purchaseOrder.remarks = remarks;
    if (status !== undefined) purchaseOrder.status = status;
    await purchaseOrder.save({ transaction });

    // Update items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items
      await PurchaseOrderItem.destroy({
        where: { po_id: id },
        transaction
      });

      // Recalculate total
      let totalAmount = 0;

      // Create new items
      for (const item of items) {
        const { materialId, quantity, unitPrice, uom, remarks: itemRemarks } = item;

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

        const qty = parseInt(quantity) || 1;
        const price = unitPrice ? parseFloat(unitPrice) : null;
        const itemTotal = price ? qty * price : 0;
        totalAmount += itemTotal;

        await PurchaseOrderItem.create({
          po_id: id,
          material_id: materialId,
          quantity: qty,
          unit_price: price,
          total_amount: itemTotal,
          uom: uom || material.uom || 'PIECE(S)',
          remarks: itemRemarks || null
        }, { transaction });
      }

      // Update total amount
      await purchaseOrder.update({ total_amount: totalAmount }, { transaction });
    }

    await transaction.commit();

    // Fetch updated PO
    const updatedPO = await PurchaseOrder.findOne({
      where: { po_id: id },
          include: [
            {
              model: PurchaseOrderItem,
              as: 'items',
              include: [
                {
                  model: Material,
                  as: 'material',
                  attributes: ['material_id', 'material_name', 'product_code', 'material_type', 'uom', 'price', 'gst_percentage', 'sgst_percentage']
                }
              ]
            },
            {
              model: BusinessPartner,
              as: 'vendor'
            }
          ]
        });

    return res.status(200).json({
      success: true,
      message: 'Purchase order updated successfully',
      data: { purchaseOrder: updatedPO }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

/**
 * Delete purchase order (soft delete)
 * DELETE /api/inventory/purchase-orders/:id
 */
export const deletePurchaseOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const purchaseOrder = await PurchaseOrder.findOne({
      where: req.withOrg
        ? req.withOrg({ po_id: id, is_active: true })
        : { po_id: id, is_active: true }
    });

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
        code: 'PURCHASE_ORDER_NOT_FOUND'
      });
    }

    // Only allow deletion if status is DRAFT
    if (purchaseOrder.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: 'Only DRAFT purchase orders can be deleted',
        code: 'INVALID_STATUS'
      });
    }

    await purchaseOrder.update({ is_active: false });

    return res.status(200).json({
      success: true,
      message: 'Purchase order deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark Purchase Order as SENT (when email/PO is sent to vendor)
 * POST /api/inventory/purchase-orders/:id/send
 */
export const sendPurchaseOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const purchaseOrder = await PurchaseOrder.findOne({
      where: req.withOrg
        ? req.withOrg({ po_id: id, is_active: true })
        : { po_id: id, is_active: true }
    });

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
        code: 'PURCHASE_ORDER_NOT_FOUND'
      });
    }

    // Only allow sending if status is DRAFT
    if (purchaseOrder.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: `Purchase order is already ${purchaseOrder.status}. Only DRAFT orders can be sent.`,
        code: 'INVALID_STATUS'
      });
    }

    await purchaseOrder.update({
      status: 'SENT'
    });

    const updatedPO = await PurchaseOrder.findOne({
      where: { po_id: id },
      include: [
        {
          model: PurchaseOrderItem,
          as: 'items',
          include: [
            {
              model: Material,
              as: 'material'
            }
          ]
        },
        {
          model: BusinessPartner,
          as: 'vendor'
        },
        {
          model: PurchaseRequest,
          as: 'purchaseRequest',
          required: false
        }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Purchase order marked as SENT',
      data: { purchaseOrder: updatedPO }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark Purchase Order as RECEIVED (when goods are received)
 * POST /api/inventory/purchase-orders/:id/receive
 */
export const receivePurchaseOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const purchaseOrder = await PurchaseOrder.findOne({
      where: req.withOrg
        ? req.withOrg({ po_id: id, is_active: true })
        : { po_id: id, is_active: true }
    });

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
        code: 'PURCHASE_ORDER_NOT_FOUND'
      });
    }

    // Only allow receiving if status is SENT
    if (purchaseOrder.status !== 'SENT') {
      return res.status(400).json({
        success: false,
        message: `Purchase order status is ${purchaseOrder.status}. Only SENT orders can be marked as RECEIVED.`,
        code: 'INVALID_STATUS'
      });
    }

    await purchaseOrder.update({
      status: 'RECEIVED'
    });

    const updatedPO = await PurchaseOrder.findOne({
      where: { po_id: id },
      include: [
        {
          model: PurchaseOrderItem,
          as: 'items',
          include: [
            {
              model: Material,
              as: 'material'
            }
          ]
        },
        {
          model: BusinessPartner,
          as: 'vendor'
        },
        {
          model: PurchaseRequest,
          as: 'purchaseRequest',
          required: false
        }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Purchase order marked as RECEIVED',
      data: { purchaseOrder: updatedPO }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add documents to purchase order
 * POST /api/inventory/purchase-orders/:id/documents
 */
export const addDocumentsToPurchaseOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate file types and sizes
    const maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    
    const invalidFiles = files.filter(file => {
      if (file.fieldname !== 'documents') return false;
      if (file.size > maxFileSize) return true;
      if (!allowedMimeTypes.includes(file.mimetype)) return true;
      return false;
    });

    if (invalidFiles.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some files are invalid. Only images and PDFs are allowed, max size 10MB per file.',
        code: 'VALIDATION_ERROR'
      });
    }

    const purchaseOrder = await PurchaseOrder.findOne({
      where: req.withOrg
        ? req.withOrg({ po_id: id, is_active: true })
        : { po_id: id, is_active: true }
    });

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
        code: 'PURCHASE_ORDER_NOT_FOUND'
      });
    }

    // Get existing documents
    const existingDocuments = purchaseOrder.documents && Array.isArray(purchaseOrder.documents) 
      ? purchaseOrder.documents 
      : [];

    // Check total document count limit
    const maxFiles = parseInt(process.env.MAX_FILES || '10');
    const documentFiles = files.filter(file => file.fieldname === 'documents');
    
    if (existingDocuments.length + documentFiles.length > maxFiles) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${maxFiles} documents allowed. Current: ${existingDocuments.length}, Trying to add: ${documentFiles.length}`,
        code: 'VALIDATION_ERROR'
      });
    }

    // Add new file paths
    const newDocuments = documentFiles.map(file => `/uploads/purchase-orders/${file.filename}`);
    const updatedDocuments = [...existingDocuments, ...newDocuments];

    await purchaseOrder.update({ documents: updatedDocuments });

    console.log(`✅ Added ${newDocuments.length} document(s) to PO ${purchaseOrder.po_number}`);

    res.status(200).json({
      success: true,
      message: 'Documents added successfully',
      data: {
        documents: updatedDocuments,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit Purchase Order (sends email to vendor)
 * POST /api/inventory/purchase-orders/:id/submit
 */
export const submitPurchaseOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const purchaseOrder = await PurchaseOrder.findOne({
      where: req.withOrg
        ? req.withOrg({ po_id: id, is_active: true })
        : { po_id: id, is_active: true },
      include: [
        {
          model: PurchaseOrderItem,
          as: 'items',
          include: [
            {
              model: Material,
              as: 'material'
            }
          ]
        },
        {
          model: BusinessPartner,
          as: 'vendor',
          required: true
        },
        {
          model: PurchaseRequest,
          as: 'purchaseRequest',
          required: false
        }
      ]
    });

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found',
        code: 'PURCHASE_ORDER_NOT_FOUND'
      });
    }

    if (!purchaseOrder.vendor) {
      return res.status(400).json({
        success: false,
        message: 'Vendor information is required to submit purchase order',
        code: 'VENDOR_NOT_FOUND'
      });
    }

    // Get vendor email
    const vendorEmail = purchaseOrder.vendor.contact_email || purchaseOrder.vendor.email;
    if (!vendorEmail) {
      return res.status(400).json({
        success: false,
        message: 'Vendor email address is not available',
        code: 'VENDOR_EMAIL_NOT_FOUND'
      });
    }

    // Update status to SENT
    await purchaseOrder.update({
      status: 'SENT'
    });

    // Send email to vendor
    try {
      const emailResult = await sendPOEmailToVendor(
        purchaseOrder, 
        vendorEmail, 
        purchaseOrder.vendor
      );
      if (!emailResult.success) {
        console.warn('Email sending failed but PO was submitted:', emailResult.message);
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Don't fail the request if email fails, but log it
      // PO status is still updated to SENT
    }

    const updatedPO = await PurchaseOrder.findOne({
      where: { po_id: id },
      include: [
        {
          model: PurchaseOrderItem,
          as: 'items',
          include: [
            {
              model: Material,
              as: 'material'
            }
          ]
        },
        {
          model: BusinessPartner,
          as: 'vendor'
        },
        {
          model: PurchaseRequest,
          as: 'purchaseRequest',
          required: false
        }
      ]
    });

    return res.status(200).json({
      success: true,
      message: 'Purchase order submitted and sent to vendor successfully',
      data: { purchaseOrder: updatedPO }
    });
  } catch (error) {
    next(error);
  }
};

