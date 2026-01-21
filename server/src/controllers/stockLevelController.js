import { Op, fn, col, literal, Sequelize } from 'sequelize';
import InwardItem from '../models/InwardItem.js';
import InwardEntry from '../models/InwardEntry.js';
import StockTransferItem from '../models/StockTransferItem.js';
import StockTransfer from '../models/StockTransfer.js';
import ConsumptionItem from '../models/ConsumptionItem.js';
import ConsumptionRecord from '../models/ConsumptionRecord.js';
import Material from '../models/Material.js';
import StockArea from '../models/StockArea.js';
import sequelize from '../config/database.js';

/**
 * Get stock levels for materials
 * Stock calculation: Inward - Transfers Out + Transfers In - Consumption
 */
export const getStockLevels = async (req, res, next) => {
  try {
    const { materialId, stockAreaId, materialType, orgId } = req.query;

    // Build base where conditions
    const baseWhere = { is_active: true };
    if (orgId) baseWhere.org_id = orgId;

    // Get inward quantities using raw query for better performance
    const inwardQuery = `
      SELECT 
        ii.material_id,
        COALESCE(SUM(ii.quantity), 0) as total_inward
      FROM inward_items ii
      INNER JOIN inward_entries ie ON ii.inward_id = ie.inward_id
      WHERE ie.is_active = true
        AND ie.status IN ('COMPLETED', 'DRAFT')
        ${stockAreaId ? `AND ie.stock_area_id = '${stockAreaId}'` : ''}
        ${materialId ? `AND ii.material_id = '${materialId}'` : ''}
        ${orgId ? `AND ie.org_id = '${orgId}'` : ''}
      GROUP BY ii.material_id
    `;

    // Get transfers OUT
    const transferOutQuery = `
      SELECT 
        sti.material_id,
        COALESCE(SUM(sti.quantity), 0) as total_out
      FROM stock_transfer_items sti
      INNER JOIN stock_transfers st ON sti.transfer_id = st.transfer_id
      WHERE st.is_active = true
        AND st.status IN ('COMPLETED', 'IN_TRANSIT')
        ${stockAreaId ? `AND st.from_stock_area_id = '${stockAreaId}'` : ''}
        ${materialId ? `AND sti.material_id = '${materialId}'` : ''}
        ${orgId ? `AND st.org_id = '${orgId}'` : ''}
      GROUP BY sti.material_id
    `;

    // Get transfers IN
    const transferInQuery = `
      SELECT 
        sti.material_id,
        COALESCE(SUM(sti.quantity), 0) as total_in
      FROM stock_transfer_items sti
      INNER JOIN stock_transfers st ON sti.transfer_id = st.transfer_id
      WHERE st.is_active = true
        AND st.status IN ('COMPLETED', 'IN_TRANSIT')
        ${stockAreaId ? `AND st.to_stock_area_id = '${stockAreaId}'` : ''}
        ${materialId ? `AND sti.material_id = '${materialId}'` : ''}
        ${orgId ? `AND st.org_id = '${orgId}'` : ''}
      GROUP BY sti.material_id
    `;

    // Get consumption
    const consumptionQuery = `
      SELECT 
        ci.material_id,
        COALESCE(SUM(ci.quantity), 0) as total_consumption
      FROM consumption_items ci
      INNER JOIN consumption_records cr ON ci.consumption_id = cr.consumption_id
      WHERE cr.is_active = true
        ${stockAreaId ? `AND cr.stock_area_id = '${stockAreaId}'` : ''}
        ${materialId ? `AND ci.material_id = '${materialId}'` : ''}
        ${orgId ? `AND cr.org_id = '${orgId}'` : ''}
      GROUP BY ci.material_id
    `;

    const [inwardResults] = await sequelize.query(inwardQuery);
    const [transferOutResults] = await sequelize.query(transferOutQuery);
    const [transferInResults] = await sequelize.query(transferInQuery);
    const [consumptionResults] = await sequelize.query(consumptionQuery);

    // Build stock levels map
    const stockLevelsMap = new Map();

    // Process inward quantities
    inwardResults.forEach(item => {
      stockLevelsMap.set(item.material_id, {
        materialId: item.material_id,
        totalInward: parseFloat(item.total_inward) || 0,
        totalTransferredOut: 0,
        totalTransferredIn: 0,
        totalConsumed: 0,
        currentStock: parseFloat(item.total_inward) || 0,
      });
    });

    // Process transfers out
    transferOutResults.forEach(item => {
      const existing = stockLevelsMap.get(item.material_id) || {
        materialId: item.material_id,
        totalInward: 0,
        totalTransferredOut: 0,
        totalTransferredIn: 0,
        totalConsumed: 0,
        currentStock: 0,
      };
      existing.totalTransferredOut = parseFloat(item.total_out) || 0;
      existing.currentStock -= existing.totalTransferredOut;
      stockLevelsMap.set(item.material_id, existing);
    });

    // Process transfers in
    transferInResults.forEach(item => {
      const existing = stockLevelsMap.get(item.material_id) || {
        materialId: item.material_id,
        totalInward: 0,
        totalTransferredOut: 0,
        totalTransferredIn: 0,
        totalConsumed: 0,
        currentStock: 0,
      };
      existing.totalTransferredIn = parseFloat(item.total_in) || 0;
      existing.currentStock += existing.totalTransferredIn;
      stockLevelsMap.set(item.material_id, existing);
    });

    // Process consumption
    consumptionResults.forEach(item => {
      const existing = stockLevelsMap.get(item.material_id) || {
        materialId: item.material_id,
        totalInward: 0,
        totalTransferredOut: 0,
        totalTransferredIn: 0,
        totalConsumed: 0,
        currentStock: 0,
      };
      existing.totalConsumed = parseFloat(item.total_consumption) || 0;
      existing.currentStock -= existing.totalConsumed;
      stockLevelsMap.set(item.material_id, existing);
    });

    // Convert to array
    const stockLevelsArray = Array.from(stockLevelsMap.values());
    
    // Fetch material details
    const materialIds = stockLevelsArray.map(level => level.materialId);
    const materialWhere = {
      is_active: true,
      ...(materialIds.length > 0 && { material_id: { [Op.in]: materialIds } }),
      ...(materialType && { material_type: materialType }),
    };
    
    const materials = materialIds.length > 0 ? await Material.findAll({
      where: materialWhere,
    }) : [];

    // Combine with material details
    const stockLevels = stockLevelsArray.map(level => {
      const material = materials.find(m => m.material_id === level.materialId);
      return {
        ...level,
        material: material ? {
          materialId: material.material_id,
          materialName: material.material_name,
          productCode: material.product_code,
          materialType: material.material_type,
          uom: material.uom,
        } : null,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        stockLevels,
        summary: {
          totalMaterials: stockLevels.length,
          totalStock: stockLevels.reduce((sum, item) => sum + item.currentStock, 0),
          lowStockCount: stockLevels.filter(item => item.currentStock <= 0).length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get stock level for a specific material
 */
export const getStockLevelByMaterial = async (req, res, next) => {
  try {
    const { materialId } = req.params;
    const { stockAreaId, orgId } = req.query;

    // Use the same query approach but for single material
    const inwardQuery = `
      SELECT COALESCE(SUM(ii.quantity), 0) as total_inward
      FROM inward_items ii
      INNER JOIN inward_entries ie ON ii.inward_id = ie.inward_id
      WHERE ie.is_active = true
        AND ie.status IN ('COMPLETED', 'DRAFT')
        AND ii.material_id = '${materialId}'
        ${stockAreaId ? `AND ie.stock_area_id = '${stockAreaId}'` : ''}
        ${orgId ? `AND ie.org_id = '${orgId}'` : ''}
    `;

    const transferOutQuery = `
      SELECT COALESCE(SUM(sti.quantity), 0) as total_out
      FROM stock_transfer_items sti
      INNER JOIN stock_transfers st ON sti.transfer_id = st.transfer_id
      WHERE st.is_active = true
        AND st.status IN ('COMPLETED', 'IN_TRANSIT')
        AND sti.material_id = '${materialId}'
        ${stockAreaId ? `AND st.from_stock_area_id = '${stockAreaId}'` : ''}
        ${orgId ? `AND st.org_id = '${orgId}'` : ''}
    `;

    const transferInQuery = `
      SELECT COALESCE(SUM(sti.quantity), 0) as total_in
      FROM stock_transfer_items sti
      INNER JOIN stock_transfers st ON sti.transfer_id = st.transfer_id
      WHERE st.is_active = true
        AND st.status IN ('COMPLETED', 'IN_TRANSIT')
        AND sti.material_id = '${materialId}'
        ${stockAreaId ? `AND st.to_stock_area_id = '${stockAreaId}'` : ''}
        ${orgId ? `AND st.org_id = '${orgId}'` : ''}
    `;

    const consumptionQuery = `
      SELECT COALESCE(SUM(ci.quantity), 0) as total_consumption
      FROM consumption_items ci
      INNER JOIN consumption_records cr ON ci.consumption_id = cr.consumption_id
      WHERE cr.is_active = true
        AND ci.material_id = '${materialId}'
        ${stockAreaId ? `AND cr.stock_area_id = '${stockAreaId}'` : ''}
        ${orgId ? `AND cr.org_id = '${orgId}'` : ''}
    `;

    const [[inwardResult]] = await sequelize.query(inwardQuery);
    const [[transferOutResult]] = await sequelize.query(transferOutQuery);
    const [[transferInResult]] = await sequelize.query(transferInQuery);
    const [[consumptionResult]] = await sequelize.query(consumptionQuery);

    const totalInward = parseFloat(inwardResult?.total_inward) || 0;
    const totalTransferredOut = parseFloat(transferOutResult?.total_out) || 0;
    const totalTransferredIn = parseFloat(transferInResult?.total_in) || 0;
    const totalConsumed = parseFloat(consumptionResult?.total_consumption) || 0;
    const currentStock = totalInward - totalTransferredOut + totalTransferredIn - totalConsumed;

    // Get material details
    const material = await Material.findByPk(materialId);

    res.status(200).json({
      success: true,
      data: {
        materialId,
        material: material ? {
          materialId: material.material_id,
          materialName: material.material_name,
          productCode: material.product_code,
          materialType: material.material_type,
          uom: material.uom,
        } : null,
        totalInward,
        totalTransferredOut,
        totalTransferredIn,
        totalConsumed,
        currentStock,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get stock summary across all areas
 */
export const getStockSummary = async (req, res, next) => {
  try {
    const { orgId } = req.query;

    // Get all stock levels
    const stockLevelsQuery = `
      SELECT 
        m.material_id,
        m.material_name,
        m.product_code,
        m.material_type,
        m.uom,
        COALESCE(inward.total_inward, 0) as total_inward,
        COALESCE(transfer_out.total_out, 0) as total_transferred_out,
        COALESCE(transfer_in.total_in, 0) as total_transferred_in,
        COALESCE(consumption.total_consumption, 0) as total_consumed,
        (COALESCE(inward.total_inward, 0) - COALESCE(transfer_out.total_out, 0) + 
         COALESCE(transfer_in.total_in, 0) - COALESCE(consumption.total_consumption, 0)) as current_stock
      FROM materials m
      LEFT JOIN (
        SELECT 
          ii.material_id,
          SUM(ii.quantity) as total_inward
        FROM inward_items ii
        INNER JOIN inward_entries ie ON ii.inward_id = ie.inward_id
        WHERE ie.is_active = true AND ie.status IN ('COMPLETED', 'DRAFT')
        ${orgId ? `AND ie.org_id = '${orgId}'` : ''}
        GROUP BY ii.material_id
      ) inward ON m.material_id = inward.material_id
      LEFT JOIN (
        SELECT 
          sti.material_id,
          SUM(sti.quantity) as total_out
        FROM stock_transfer_items sti
        INNER JOIN stock_transfers st ON sti.transfer_id = st.transfer_id
        WHERE st.is_active = true AND st.status IN ('COMPLETED', 'IN_TRANSIT')
        ${orgId ? `AND st.org_id = '${orgId}'` : ''}
        GROUP BY sti.material_id
      ) transfer_out ON m.material_id = transfer_out.material_id
      LEFT JOIN (
        SELECT 
          sti.material_id,
          SUM(sti.quantity) as total_in
        FROM stock_transfer_items sti
        INNER JOIN stock_transfers st ON sti.transfer_id = st.transfer_id
        WHERE st.is_active = true AND st.status IN ('COMPLETED', 'IN_TRANSIT')
        ${orgId ? `AND st.org_id = '${orgId}'` : ''}
        GROUP BY sti.material_id
      ) transfer_in ON m.material_id = transfer_in.material_id
      LEFT JOIN (
        SELECT 
          ci.material_id,
          SUM(ci.quantity) as total_consumption
        FROM consumption_items ci
        INNER JOIN consumption_records cr ON ci.consumption_id = cr.consumption_id
        WHERE cr.is_active = true
        ${orgId ? `AND cr.org_id = '${orgId}'` : ''}
        GROUP BY ci.material_id
      ) consumption ON m.material_id = consumption.material_id
      WHERE m.is_active = true
    `;

    const [results] = await sequelize.query(stockLevelsQuery);

    const summary = {
      totalMaterials: results.length,
      totalStock: results.reduce((sum, item) => sum + parseFloat(item.current_stock || 0), 0),
      lowStockCount: results.filter(item => parseFloat(item.current_stock || 0) <= 0).length,
      byMaterialType: {},
    };

    // Group by material type
    results.forEach(item => {
      const type = item.material_type || 'Unknown';
      if (!summary.byMaterialType[type]) {
        summary.byMaterialType[type] = {
          count: 0,
          totalStock: 0,
          lowStockCount: 0,
        };
      }
      summary.byMaterialType[type].count++;
      summary.byMaterialType[type].totalStock += parseFloat(item.current_stock || 0);
      if (parseFloat(item.current_stock || 0) <= 0) {
        summary.byMaterialType[type].lowStockCount++;
      }
    });

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};
