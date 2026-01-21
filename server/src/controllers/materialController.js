import Material from '../models/Material.js';
// validationResult removed - using validate middleware in routes instead
import { Op } from 'sequelize';

/**
 * Get all materials with filtering and pagination
 * GET /api/inventory/materials
 */
export const getAllMaterials = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      materialType = '',
      orgId = '',
      showInactive = false
    } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 50, 1);
    const offset = (pageNumber - 1) * limitNumber;

    // Build where clause
    const whereClause = req.withOrg ? req.withOrg({}) : {};

    if (!showInactive || showInactive === 'false') {
      whereClause.is_active = true;
    }

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { material_name: { [Op.like]: `%${search}%` } },
        { product_code: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    // Material type filter
    if (materialType && materialType !== 'All Types' && materialType !== '') {
      whereClause.material_type = materialType;
    }

    const { count, rows: materials } = await Material.findAndCountAll({
      where: whereClause,
      limit: limitNumber,
      offset: offset,
      order: [['material_name', 'ASC']],
      distinct: true,
    });

    const totalMaterials = typeof count === 'number' ? count : 0;

    return res.status(200).json({
      success: true,
      data: {
        materials,
        pagination: {
          currentPage: pageNumber,
          totalPages: limitNumber ? Math.max(Math.ceil(totalMaterials / limitNumber), 1) : 1,
          totalItems: totalMaterials,
          itemsPerPage: limitNumber
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single material by ID
 * GET /api/inventory/materials/:id
 */
export const getMaterialById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const material = await Material.findOne({
      where: req.withOrg
        ? req.withOrg({ material_id: id, is_active: true })
        : { material_id: id, is_active: true }
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found',
        code: 'MATERIAL_NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      data: material
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new material
 * POST /api/inventory/materials
 */
export const createMaterial = async (req, res, next) => {
  try {
    // Validation is handled by validate middleware in route

    const { 
      materialName, 
      productCode, 
      materialType, 
      uom, 
      properties, 
      description, 
      hsn,
      gstPercentage,
      sgstPercentage,
      price,
      assetId,
      materialProperty,
      orgId 
    } = req.body;

    // Get uploaded files from multer (only files with fieldname 'documents')
    const uploadedFiles = (req.files || []).filter(file => file.fieldname === 'documents');
    let documents = null;
    if (uploadedFiles.length > 0) {
      documents = uploadedFiles.map(file => `/uploads/materials/${file.filename}`);
    }

    // Check if material with same product code already exists
    const existingMaterial = await Material.findOne({
      where: {
        product_code: productCode,
        org_id: orgId || null
      }
    });

    if (existingMaterial) {
      return res.status(409).json({
        success: false,
        message: 'Material with this product code already exists',
        code: 'UNIQUE_CONSTRAINT_ERROR'
      });
    }

    const material = await Material.create({
      material_name: materialName,
      product_code: productCode,
      material_type: materialType,
      uom: uom || 'PIECE(S)',
      properties: properties || null,
      description: description || null,
      hsn: hsn || null,
      gst_percentage: gstPercentage ? parseFloat(gstPercentage) : null,
      sgst_percentage: sgstPercentage ? parseFloat(sgstPercentage) : null,
      price: price ? parseFloat(price) : null,
      asset_id: assetId || null,
      material_property: materialProperty || null,
      documents: documents || null,
      org_id: req.orgId || orgId || null,
      is_active: true
    });

    return res.status(201).json({
      success: true,
      message: 'Material created successfully',
      data: material
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update material
 * PUT /api/inventory/materials/:id
 */
export const updateMaterial = async (req, res, next) => {
  try {
    // Validation is handled by validate middleware in route

    const { id } = req.params;
    const { 
      materialName, 
      productCode, 
      materialType, 
      uom, 
      properties, 
      description,
      hsn,
      gstPercentage,
      sgstPercentage,
      price,
      assetId,
      materialProperty
    } = req.body;

    // Find material first
    const material = await Material.findOne({
      where: req.withOrg
        ? req.withOrg({ material_id: id, is_active: true })
        : { material_id: id, is_active: true }
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found',
        code: 'MATERIAL_NOT_FOUND'
      });
    }

    // Get uploaded files from multer (only files with fieldname 'documents')
    const uploadedFiles = (req.files || []).filter(file => file.fieldname === 'documents');
    let documents = undefined;
    if (uploadedFiles.length > 0) {
      const newDocuments = uploadedFiles.map(file => `/uploads/materials/${file.filename}`);
      // If material already has documents, append new ones; otherwise set new ones
      if (material.documents && Array.isArray(material.documents)) {
        documents = [...material.documents, ...newDocuments];
      } else {
        documents = newDocuments;
      }
    }

    // Check if product code is being changed and if new code already exists
    if (productCode && productCode !== material.product_code) {
      const existingMaterial = await Material.findOne({
        where: req.withOrg
          ? req.withOrg({ product_code: productCode, material_id: { [Op.ne]: id } })
          : {
              product_code: productCode,
              org_id: material.org_id,
              material_id: { [Op.ne]: id }
            }
      });

      if (existingMaterial) {
        return res.status(409).json({
          success: false,
          message: 'Material with this product code already exists',
          code: 'UNIQUE_CONSTRAINT_ERROR'
        });
      }
    }

    await material.update({
      material_name: materialName || material.material_name,
      product_code: productCode || material.product_code,
      material_type: materialType || material.material_type,
      uom: uom || material.uom,
      properties: properties !== undefined ? properties : material.properties,
      description: description !== undefined ? description : material.description,
      hsn: hsn !== undefined ? hsn : material.hsn,
      gst_percentage: gstPercentage !== undefined ? (gstPercentage ? parseFloat(gstPercentage) : null) : material.gst_percentage,
      sgst_percentage: sgstPercentage !== undefined ? (sgstPercentage ? parseFloat(sgstPercentage) : null) : material.sgst_percentage,
      price: price !== undefined ? (price ? parseFloat(price) : null) : material.price,
      asset_id: assetId !== undefined ? assetId : material.asset_id,
      material_property: materialProperty !== undefined ? materialProperty : material.material_property,
      documents: documents !== undefined ? documents : material.documents
    });

    return res.status(200).json({
      success: true,
      message: 'Material updated successfully',
      data: material
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete material (soft delete)
 * DELETE /api/inventory/materials/:id
 */
export const deleteMaterial = async (req, res, next) => {
  try {
    const { id } = req.params;

    const material = await Material.findOne({
      where: req.withOrg
        ? req.withOrg({ material_id: id, is_active: true })
        : { material_id: id, is_active: true }
    });

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Material not found',
        code: 'MATERIAL_NOT_FOUND'
      });
    }

    await material.update({
      is_active: false
    });

    return res.status(200).json({
      success: true,
      message: 'Material deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};











