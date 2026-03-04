import path from 'path';
import MIR from '../models/MIR.js';
import { parseJsonLike } from '../utils/jsonField.js';

const toInt = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};

const buildPayload = (body = {}, isUpdate = false) => {
  const payload = {
    project_name: body.project_name,
    project_code: body.project_code,
    client_name: body.client_name,
    pmc: body.pmc,
    contractor: body.contractor,
    vendor_code: body.vendor_code,
    mir_refrence_no: body.mir_refrence_no,
    material_code: body.material_code,
    inspection_date_time: body.inspection_date_time,
    client_submission_date: body.client_submission_date,
    refrence_docs_attached: body.refrence_docs_attached,
    mir_submited: body.mir_submited,
    dynamic_field: parseJsonLike(body.dynamic_field, []),
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
