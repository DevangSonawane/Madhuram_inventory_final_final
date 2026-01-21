import { Op } from 'sequelize';
import Material from '../models/Material.js';
import InwardEntry from '../models/InwardEntry.js';
import MaterialRequest from '../models/MaterialRequest.js';
import StockTransfer from '../models/StockTransfer.js';

/**
 * Validate if product code exists
 */
export const validateProductCode = async (req, res, next) => {
  try {
    const { productCode, orgId, excludeMaterialId } = req.body;

    if (!productCode) {
      return res.status(400).json({
        success: false,
        message: 'Product code is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const whereClause = {
      product_code: productCode,
      is_active: true,
    };

    if (orgId) {
      whereClause.org_id = orgId;
    }

    if (excludeMaterialId) {
      whereClause.material_id = { [Op.ne]: excludeMaterialId };
    }

    const material = await Material.findOne({ where: whereClause });

    res.status(200).json({
      success: true,
      data: {
        exists: !!material,
        available: !material,
        material: material ? {
          materialId: material.material_id,
          materialName: material.material_name,
          productCode: material.product_code,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Validate if slip number exists
 */
export const validateSlipNumber = async (req, res, next) => {
  try {
    const { slipNumber, type, excludeId } = req.body;

    if (!slipNumber || !type) {
      return res.status(400).json({
        success: false,
        message: 'Slip number and type are required',
        code: 'VALIDATION_ERROR'
      });
    }

    let exists = false;
    let record = null;

    const whereClause = {
      is_active: true,
    };

    if (excludeId) {
      if (type === 'GRN') {
        whereClause.inward_id = { [Op.ne]: excludeId };
      } else if (type === 'MR') {
        whereClause.request_id = { [Op.ne]: excludeId };
      } else if (type === 'ST') {
        whereClause.transfer_id = { [Op.ne]: excludeId };
      }
    }

    if (type === 'GRN') {
      const inward = await InwardEntry.findOne({
        where: { ...whereClause, slip_number: slipNumber },
      });
      exists = !!inward;
      record = inward ? {
        id: inward.inward_id,
        slipNumber: inward.slip_number,
        date: inward.date,
      } : null;
    } else if (type === 'MR') {
      const mr = await MaterialRequest.findOne({
        where: { ...whereClause, slip_number: slipNumber },
      });
      exists = !!mr;
      record = mr ? {
        id: mr.request_id,
        slipNumber: mr.slip_number,
        date: mr.request_date,
      } : null;
    } else if (type === 'ST') {
      const st = await StockTransfer.findOne({
        where: { ...whereClause, transfer_number: slipNumber },
      });
      exists = !!st;
      record = st ? {
        id: st.transfer_id,
        slipNumber: st.transfer_number,
        date: st.transfer_date,
      } : null;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be GRN, MR, or ST',
        code: 'VALIDATION_ERROR'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        exists,
        available: !exists,
        record,
      },
    });
  } catch (error) {
    next(error);
  }
};

