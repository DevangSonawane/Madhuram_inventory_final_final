import path from 'path';
import MIR from '../models/MIR.js';
import Project from '../models/Project.js';
import { parseJsonLike } from '../utils/jsonField.js';

const toInt = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};

const emptyToNull = (v) => (v === '' ? null : v);

const toBool = (v) => {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1';
  return Boolean(v);
};

const ensureArray = (value, fallback = []) => (Array.isArray(value) ? value : fallback);

const buildPayload = (body = {}, isUpdate = false) => {
  const payload = {
    project_name: emptyToNull(body.project_name),
    project_code: emptyToNull(body.project_code),
    client_name: emptyToNull(body.client_name),
    pmc: emptyToNull(body.pmc),
    contractor: emptyToNull(body.contractor),
    vendor_code: emptyToNull(body.vendor_code),
    challan_no: emptyToNull(body.challan_no),
    mir_refrence_no: emptyToNull(body.mir_refrence_no),
    material_code: emptyToNull(body.material_code),
    inspection_date_time: emptyToNull(body.inspection_date_time),
    client_submission_date: emptyToNull(body.client_submission_date),
    refrence_docs_attached: emptyToNull(body.refrence_docs_attached),
    mir_submited: toBool(body.mir_submited),
    dynamic_field: ensureArray(parseJsonLike(body.dynamic_field, []), []),
    po_id: Object.prototype.hasOwnProperty.call(body, 'po_id') ? toInt(body.po_id) : undefined,
    items: ensureArray(parseJsonLike(body.items, []), []),
    project_id: Object.prototype.hasOwnProperty.call(body, 'project_id') ? toInt(body.project_id) : undefined,
  };

  if (isUpdate) {
    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });
  }

  return payload;
};

export const uploadMirReference = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  return res.status(200).json({ filePath: path.posix.join('/uploads/mir', req.file.filename) });
};

export const createMir = async (req, res) => {
  try {
    const payload = buildPayload(req.body);
    if (payload.project_id == null) return res.status(400).json({ error: 'Invalid project_id: Project does not exist' });

    const project = await Project.findByPk(payload.project_id);
    if (!project) return res.status(400).json({ error: 'Invalid project_id: Project does not exist' });

    const created = await MIR.create(payload);
    return res.status(201).json(created);
  } catch (error) {
    console.error('Create MIR error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getMirs = async (_req, res) => {
  try {
    const rows = await MIR.findAll({ order: [['created_at', 'DESC']] });
    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getMirById = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  const row = await MIR.findByPk(id);
  if (!row) return res.status(404).json({ error: 'MIR not found' });
  return res.status(200).json(row);
};

export const getMirsByProject = async (req, res) => {
  const projectId = parseInt(req.params.projectId, 10);
  if (Number.isNaN(projectId)) return res.status(400).json({ error: 'Invalid projectId' });

  const rows = await MIR.findAll({
    where: { project_id: projectId },
    order: [['created_at', 'DESC']],
  });
  return res.status(200).json(rows);
};

export const updateMir = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const row = await MIR.findByPk(id);
    if (!row) return res.status(404).json({ error: 'MIR not found' });

    const payload = buildPayload(req.body, true);
    if (Object.keys(payload).length === 0) return res.status(400).json({ error: 'No fields to update' });

    if (payload.project_id != null) {
      const project = await Project.findByPk(payload.project_id);
      if (!project) return res.status(400).json({ error: 'Invalid project_id: Project does not exist' });
    }

    await row.update(payload);
    return res.status(200).json(row);
  } catch (error) {
    console.error('Update MIR error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteMir = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

  const row = await MIR.findByPk(id);
  if (!row) return res.status(404).json({ error: 'MIR not found' });

  await row.destroy();
  return res.status(200).json({ message: 'MIR deleted successfully' });
};
