import { Op } from 'sequelize';
import Material from '../models/Material.js';
import InwardEntry from '../models/InwardEntry.js';
import InwardItem from '../models/InwardItem.js';
import StockArea from '../models/StockArea.js';
import MaterialRequest from '../models/MaterialRequest.js';
import StockTransfer from '../models/StockTransfer.js';
import ConsumptionRecord from '../models/ConsumptionRecord.js';
import ConsumptionItem from '../models/ConsumptionItem.js';
import StockTransferItem from '../models/StockTransferItem.js';
import sequelize from '../config/database.js';
import { QueryTypes } from 'sequelize';

/**
 * Export materials to CSV
 */
export const exportMaterials = async (req, res, next) => {
  try {
    const { format = 'csv' } = req.query;

    const materials = await Material.findAll({
      where: { is_active: true },
      order: [['material_name', 'ASC']],
    });

    if (format === 'csv') {
      // CSV format
      const headers = ['Material ID', 'Material Name', 'Product Code', 'Material Type', 'UOM', 'Description'];
      const rows = materials.map(m => [
        m.material_id,
        m.material_name,
        m.product_code,
        m.material_type,
        m.uom || '',
        m.description || '',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=materials.csv');
      res.send(csv);
    } else {
      // JSON format
      res.status(200).json({
        success: true,
        data: materials,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Export inward entries
 */
export const exportInward = async (req, res, next) => {
  try {
    const { format = 'csv', startDate, endDate } = req.query;

    const whereClause = {
      is_active: true,
      ...(startDate && endDate && {
        date: {
          [Op.between]: [startDate, endDate],
        },
      }),
    };

    const inwards = await InwardEntry.findAll({
      where: whereClause,
      include: [
        {
          model: StockArea,
          as: 'stockArea',
          attributes: ['area_name'],
        },
        {
          model: InwardItem,
          as: 'items',
          include: [
            {
              model: Material,
              as: 'material',
              attributes: ['material_name', 'product_code'],
            },
          ],
        },
      ],
      order: [['date', 'DESC']],
    });

    if (format === 'csv') {
      const headers = ['Slip Number', 'Date', 'Invoice Number', 'Party Name', 'Stock Area', 'Items Count', 'Status'];
      const rows = inwards.map(i => [
        i.slip_number,
        i.date,
        i.invoice_number,
        i.party_name,
        i.stockArea?.area_name || '',
        i.items?.length || 0,
        i.status,
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=inward_entries.csv');
      res.send(csv);
    } else {
      res.status(200).json({
        success: true,
        data: inwards,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Export stock levels
 */
export const exportStockLevels = async (req, res, next) => {
  try {
    const { format = 'csv' } = req.query;

    // Use the stock levels query from stockLevelController
    // For simplicity, return JSON - can be enhanced to use actual stock calculation
    const materials = await Material.findAll({
      where: { is_active: true },
      include: [
        {
          model: InwardItem,
          as: 'inwardItems',
          attributes: [],
        },
      ],
      order: [['material_name', 'ASC']],
    });

    if (format === 'csv') {
      const headers = ['Material Name', 'Product Code', 'Material Type', 'UOM'];
      const rows = materials.map(m => [
        m.material_name,
        m.product_code,
        m.material_type,
        m.uom || '',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=stock_levels.csv');
      res.send(csv);
    } else {
      res.status(200).json({
        success: true,
        data: materials,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Export stock movement report
 */
export const exportStockMovement = async (req, res, next) => {
  try {
    const { format = 'csv', startDate, endDate, materialId, stockAreaId } = req.query;

    // Re-use the complex SQL query from reportController.js
    const replacements = {};
    let whereMaterial = '';
    let whereStockArea = '';
    let whereDate = '';

    if (materialId) {
      whereMaterial = 'AND m.material_id = :materialId';
      replacements.materialId = materialId;
    }
    if (stockAreaId) {
      whereStockArea = 'AND sa.area_id = :stockAreaId';
      replacements.stockAreaId = stockAreaId;
    }
    if (startDate && endDate) {
      whereDate = 'AND (ie.date BETWEEN :startDate AND :endDate OR st.transfer_date BETWEEN :startDate AND :endDate OR cr.consumption_date BETWEEN :startDate AND :endDate)';
      replacements.startDate = startDate;
      replacements.endDate = endDate;
    }

    const query = `
      SELECT
        m.material_name,
        m.product_code,
        sa.area_name AS stock_area,
        COALESCE(inward.total_in, 0) AS inward_qty,
        COALESCE(transfer_out.total_out, 0) AS transfer_out_qty,
        COALESCE(transfer_in.total_in, 0) AS transfer_in_qty,
        COALESCE(consumption.total_consumption, 0) AS consumption_qty,
        (COALESCE(inward.total_in, 0) + COALESCE(transfer_in.total_in, 0) - COALESCE(transfer_out.total_out, 0) - COALESCE(consumption.total_consumption, 0)) AS net_movement
      FROM materials m
      CROSS JOIN stock_areas sa
      LEFT JOIN (
        SELECT
          ii.material_id,
          ie.stock_area_id,
          SUM(ii.quantity) AS total_in
        FROM inward_items ii
        INNER JOIN inward_entries ie ON ii.inward_id = ie.inward_id
        WHERE ie.is_active = true ${whereDate ? `AND ie.date BETWEEN :startDate AND :endDate` : ''}
        GROUP BY ii.material_id, ie.stock_area_id
      ) inward ON m.material_id = inward.material_id AND sa.area_id = inward.stock_area_id
      LEFT JOIN (
        SELECT
          sti.material_id,
          st.from_stock_area_id AS stock_area_id,
          SUM(sti.quantity) AS total_out
        FROM stock_transfer_items sti
        INNER JOIN stock_transfers st ON sti.transfer_id = st.transfer_id
        WHERE st.is_active = true AND st.status IN ('COMPLETED', 'IN_TRANSIT') ${whereDate ? `AND st.transfer_date BETWEEN :startDate AND :endDate` : ''}
        GROUP BY sti.material_id, st.from_stock_area_id
      ) transfer_out ON m.material_id = transfer_out.material_id AND sa.area_id = transfer_out.stock_area_id
      LEFT JOIN (
        SELECT
          sti.material_id,
          st.to_stock_area_id AS stock_area_id,
          SUM(sti.quantity) AS total_in
        FROM stock_transfer_items sti
        INNER JOIN stock_transfers st ON sti.transfer_id = st.transfer_id
        WHERE st.is_active = true AND st.status IN ('COMPLETED', 'IN_TRANSIT') ${whereDate ? `AND st.transfer_date BETWEEN :startDate AND :endDate` : ''}
        GROUP BY sti.material_id, st.to_stock_area_id
      ) transfer_in ON m.material_id = transfer_in.material_id AND sa.area_id = transfer_in.stock_area_id
      LEFT JOIN (
        SELECT
          ci.material_id,
          cr.stock_area_id,
          SUM(ci.quantity) AS total_consumption
        FROM consumption_items ci
        INNER JOIN consumption_records cr ON ci.consumption_id = cr.consumption_id
        WHERE cr.is_active = true ${whereDate ? `AND cr.consumption_date BETWEEN :startDate AND :endDate` : ''}
        GROUP BY ci.material_id, cr.stock_area_id
      ) consumption ON m.material_id = consumption.material_id AND sa.area_id = consumption.stock_area_id
      WHERE m.is_active = true
        AND sa.is_active = true
        ${whereMaterial}
        ${whereStockArea}
      ORDER BY m.material_name, sa.area_name;
    `;

    const movements = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    if (format === 'csv') {
      const headers = ['Material Name', 'Product Code', 'Stock Area', 'Inward Quantity', 'Transfer Out Quantity', 'Transfer In Quantity', 'Consumption Quantity', 'Net Movement'];
      const rows = movements.map(item => [
        item.material_name,
        item.product_code,
        item.stock_area,
        item.inward_qty,
        item.transfer_out_qty,
        item.transfer_in_qty,
        item.consumption_qty,
        item.net_movement,
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=stock_movement_report.csv');
      res.send(csv);
    } else {
      res.status(200).json({
        success: true,
        data: movements,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Export consumption analysis report
 */
export const exportConsumptionAnalysis = async (req, res, next) => {
  try {
    const { format = 'csv', startDate, endDate, materialId, stockAreaId } = req.query;

    const replacements = {};
    let whereMaterial = '';
    let whereStockArea = '';
    let whereDate = '';

    if (materialId) {
      whereMaterial = 'AND m.material_id = :materialId';
      replacements.materialId = materialId;
    }
    if (stockAreaId) {
      whereStockArea = 'AND sa.area_id = :stockAreaId';
      replacements.stockAreaId = stockAreaId;
    }
    if (startDate && endDate) {
      whereDate = 'AND cr.consumption_date BETWEEN :startDate AND :endDate';
      replacements.startDate = startDate;
      replacements.endDate = endDate;
    }

    const query = `
      SELECT
        m.material_name,
        m.product_code,
        sa.area_name AS stock_area,
        COUNT(DISTINCT cr.consumption_id) AS consumption_count,
        SUM(ci.quantity) AS total_consumed,
        AVG(ci.quantity) AS avg_per_consumption,
        MIN(cr.consumption_date) AS first_consumption,
        MAX(cr.consumption_date) AS last_consumption
      FROM consumption_records cr
      INNER JOIN consumption_items ci ON cr.consumption_id = ci.consumption_id
      INNER JOIN materials m ON ci.material_id = m.material_id
      INNER JOIN stock_areas sa ON cr.stock_area_id = sa.area_id
      WHERE cr.is_active = true
        ${whereMaterial}
        ${whereStockArea}
        ${whereDate}
      GROUP BY m.material_id, sa.area_id
      ORDER BY m.material_name, sa.area_name;
    `;

    const analysis = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    if (format === 'csv') {
      const headers = ['Material Name', 'Product Code', 'Stock Area', 'Consumption Count', 'Total Consumed', 'Average Per Consumption', 'First Consumption Date', 'Last Consumption Date'];
      const rows = analysis.map(item => [
        item.material_name,
        item.product_code,
        item.stock_area,
        item.consumption_count,
        item.total_consumed,
        parseFloat(item.avg_per_consumption).toFixed(2),
        item.first_consumption,
        item.last_consumption,
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=consumption_analysis_report.csv');
      res.send(csv);
    } else {
      res.status(200).json({
        success: true,
        data: analysis,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Export stock valuation report
 */
export const exportStockValuation = async (req, res, next) => {
  try {
    const { format = 'csv', materialId, stockAreaId } = req.query;

    const replacements = {};
    let whereMaterial = '';
    let whereStockArea = '';

    if (materialId) {
      whereMaterial = 'AND m.material_id = :materialId';
      replacements.materialId = materialId;
    }
    if (stockAreaId) {
      whereStockArea = 'AND sa.area_id = :stockAreaId';
      replacements.stockAreaId = stockAreaId;
    }

    const query = `
      SELECT
        m.material_name,
        m.product_code,
        m.material_type,
        sa.area_name AS stock_area,
        COUNT(im.id) AS current_stock,
        COALESCE(AVG(ii.price), 0) AS avg_unit_price,
        (COUNT(im.id) * COALESCE(AVG(ii.price), 0)) AS total_value
      FROM inventory_master im
      INNER JOIN materials m ON im.material_id = m.material_id
      INNER JOIN stock_areas sa ON im.location_id = sa.area_id AND im.current_location_type = 'WAREHOUSE'
      LEFT JOIN inward_items ii ON im.inward_item_id = ii.item_id
      WHERE im.is_active = true AND im.status = 'AVAILABLE'
        ${whereMaterial}
        ${whereStockArea}
      GROUP BY m.material_id, sa.area_id
      ORDER BY m.material_name, sa.area_name;
    `;

    const valuations = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    if (format === 'csv') {
      const headers = ['Material Name', 'Product Code', 'Material Type', 'Stock Area', 'Current Stock', 'Average Unit Price', 'Total Value'];
      const rows = valuations.map(item => [
        item.material_name,
        item.product_code,
        item.material_type,
        item.stock_area,
        item.current_stock,
        parseFloat(item.avg_unit_price).toFixed(2),
        parseFloat(item.total_value).toFixed(2),
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=stock_valuation_report.csv');
      res.send(csv);
    } else {
      res.status(200).json({
        success: true,
        data: valuations,
      });
    }
  } catch (error) {
    next(error);
  }
};







