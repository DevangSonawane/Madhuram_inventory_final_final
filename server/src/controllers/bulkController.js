import { Op } from 'sequelize';
import Material from '../models/Material.js';
import InwardEntry from '../models/InwardEntry.js';
import InwardItem from '../models/InwardItem.js';
import MaterialRequest from '../models/MaterialRequest.js';
import StockArea from '../models/StockArea.js';
import { generateGRN } from '../utils/slipGenerator.js';
import sequelize from '../config/database.js';

/**
 * Bulk create/update materials
 */
export const bulkMaterials = async (req, res, next) => {
  try {
    const { materials } = req.body; // Array of material objects

    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Materials array is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const results = {
      created: [],
      updated: [],
      errors: [],
    };

    const transaction = await sequelize.transaction();

    try {
      for (const materialData of materials) {
        try {
          const { materialId, materialName, productCode, materialType, uom, properties, description, orgId } = materialData;

          if (materialId) {
            // Update existing
            const material = await Material.findByPk(materialId);
            if (material) {
              await material.update({
                materialName,
                productCode,
                materialType,
                uom,
                properties,
                description,
                orgId,
              }, { transaction });
              results.updated.push(material);
            } else {
              results.errors.push({ materialData, error: 'Material not found' });
            }
          } else {
            // Create new
            const material = await Material.create({
              material_name: materialName,
              product_code: productCode,
              material_type: materialType,
              uom,
              properties,
              description,
              org_id: orgId,
            }, { transaction });
            results.created.push(material);
          }
        } catch (error) {
          results.errors.push({ materialData, error: error.message });
        }
      }

      await transaction.commit();

      res.status(200).json({
        success: true,
        data: {
          created: results.created.length,
          updated: results.updated.length,
          errors: results.errors.length,
          details: results,
        },
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk create inward entries
 */
export const bulkInward = async (req, res, next) => {
  try {
    const { inwardEntries } = req.body; // Array of inward entry objects

    if (!inwardEntries || !Array.isArray(inwardEntries) || inwardEntries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Inward entries array is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const results = {
      created: [],
      errors: [],
    };

    const transaction = await sequelize.transaction();

    try {
      for (const entryData of inwardEntries) {
        try {
          const {
            date,
            invoiceNumber,
            partyName,
            purchaseOrder,
            stockAreaId,
            vehicleNumber,
            remark,
            items,
          } = entryData;

          // Validate stock area
          const stockArea = await StockArea.findOne({
            where: { area_id: stockAreaId, is_active: true },
          });

          if (!stockArea) {
            results.errors.push({ entryData, error: 'Invalid stock area' });
            continue;
          }

          // Generate slip number
          const slipNumber = await generateGRN();

          // Create inward entry
          const inward = await InwardEntry.create({
            date,
            invoice_number: invoiceNumber,
            party_name: partyName,
            purchase_order: purchaseOrder,
            stock_area_id: stockAreaId,
            vehicle_number: vehicleNumber,
            slip_number: slipNumber,
            remark,
            status: 'DRAFT',
            created_by: req.user?.id,
          }, { transaction });

          // Create items
          if (items && Array.isArray(items)) {
            for (const itemData of items) {
              await InwardItem.create({
                inward_id: inward.inward_id,
                material_id: itemData.materialId,
                quantity: itemData.quantity,
                price: itemData.price,
                serial_number: itemData.serialNumber,
                mac_id: itemData.macId,
                remarks: itemData.remarks,
              }, { transaction });
            }
          }

          results.created.push(inward);
        } catch (error) {
          results.errors.push({ entryData, error: error.message });
        }
      }

      await transaction.commit();

      res.status(200).json({
        success: true,
        data: {
          created: results.created.length,
          errors: results.errors.length,
          details: results,
        },
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk delete material requests (soft delete)
 * POST /api/inventory/material-request/bulk-delete
 */
export const bulkDeleteMaterialRequests = async (req, res, next) => {
  try {
    const { ids } = req.body; // Array of material request IDs

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'IDs array is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const userId = req.user?.id || req.user?.user_id;
    const results = {
      deleted: [],
      notFound: [],
      errors: [],
    };

    const transaction = await sequelize.transaction();

    try {
      for (const id of ids) {
        try {
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
            results.notFound.push(id);
            continue;
          }

          await materialRequest.update({
            is_active: false,
            updated_by: userId
          }, { transaction });

          results.deleted.push(id);
        } catch (error) {
          results.errors.push({ id, error: error.message });
        }
      }

      await transaction.commit();

      res.status(200).json({
        success: true,
        data: {
          deleted: results.deleted.length,
          notFound: results.notFound.length,
          errors: results.errors.length,
          details: results,
        },
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk delete inward entries (soft delete)
 * POST /api/inventory/inward/bulk-delete
 */
export const bulkDeleteInward = async (req, res, next) => {
  try {
    const { ids } = req.body; // Array of inward entry IDs

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'IDs array is required',
        code: 'VALIDATION_ERROR'
      });
    }

    const userId = req.user?.id || req.user?.user_id;
    const results = {
      deleted: [],
      notFound: [],
      errors: [],
    };

    const transaction = await sequelize.transaction();

    try {
      for (const id of ids) {
        try {
          const inward = await InwardEntry.findOne({
            where: req.withOrg
              ? req.withOrg({
                  inward_id: id,
                  is_active: true
                })
              : {
                  inward_id: id,
                  is_active: true
                }
          }, { transaction });

          if (!inward) {
            results.notFound.push(id);
            continue;
          }

          await inward.update({
            is_active: false,
            updated_by: userId
          }, { transaction });

          results.deleted.push(id);
        } catch (error) {
          results.errors.push({ id, error: error.message });
        }
      }

      await transaction.commit();

      res.status(200).json({
        success: true,
        data: {
          deleted: results.deleted.length,
          notFound: results.notFound.length,
          errors: results.errors.length,
          details: results,
        },
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    next(error);
  }
};









