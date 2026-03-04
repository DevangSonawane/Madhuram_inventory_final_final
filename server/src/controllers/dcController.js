import path from 'path';
import fs from 'fs/promises';
import DeliveryChallan from '../models/DeliveryChallan.js';
import PurchaseOrder from '../models/PO.js';

const UPLOAD_FOLDER = path.join(process.cwd(), 'uploads', 'dc');

const safeParseItems = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return [];
};

const toInt = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
};

const ensureUploadFolder = async () => {
  try {
    await fs.mkdir(UPLOAD_FOLDER, { recursive: true });
  } catch {}
};

const computeTotalsAndStatus = async (payload) => {
  const items = safeParseItems(payload.items);
  const totalChallanItems = Array.isArray(items) ? items.length : 0;
  let totalPoItems = null;

  if (payload.po_id != null) {
    const po = await PurchaseOrder.findByPk(payload.po_id);
    if (po) {
      const poItems = po.items || [];
      totalPoItems = Array.isArray(poItems) ? poItems.length : 0;
    }
  } else if (payload.po_number && payload.project_id != null) {
    const po = await PurchaseOrder.findOne({
      where: { order_no: payload.po_number, project_id: payload.project_id }
    });
    if (po) {
      const poItems = po.items || [];
      totalPoItems = Array.isArray(poItems) ? poItems.length : 0;
    }
  }

  const status = totalPoItems != null && totalPoItems === totalChallanItems ? 'completed' : 'incomplete';

  return { items, totalPoItems, totalChallanItems, status };
};

export const uploadDCFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    await ensureUploadFolder();
    const filePath = path.posix.join('/uploads/dc', req.file.filename);
    return res.status(200).json({ filePath });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to upload file' });
  }
};

export const createDC = async (req, res) => {
  try {
    const projectId = toInt(req.body.project_id);
    const challanNumber = req.body.challan_number?.toString().trim();
    const items = safeParseItems(req.body.items);

    if (projectId == null || !challanNumber || !Array.isArray(items)) {
      return res.status(400).json({ error: 'project_id, challan_number and items are required' });
    }

    const payload = {
      project_id: projectId,
      po_id: toInt(req.body.po_id),
      po_number: req.body.po_number || null,
      challan_number: challanNumber,
      items,
      challan_date: req.body.challan_date || null,
      work_order_number: req.body.work_order_number || null,
      order_date: req.body.order_date || null
    };

    const { totalPoItems, totalChallanItems, status } = await computeTotalsAndStatus(payload);

    payload.total_po_items = totalPoItems;
    payload.total_challan_items = totalChallanItems;
    payload.status = status;

    const created = await DeliveryChallan.create(payload);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create delivery challan' });
  }
};

export const getDCsByProject = async (req, res) => {
  try {
    const projectId = toInt(req.params.projectId);
    if (projectId == null) {
      return res.status(400).json({ error: 'Invalid projectId' });
    }
    const records = await DeliveryChallan.findAll({
      where: { project_id: projectId },
      order: [['created_at', 'DESC']]
    });
    return res.status(200).json(records);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch delivery challans' });
  }
};

export const getDCsByPO = async (req, res) => {
  try {
    const poId = toInt(req.params.poId);
    if (poId == null) {
      return res.status(400).json({ error: 'Invalid poId' });
    }
    const records = await DeliveryChallan.findAll({
      where: { po_id: poId },
      order: [['created_at', 'DESC']]
    });
    return res.status(200).json(records);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch delivery challans' });
  }
};

export const getDCById = async (req, res) => {
  try {
    const dcId = toInt(req.params.id);
    if (dcId == null) {
      return res.status(400).json({ error: 'Invalid DC id' });
    }
    const dc = await DeliveryChallan.findByPk(dcId);
    if (!dc) {
      return res.status(404).json({ error: 'Delivery Challan not found' });
    }
    return res.status(200).json(dc);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch delivery challan' });
  }
};

export const updateDC = async (req, res) => {
  try {
    const dcId = toInt(req.params.id);
    if (dcId == null) {
      return res.status(400).json({ error: 'Invalid DC id' });
    }
    const dc = await DeliveryChallan.findByPk(dcId);
    if (!dc) {
      return res.status(404).json({ error: 'Delivery Challan not found' });
    }

    const payload = {};
    if (req.body.project_id !== undefined) payload.project_id = toInt(req.body.project_id);
    if (req.body.po_id !== undefined) payload.po_id = toInt(req.body.po_id);
    if (req.body.po_number !== undefined) payload.po_number = req.body.po_number || null;
    if (req.body.challan_number !== undefined) payload.challan_number = req.body.challan_number || dc.challan_number;
    if (req.body.items !== undefined) payload.items = safeParseItems(req.body.items);
    if (req.body.challan_date !== undefined) payload.challan_date = req.body.challan_date || null;
    if (req.body.work_order_number !== undefined) payload.work_order_number = req.body.work_order_number || null;
    if (req.body.order_date !== undefined) payload.order_date = req.body.order_date || null;

    const merged = { 
      project_id: payload.project_id ?? dc.project_id,
      po_id: payload.po_id ?? dc.po_id,
      po_number: payload.po_number ?? dc.po_number,
      items: payload.items ?? dc.items
    };

    const { totalPoItems, totalChallanItems, status } = await computeTotalsAndStatus(merged);
    payload.total_po_items = totalPoItems;
    payload.total_challan_items = totalChallanItems;
    payload.status = status;

    await dc.update(payload);
    return res.status(200).json(dc);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update delivery challan' });
  }
};

export const deleteDC = async (req, res) => {
  try {
    const dcId = toInt(req.params.id);
    if (dcId == null) {
      return res.status(400).json({ error: 'Invalid DC id' });
    }
    const dc = await DeliveryChallan.findByPk(dcId);
    if (!dc) {
      return res.status(404).json({ error: 'Delivery Challan not found' });
    }
    await dc.destroy();
    return res.status(200).json({ message: 'Delivery Challan deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to delete delivery challan' });
  }
};
