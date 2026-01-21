import { Op } from 'sequelize';
import HSNCode from '../models/HSNCode.js';

/**
 * Get all HSN codes
 * GET /api/inventory/hsn-codes
 */
export const getAllHSNCodes = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      showInactive = false
    } = req.query;

    const limitNumber = parseInt(limit);
    const offset = (parseInt(page) - 1) * limitNumber;

    const condition = req.withOrg ? req.withOrg({}) : {};
    
    if (search) {
      condition[Op.or] = [
        { hsn_code: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (showInactive !== 'true') {
      condition.is_active = true;
    }

    const { count, rows: hsnCodes } = await HSNCode.findAndCountAll({
      where: condition,
      limit: limitNumber,
      offset: offset,
      order: [['hsn_code', 'ASC']]
    });

    return res.status(200).json({
      success: true,
      message: 'HSN codes fetched successfully',
      data: {
        hsnCodes,
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
 * Get HSN code by ID
 * GET /api/inventory/hsn-codes/:id
 */
export const getHSNCodeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const hsnCode = await HSNCode.findOne({
      where: req.withOrg ? req.withOrg({ hsn_code_id: id, is_active: true }) : { hsn_code_id: id, is_active: true }
    });

    if (!hsnCode) {
      return res.status(404).json({
        success: false,
        message: 'HSN code not found',
        code: 'HSN_CODE_NOT_FOUND'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'HSN code fetched successfully',
      data: { hsnCode }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new HSN code
 * POST /api/inventory/hsn-codes
 */
export const createHSNCode = async (req, res, next) => {
  try {
    const { hsnCode, description, gstRate } = req.body;

    const existingHSNCode = await HSNCode.findOne({
      where: req.withOrg ? req.withOrg({ hsn_code: hsnCode }) : { hsn_code: hsnCode }
    });

    if (existingHSNCode) {
      return res.status(409).json({
        success: false,
        message: 'HSN code with this value already exists',
        code: 'UNIQUE_CONSTRAINT_ERROR'
      });
    }

    const newHSNCode = await HSNCode.create({
      hsn_code: hsnCode,
      description: description || null,
      gst_rate: gstRate ? parseFloat(gstRate) : null,
      org_id: req.orgId || null,
      is_active: true
    });

    return res.status(201).json({
      success: true,
      message: 'HSN code created successfully',
      data: { hsnCode: newHSNCode }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update HSN code
 * PUT /api/inventory/hsn-codes/:id
 */
export const updateHSNCode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { hsnCode, description, gstRate, isActive } = req.body;

    const hsnCodeRecord = await HSNCode.findOne({
      where: req.withOrg ? req.withOrg({ hsn_code_id: id }) : { hsn_code_id: id }
    });

    if (!hsnCodeRecord) {
      return res.status(404).json({
        success: false,
        message: 'HSN code not found',
        code: 'HSN_CODE_NOT_FOUND'
      });
    }

    if (hsnCode && hsnCode !== hsnCodeRecord.hsn_code) {
      const existingHSNCode = await HSNCode.findOne({
        where: req.withOrg ? req.withOrg({ hsn_code: hsnCode, hsn_code_id: { [Op.ne]: id } }) : { hsn_code: hsnCode, hsn_code_id: { [Op.ne]: id } }
      });
      if (existingHSNCode) {
        return res.status(409).json({
          success: false,
          message: 'HSN code with this value already exists',
          code: 'UNIQUE_CONSTRAINT_ERROR'
        });
      }
    }

    await hsnCodeRecord.update({
      hsn_code: hsnCode !== undefined ? hsnCode : hsnCodeRecord.hsn_code,
      description: description !== undefined ? description : hsnCodeRecord.description,
      gst_rate: gstRate !== undefined ? (gstRate ? parseFloat(gstRate) : null) : hsnCodeRecord.gst_rate,
      is_active: isActive !== undefined ? isActive : hsnCodeRecord.is_active
    });

    return res.status(200).json({
      success: true,
      message: 'HSN code updated successfully',
      data: { hsnCode: hsnCodeRecord }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete HSN code (soft delete)
 * DELETE /api/inventory/hsn-codes/:id
 */
export const deleteHSNCode = async (req, res, next) => {
  try {
    const { id } = req.params;

    const hsnCode = await HSNCode.findOne({
      where: req.withOrg ? req.withOrg({ hsn_code_id: id, is_active: true }) : { hsn_code_id: id, is_active: true }
    });

    if (!hsnCode) {
      return res.status(404).json({
        success: false,
        message: 'HSN code not found',
        code: 'HSN_CODE_NOT_FOUND'
      });
    }

    await hsnCode.update({ is_active: false });

    return res.status(200).json({
      success: true,
      message: 'HSN code deleted successfully',
      data: { hsnCode }
    });
  } catch (error) {
    next(error);
  }
};

