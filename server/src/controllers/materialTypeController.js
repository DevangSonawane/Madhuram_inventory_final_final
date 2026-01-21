import MaterialType from '../models/MaterialType.js';
import { Op } from 'sequelize';

/**
 * Get all material types
 * GET /api/inventory/material-types
 */
export const getAllMaterialTypes = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      orgId
    } = req.query;

    const limitNumber = parseInt(limit);
    const offset = (parseInt(page) - 1) * limitNumber;

    const whereClause = { is_active: true };

    if (req.withOrg) {
      Object.assign(whereClause, req.withOrg({}));
    } else if (orgId) {
      whereClause.org_id = orgId;
    } else {
      whereClause.org_id = null;
    }

    if (search) {
      whereClause[Op.or] = [
        { type_name: { [Op.like]: `%${search}%` } },
        { type_code: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: materialTypes } = await MaterialType.findAndCountAll({
      where: whereClause,
      limit: limitNumber,
      offset: offset,
      order: [['type_name', 'ASC']],
    });

    return res.status(200).json({
      success: true,
      data: {
        materialTypes,
        pagination: {
          totalItems: count,
          totalPages: Math.ceil(count / limitNumber),
          currentPage: parseInt(page),
          itemsPerPage: limitNumber
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single material type by ID
 * GET /api/inventory/material-types/:id
 */
export const getMaterialTypeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const materialType = await MaterialType.findOne({
      where: req.withOrg
        ? req.withOrg({ type_id: id, is_active: true })
        : { type_id: id, is_active: true }
    });

    if (!materialType) {
      return res.status(404).json({
        success: false,
        message: 'Material type not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: { materialType }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new material type
 * POST /api/inventory/material-types
 */
export const createMaterialType = async (req, res, next) => {
  try {
    const {
      typeName,
      typeCode,
      description,
      orgId
    } = req.body;

    // Check if material type with same name already exists
    const existingType = await MaterialType.findOne({
      where: req.withOrg
        ? req.withOrg({ type_name: typeName, is_active: true })
        : {
            type_name: typeName,
            org_id: orgId || null,
            is_active: true
          }
    });

    if (existingType) {
      return res.status(409).json({
        success: false,
        message: 'Material type with this name already exists',
        code: 'UNIQUE_CONSTRAINT_ERROR'
      });
    }

    const materialType = await MaterialType.create({
      type_name: typeName,
      type_code: typeCode || null,
      description: description || null,
      org_id: req.orgId || orgId || null,
      is_active: true
    });

    return res.status(201).json({
      success: true,
      message: 'Material type created successfully',
      data: materialType
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update material type
 * PUT /api/inventory/material-types/:id
 */
export const updateMaterialType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      typeName,
      typeCode,
      description
    } = req.body;

    const materialType = await MaterialType.findOne({
      where: req.withOrg
        ? req.withOrg({ type_id: id, is_active: true })
        : { type_id: id, is_active: true }
    });

    if (!materialType) {
      return res.status(404).json({
        success: false,
        message: 'Material type not found',
        code: 'MATERIAL_TYPE_NOT_FOUND'
      });
    }

    // Check if type name is being changed and if new name already exists
    if (typeName && typeName !== materialType.type_name) {
      const existingType = await MaterialType.findOne({
        where: req.withOrg
          ? req.withOrg({ type_name: typeName, type_id: { [Op.ne]: id }, is_active: true })
          : {
              type_name: typeName,
              org_id: materialType.org_id,
              type_id: { [Op.ne]: id },
              is_active: true
            }
      });

      if (existingType) {
        return res.status(409).json({
          success: false,
          message: 'Material type with this name already exists',
          code: 'UNIQUE_CONSTRAINT_ERROR'
        });
      }
    }

    await materialType.update({
      type_name: typeName || materialType.type_name,
      type_code: typeCode !== undefined ? typeCode : materialType.type_code,
      description: description !== undefined ? description : materialType.description,
    });

    return res.status(200).json({
      success: true,
      message: 'Material type updated successfully',
      data: materialType
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete material type (soft delete)
 * DELETE /api/inventory/material-types/:id
 */
export const deleteMaterialType = async (req, res, next) => {
  try {
    const { id } = req.params;

    const materialType = await MaterialType.findOne({
      where: req.withOrg
        ? req.withOrg({ type_id: id, is_active: true })
        : { type_id: id, is_active: true }
    });

    if (!materialType) {
      return res.status(404).json({
        success: false,
        message: 'Material type not found',
        code: 'MATERIAL_TYPE_NOT_FOUND'
      });
    }

    await materialType.update({ is_active: false });

    return res.status(200).json({
      success: true,
      message: 'Material type deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

