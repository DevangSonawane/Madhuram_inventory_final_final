import { Op } from 'sequelize';
import InwardEntry from '../models/InwardEntry.js';
import InwardItem from '../models/InwardItem.js';
import StockTransfer from '../models/StockTransfer.js';
import StockTransferItem from '../models/StockTransferItem.js';
import ConsumptionRecord from '../models/ConsumptionRecord.js';
import ConsumptionItem from '../models/ConsumptionItem.js';
import Material from '../models/Material.js';
import StockArea from '../models/StockArea.js';
import MaterialRequest from '../models/MaterialRequest.js';
import sequelize from '../config/database.js';

/**
 * Get transaction history report
 */
export const getTransactionHistory = async (req, res, next) => {
  try {
    const { startDate, endDate, type, materialId, stockAreaId, page = 1, limit = 50 } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {
      is_active: true,
      ...(startDate && endDate && {
        date: {
          [Op.between]: [startDate, endDate],
        },
      }),
      ...(stockAreaId && { stock_area_id: stockAreaId }),
    };

    let transactions = [];
    let totalCount = 0;

    if (!type || type === 'inward') {
      const inwards = await InwardEntry.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: StockArea,
            as: 'stockArea',
            attributes: ['area_id', 'area_name'],
          },
          {
            model: InwardItem,
            as: 'items',
            attributes: ['item_id', 'quantity', 'price'],
            include: [
              {
                model: Material,
                as: 'material',
                attributes: ['material_id', 'material_name', 'product_code'],
                ...(materialId && { where: { material_id: materialId } }),
              },
            ],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['date', 'DESC']],
      });

      transactions.push(...inwards.rows.map(item => ({
        type: 'INWARD',
        id: item.inward_id,
        date: item.date,
        reference: item.slip_number,
        stockArea: item.stockArea?.area_name,
        items: item.items,
        status: item.status,
      })));

      totalCount += inwards.count;
    }

    if (!type || type === 'transfer') {
      const transfers = await StockTransfer.findAndCountAll({
        where: {
          is_active: true,
          ...(startDate && endDate && {
            transfer_date: {
              [Op.between]: [startDate, endDate],
            },
          }),
          ...(stockAreaId && {
            [Op.or]: [
              { from_stock_area_id: stockAreaId },
              { to_stock_area_id: stockAreaId },
            ],
          }),
        },
        include: [
          {
            model: StockArea,
            as: 'fromStockArea',
            attributes: ['area_id', 'area_name'],
          },
          {
            model: StockArea,
            as: 'toStockArea',
            attributes: ['area_id', 'area_name'],
          },
          {
            model: StockTransferItem,
            as: 'items',
            attributes: ['item_id', 'quantity'],
            include: [
              {
                model: Material,
                as: 'material',
                attributes: ['material_id', 'material_name', 'product_code'],
                ...(materialId && { where: { material_id: materialId } }),
              },
            ],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['transfer_date', 'DESC']],
      });

      transactions.push(...transfers.rows.map(item => ({
        type: 'TRANSFER',
        id: item.transfer_id,
        date: item.transfer_date,
        reference: item.transfer_number,
        fromStockArea: item.fromStockArea?.area_name,
        toStockArea: item.toStockArea?.area_name,
        items: item.items,
        status: item.status,
      })));

      totalCount += transfers.count;
    }

    if (!type || type === 'consumption') {
      const consumptions = await ConsumptionRecord.findAndCountAll({
        where: {
          is_active: true,
          ...(startDate && endDate && {
            consumption_date: {
              [Op.between]: [startDate, endDate],
            },
          }),
          ...(stockAreaId && { stock_area_id: stockAreaId }),
        },
        include: [
          {
            model: StockArea,
            as: 'stockArea',
            attributes: ['area_id', 'area_name'],
          },
          {
            model: ConsumptionItem,
            as: 'items',
            attributes: ['item_id', 'quantity'],
            include: [
              {
                model: Material,
                as: 'material',
                attributes: ['material_id', 'material_name', 'product_code'],
                ...(materialId && { where: { material_id: materialId } }),
              },
            ],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['consumption_date', 'DESC']],
      });

      transactions.push(...consumptions.rows.map(item => ({
        type: 'CONSUMPTION',
        id: item.consumption_id,
        date: item.consumption_date,
        reference: item.external_system_ref_id,
        stockArea: item.stockArea?.area_name,
        items: item.items,
      })));

      totalCount += consumptions.count;
    }

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      success: true,
      data: {
        transactions: transactions.slice(0, parseInt(limit)),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get stock movement report
 */
export const getStockMovement = async (req, res, next) => {
  try {
    const { startDate, endDate, materialId, stockAreaId } = req.query;

    const query = `
      SELECT 
        m.material_id,
        m.material_name,
        m.product_code,
        sa.area_name as stock_area,
        COALESCE(inward.qty, 0) as inward_qty,
        COALESCE(transfer_out.qty, 0) as transfer_out_qty,
        COALESCE(transfer_in.qty, 0) as transfer_in_qty,
        COALESCE(consumption.qty, 0) as consumption_qty,
        (COALESCE(inward.qty, 0) - COALESCE(transfer_out.qty, 0) + 
         COALESCE(transfer_in.qty, 0) - COALESCE(consumption.qty, 0)) as net_movement
      FROM materials m
      CROSS JOIN stock_areas sa
      LEFT JOIN (
        SELECT 
          ii.material_id,
          ie.stock_area_id,
          SUM(ii.quantity) as qty
        FROM inward_items ii
        INNER JOIN inward_entries ie ON ii.inward_id = ie.inward_id
        WHERE ie.is_active = true
          AND ie.status IN ('COMPLETED', 'DRAFT')
          ${startDate && endDate ? `AND ie.date BETWEEN '${startDate}' AND '${endDate}'` : ''}
        GROUP BY ii.material_id, ie.stock_area_id
      ) inward ON m.material_id = inward.material_id AND sa.area_id = inward.stock_area_id
      LEFT JOIN (
        SELECT 
          sti.material_id,
          st.from_stock_area_id as stock_area_id,
          SUM(sti.quantity) as qty
        FROM stock_transfer_items sti
        INNER JOIN stock_transfers st ON sti.transfer_id = st.transfer_id
        WHERE st.is_active = true
          AND st.status IN ('COMPLETED', 'IN_TRANSIT')
          ${startDate && endDate ? `AND st.transfer_date BETWEEN '${startDate}' AND '${endDate}'` : ''}
        GROUP BY sti.material_id, st.from_stock_area_id
      ) transfer_out ON m.material_id = transfer_out.material_id AND sa.area_id = transfer_out.stock_area_id
      LEFT JOIN (
        SELECT 
          sti.material_id,
          st.to_stock_area_id as stock_area_id,
          SUM(sti.quantity) as qty
        FROM stock_transfer_items sti
        INNER JOIN stock_transfers st ON sti.transfer_id = st.transfer_id
        WHERE st.is_active = true
          AND st.status IN ('COMPLETED', 'IN_TRANSIT')
          ${startDate && endDate ? `AND st.transfer_date BETWEEN '${startDate}' AND '${endDate}'` : ''}
        GROUP BY sti.material_id, st.to_stock_area_id
      ) transfer_in ON m.material_id = transfer_in.material_id AND sa.area_id = transfer_in.stock_area_id
      LEFT JOIN (
        SELECT 
          ci.material_id,
          cr.stock_area_id,
          SUM(ci.quantity) as qty
        FROM consumption_items ci
        INNER JOIN consumption_records cr ON ci.consumption_id = cr.consumption_id
        WHERE cr.is_active = true
          ${startDate && endDate ? `AND cr.consumption_date BETWEEN '${startDate}' AND '${endDate}'` : ''}
        GROUP BY ci.material_id, cr.stock_area_id
      ) consumption ON m.material_id = consumption.material_id AND sa.area_id = consumption.stock_area_id
      WHERE m.is_active = true
        AND sa.is_active = true
        ${materialId ? `AND m.material_id = '${materialId}'` : ''}
        ${stockAreaId ? `AND sa.area_id = '${stockAreaId}'` : ''}
      HAVING net_movement != 0
      ORDER BY m.material_name, sa.area_name
    `;

    const [results] = await sequelize.query(query);

    res.status(200).json({
      success: true,
      data: {
        movements: results,
        summary: {
          totalMovements: results.length,
          totalInward: results.reduce((sum, item) => sum + parseFloat(item.inward_qty || 0), 0),
          totalTransferOut: results.reduce((sum, item) => sum + parseFloat(item.transfer_out_qty || 0), 0),
          totalTransferIn: results.reduce((sum, item) => sum + parseFloat(item.transfer_in_qty || 0), 0),
          totalConsumption: results.reduce((sum, item) => sum + parseFloat(item.consumption_qty || 0), 0),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get consumption analysis report
 */
export const getConsumptionAnalysis = async (req, res, next) => {
  try {
    const { startDate, endDate, materialId, stockAreaId } = req.query;

    const query = `
      SELECT 
        m.material_id,
        m.material_name,
        m.product_code,
        sa.area_name as stock_area,
        COUNT(DISTINCT cr.consumption_id) as consumption_count,
        SUM(ci.quantity) as total_consumed,
        AVG(ci.quantity) as avg_per_consumption,
        MIN(cr.consumption_date) as first_consumption,
        MAX(cr.consumption_date) as last_consumption
      FROM consumption_items ci
      INNER JOIN consumption_records cr ON ci.consumption_id = cr.consumption_id
      INNER JOIN materials m ON ci.material_id = m.material_id
      INNER JOIN stock_areas sa ON cr.stock_area_id = sa.area_id
      WHERE cr.is_active = true
        AND m.is_active = true
        AND sa.is_active = true
        ${startDate && endDate ? `AND cr.consumption_date BETWEEN '${startDate}' AND '${endDate}'` : ''}
        ${materialId ? `AND m.material_id = '${materialId}'` : ''}
        ${stockAreaId ? `AND sa.area_id = '${stockAreaId}'` : ''}
      GROUP BY m.material_id, m.material_name, m.product_code, sa.area_id, sa.area_name
      ORDER BY total_consumed DESC
    `;

    const [results] = await sequelize.query(query);

    res.status(200).json({
      success: true,
      data: {
        analysis: results,
        summary: {
          totalMaterials: results.length,
          totalConsumption: results.reduce((sum, item) => sum + parseFloat(item.total_consumed || 0), 0),
          totalConsumptionRecords: results.reduce((sum, item) => sum + parseInt(item.consumption_count || 0), 0),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get stock valuation report
 */
export const getStockValuation = async (req, res, next) => {
  try {
    const { materialId, stockAreaId } = req.query;

    const query = `
      SELECT 
        m.material_id,
        m.material_name,
        m.product_code,
        m.material_type,
        sa.area_name as stock_area,
        COALESCE(inward.total_inward, 0) as total_inward,
        COALESCE(transfer_out.total_out, 0) as total_transferred_out,
        COALESCE(transfer_in.total_in, 0) as total_transferred_in,
        COALESCE(consumption.total_consumption, 0) as total_consumed,
        (COALESCE(inward.total_inward, 0) - COALESCE(transfer_out.total_out, 0) + 
         COALESCE(transfer_in.total_in, 0) - COALESCE(consumption.total_consumption, 0)) as current_stock,
        COALESCE(avg_price.avg_price, 0) as avg_unit_price,
        ((COALESCE(inward.total_inward, 0) - COALESCE(transfer_out.total_out, 0) + 
          COALESCE(transfer_in.total_in, 0) - COALESCE(consumption.total_consumption, 0)) * 
         COALESCE(avg_price.avg_price, 0)) as total_value
      FROM materials m
      CROSS JOIN stock_areas sa
      LEFT JOIN (
        SELECT 
          ii.material_id,
          ie.stock_area_id,
          SUM(ii.quantity) as total_inward,
          AVG(ii.price) as avg_price
        FROM inward_items ii
        INNER JOIN inward_entries ie ON ii.inward_id = ie.inward_id
        WHERE ie.is_active = true AND ie.status IN ('COMPLETED', 'DRAFT')
        GROUP BY ii.material_id, ie.stock_area_id
      ) inward ON m.material_id = inward.material_id AND sa.area_id = inward.stock_area_id
      LEFT JOIN (
        SELECT 
          sti.material_id,
          st.from_stock_area_id as stock_area_id,
          SUM(sti.quantity) as total_out
        FROM stock_transfer_items sti
        INNER JOIN stock_transfers st ON sti.transfer_id = st.transfer_id
        WHERE st.is_active = true AND st.status IN ('COMPLETED', 'IN_TRANSIT')
        GROUP BY sti.material_id, st.from_stock_area_id
      ) transfer_out ON m.material_id = transfer_out.material_id AND sa.area_id = transfer_out.stock_area_id
      LEFT JOIN (
        SELECT 
          sti.material_id,
          st.to_stock_area_id as stock_area_id,
          SUM(sti.quantity) as total_in
        FROM stock_transfer_items sti
        INNER JOIN stock_transfers st ON sti.transfer_id = st.transfer_id
        WHERE st.is_active = true AND st.status IN ('COMPLETED', 'IN_TRANSIT')
        GROUP BY sti.material_id, st.to_stock_area_id
      ) transfer_in ON m.material_id = transfer_in.material_id AND sa.area_id = transfer_in.stock_area_id
      LEFT JOIN (
        SELECT 
          ci.material_id,
          cr.stock_area_id,
          SUM(ci.quantity) as total_consumption
        FROM consumption_items ci
        INNER JOIN consumption_records cr ON ci.consumption_id = cr.consumption_id
        WHERE cr.is_active = true
        GROUP BY ci.material_id, cr.stock_area_id
      ) consumption ON m.material_id = consumption.material_id AND sa.area_id = consumption.stock_area_id
      LEFT JOIN (
        SELECT 
          ii.material_id,
          AVG(ii.price) as avg_price
        FROM inward_items ii
        INNER JOIN inward_entries ie ON ii.inward_id = ie.inward_id
        WHERE ie.is_active = true AND ii.price IS NOT NULL
        GROUP BY ii.material_id
      ) avg_price ON m.material_id = avg_price.material_id
      WHERE m.is_active = true
        AND sa.is_active = true
        ${materialId ? `AND m.material_id = '${materialId}'` : ''}
        ${stockAreaId ? `AND sa.area_id = '${stockAreaId}'` : ''}
      HAVING current_stock > 0
      ORDER BY total_value DESC
    `;

    const [results] = await sequelize.query(query);

    res.status(200).json({
      success: true,
      data: {
        valuations: results,
        summary: {
          totalItems: results.length,
          totalStockValue: results.reduce((sum, item) => sum + parseFloat(item.total_value || 0), 0),
          totalStockQuantity: results.reduce((sum, item) => sum + parseFloat(item.current_stock || 0), 0),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};













