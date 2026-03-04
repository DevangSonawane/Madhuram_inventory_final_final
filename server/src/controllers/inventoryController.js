import Inventory from '../models/Inventory.js';

const toInt = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};

const toNum = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

export const createInventory = async (req, res) => {
  try {
    const payload = {
      project_id: toInt(req.body.project_id),
      brand: req.body.brand,
      quantity: toNum(req.body.quantity),
      name: req.body.name,
      price: toNum(req.body.price),
      stockin: Boolean(req.body.stockin),
    };

    if (
      payload.project_id == null ||
      !payload.brand ||
      payload.quantity == null ||
      !payload.name ||
      payload.price == null ||
      typeof req.body.stockin === 'undefined'
    ) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const created = await Inventory.create(payload);
    return res.status(201).json(created);
  } catch (error) {
    console.error('Create inventory error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getInventories = async (_req, res) => {
  const rows = await Inventory.findAll({ order: [['created_at', 'DESC']] });
  return res.status(200).json(rows);
};

export const getInventoryById = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  const row = await Inventory.findByPk(id);
  if (!row) return res.status(404).json({ error: 'Inventory item not found' });
  return res.status(200).json(row);
};

export const getInventoriesByProject = async (req, res) => {
  const projectId = parseInt(req.params.projectId, 10);
  if (Number.isNaN(projectId)) return res.status(400).json({ error: 'Invalid projectId' });

  const rows = await Inventory.findAll({
    where: { project_id: projectId },
    order: [['created_at', 'DESC']],
  });
  return res.status(200).json(rows);
};

export const updateInventory = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  const row = await Inventory.findByPk(id);
  if (!row) return res.status(404).json({ error: 'Inventory item not found' });

  const payload = {};
  if (req.body.brand !== undefined) payload.brand = req.body.brand;
  if (req.body.quantity !== undefined) payload.quantity = toNum(req.body.quantity);
  if (req.body.name !== undefined) payload.name = req.body.name;
  if (req.body.price !== undefined) payload.price = toNum(req.body.price);
  if (req.body.stockin !== undefined) payload.stockin = Boolean(req.body.stockin);

  if (Object.keys(payload).length === 0) return res.status(400).json({ error: 'No fields to update' });

  await row.update(payload);
  return res.status(200).json(row);
};

export const deleteInventory = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  const row = await Inventory.findByPk(id);
  if (!row) return res.status(404).json({ error: 'Inventory item not found' });

  await row.destroy();
  return res.status(200).json({ message: 'Inventory item deleted successfully' });
};
