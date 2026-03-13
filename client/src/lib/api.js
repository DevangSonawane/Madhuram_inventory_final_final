const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://api.festmate.in').replace(/\/$/, '');

const MIR_STRING_FIELDS = [
  'project_name',
  'project_code',
  'client_name',
  'pmc',
  'contractor',
  'vendor_code',
  'challan_no',
  'mir_refrence_no',
  'material_code',
  'inspection_date_time',
  'client_submission_date',
  'refrence_docs_attached',
];
const MIR_ONLY_REQUIRED_FIELDS = new Set(['challan_no', 'mir_refrence_no']);

const MIR_CREATE_REQUIRED_FIELDS = [
  'challan_no',
  'mir_refrence_no',
  'po_id',
];

const isPlainObject = (value) => value != null && typeof value === 'object' && !Array.isArray(value);

const toTrimmedString = (value) => {
  if (value == null) return '';
  return String(value).trim();
};
const todayDateOnly = () => new Date().toISOString().slice(0, 10);
const nowIsoDateTime = () => new Date().toISOString();
const withMirDefault = (field, value) => {
  if (value) return value;
  if (field === 'inspection_date_time') return nowIsoDateTime();
  if (field === 'client_submission_date') return todayDateOnly();
  if (MIR_ONLY_REQUIRED_FIELDS.has(field)) return value;
  return '-';
};

const toValidInteger = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const isIsoDate = (value) => {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
};

const isIsoDateTime = (value) => {
  if (typeof value !== 'string') return false;
  if (!value.includes('T')) return false;
  return !Number.isNaN(Date.parse(value));
};

const parseArrayLike = (value, fallback = []) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
};

const normalizeProjectStartDateForApi = (value) => {
  if (!value) return '';
  if (typeof value !== 'string') return value;
  if (value.includes('T')) return value;

  let normalized = value.trim();
  const ddMmYyyy = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddMmYyyy) {
    const [, dd, mm, yyyy] = ddMmYyyy;
    normalized = `${yyyy}-${mm}-${dd}`;
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  // Fallback: send raw value; backend may still accept/normalize it.
  return value;
};

const normalizeDynamicField = (value) => {
  const list = parseArrayLike(value, []);
  return list
    .filter((entry) => entry != null)
    .map((entry) => {
      if (!isPlainObject(entry)) return null;
      const key = toTrimmedString(entry.key);
      if (!key) return null;
      const normalizedValue = typeof entry.value === 'string' ? entry.value : JSON.stringify(entry.value ?? '');
      return { key, value: normalizedValue };
    })
    .filter(Boolean);
};

const normalizeMirItems = (value) => {
  const list = parseArrayLike(value, []);
  return list.map((item, index) => {
    if (!isPlainObject(item)) {
      return {
        srno: index + 1,
        hsn: '',
        description: '',
        qty: 0,
        UOM: '',
        Rate: 0,
        Amount: 0,
        remark: '',
      };
    }

    const srno = Number(item.srno);
    const qty = Number(item.qty);
    const rate = Number(item.Rate);
    const amount = Number(item.Amount);
    const hsn = toTrimmedString(item.hsn);
    const description = toTrimmedString(item.description);
    const uom = toTrimmedString(item.UOM ?? item.uom ?? item.unit ?? item.Unit);
    const remark = item.remark == null ? '' : String(item.remark);
    const inspected = Boolean(item.inspected);

    return {
      srno: Number.isFinite(srno) ? srno : index + 1,
      hsn,
      description,
      qty: Number.isFinite(qty) ? qty : 0,
      UOM: uom,
      Rate: Number.isFinite(rate) ? rate : 0,
      Amount: Number.isFinite(amount) ? amount : 0,
      remark,
      inspected,
    };
  });
};

const validateMirPayload = (payload = {}, { strictRequired = false } = {}) => {
  const errors = [];

  MIR_STRING_FIELDS.forEach((field) => {
    if (!toTrimmedString(payload[field])) {
      if (strictRequired && MIR_CREATE_REQUIRED_FIELDS.includes(field)) {
        errors.push(`${field} is required`);
      }
      return;
    }

    if (field === 'client_submission_date' && !isIsoDate(payload[field])) {
      errors.push('client_submission_date must be in YYYY-MM-DD format');
    }
    if (field === 'inspection_date_time' && !isIsoDateTime(payload[field])) {
      errors.push('inspection_date_time must be an ISO datetime string');
    }
  });

  if (payload.project_id != null && toValidInteger(payload.project_id) == null) {
    errors.push('project_id must be a positive integer when provided');
  }
  if (toValidInteger(payload.po_id) == null) {
    if (strictRequired && MIR_CREATE_REQUIRED_FIELDS.includes('po_id')) {
      errors.push('po_id must be a positive integer');
    }
  }

  if (!Array.isArray(payload.dynamic_field)) {
    errors.push('dynamic_field must be an array');
  }
  if (!Array.isArray(payload.items)) {
    errors.push('items must be an array');
  } else if (strictRequired && MIR_CREATE_REQUIRED_FIELDS.includes('items') && payload.items.length === 0) {
    errors.push('items must contain at least one row');
  }

  return { valid: errors.length === 0, errors };
};

const normalizeMirPayload = (data = {}, options = {}) => {
  const errors = [];
  const payload = {};

  MIR_STRING_FIELDS.forEach((field) => {
    payload[field] = withMirDefault(field, toTrimmedString(data[field]));
  });

  payload.project_id = toValidInteger(data.project_id);
  payload.po_id = toValidInteger(data.po_id);

  const mirSubmited = data.mir_submited;
  if (typeof mirSubmited === 'boolean') {
    payload.mir_submited = mirSubmited;
  } else if (mirSubmited === 'true' || mirSubmited === '1' || mirSubmited === 1) {
    payload.mir_submited = true;
  } else if (mirSubmited === 'false' || mirSubmited === '0' || mirSubmited === 0) {
    payload.mir_submited = false;
  } else {
    payload.mir_submited = false;
  }

  payload.dynamic_field = normalizeDynamicField(data.dynamic_field);
  payload.items = normalizeMirItems(data.items);

  const fieldValidation = validateMirPayload(payload, options);
  return {
    payload,
    errors: [...errors, ...fieldValidation.errors],
  };
};

export const api = {
  // Auth
  login: async (email, password) => {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(response);
  },

  signup: async (userData) => {
    const response = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  createUser: async (userData) => {
    const response = await fetch(`${BASE_URL}/api/auth/users`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  logout: async () => {
    const token = getToken();
    if (!token) return { success: true }; // Already "logged out" locally

    const response = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}` // Assuming Bearer token, though doc doesn't explicitly say header format, it's standard.
      },
    });
    // Logout is client-side mainly, so we just return success usually
    return response.ok ? { success: true } : handleResponse(response);
  },

  forgotPassword: async (data) => {
    const response = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Users
  getUsers: async () => {
    const response = await fetch(`${BASE_URL}/api/auth/users`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getUserById: async (id) => {
    const response = await fetch(`${BASE_URL}/api/auth/users/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updateUser: async (id, data) => {
    const payload = { ...data };
    if (Array.isArray(payload.project_list) && !Array.isArray(payload.project)) {
      payload.project = payload.project_list;
    }

    const response = await fetch(`${BASE_URL}/api/auth/users/${id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  deleteUser: async (id) => {
    const response = await fetch(`${BASE_URL}/api/auth/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Dashboard
  getDashboardStats: async ({ projectId, userId } = {}) => {
    const params = new URLSearchParams();
    if (projectId != null && projectId !== '') params.set('project_id', String(projectId));
    if (userId != null && userId !== '') params.set('user_id', String(userId));
    const query = params.toString();
    const response = await fetch(`${BASE_URL}/api/dashboard/stats${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getDashboardActivity: async ({ userId, projectId, entityType, action, limit, offset } = {}) => {
    if (userId == null || userId === '') {
      throw new Error('userId is required for dashboard activity');
    }
    const params = new URLSearchParams();
    params.set('user_id', String(userId));
    if (projectId != null && projectId !== '') params.set('project_id', String(projectId));
    if (entityType) params.set('entity_type', entityType);
    if (action) params.set('action', action);
    if (limit != null) params.set('limit', String(limit));
    if (offset != null) params.set('offset', String(offset));
    const query = params.toString();
    const response = await fetch(`${BASE_URL}/api/dashboard/activity${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  deleteDashboardActivity: async (id) => {
    const response = await fetch(`${BASE_URL}/api/dashboard/activity/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Notifications (Dashboard module)
  getNotifications: async ({ userId, isRead, limit, offset } = {}) => {
    const params = new URLSearchParams();
    if (userId != null && userId !== '') params.set('user_id', String(userId));
    if (typeof isRead === 'boolean') params.set('is_read', String(isRead));
    if (limit != null) params.set('limit', String(limit));
    if (offset != null) params.set('offset', String(offset));
    const query = params.toString();
    const response = await fetch(`${BASE_URL}/api/dashboard/notifications${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getUnreadNotificationCount: async (userId) => {
    const params = new URLSearchParams();
    if (userId != null && userId !== '') params.set('user_id', String(userId));
    const query = params.toString();
    const response = await fetch(`${BASE_URL}/api/dashboard/notifications/unread-count${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  markNotificationRead: async (id) => {
    const response = await fetch(`${BASE_URL}/api/dashboard/notifications/${id}/read`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  markAllNotificationsRead: async (userId) => {
    const params = new URLSearchParams();
    if (userId != null && userId !== '') params.set('user_id', String(userId));
    const query = params.toString();
    const response = await fetch(`${BASE_URL}/api/dashboard/notifications/read-all${query ? `?${query}` : ''}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  deleteNotification: async (id) => {
    const response = await fetch(`${BASE_URL}/api/dashboard/notifications/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getDashboardSocketUrl: ({ userId, token } = {}) => {
    const explicit = (import.meta.env.VITE_DASHBOARD_WS_URL || '').trim();
    const wsBase = explicit || BASE_URL.replace(/^http/i, 'ws');
    const wsUrl = new URL(`${wsBase}/ws/activity`);
    if (userId != null && userId !== '') wsUrl.searchParams.set('user_id', String(userId));
    if (token) wsUrl.searchParams.set('token', token);
    return wsUrl.toString();
  },

  // Projects
  createProject: async (projectData) => {
    const formData = new FormData();
    
    // According to API docs: POST /api/projects uses multipart form data
    // Request fields: project_name, project_startdate, client_name, location, floor, 
    // estimate_value, wo_number, work_order_file, pr_po_tracking[], samples[], mas_file, ml_management[]
    
    // Required/Text fields
    formData.append('project_name', projectData.project_name || '');
    
    // API expects project_startdate in CREATE request (ISO format).
    // Accept both YYYY-MM-DD and DD/MM/YYYY safely.
    const startDate = normalizeProjectStartDateForApi(projectData.product_duration || projectData.project_startdate || '');
    formData.append('project_startdate', startDate);
    
    formData.append('client_name', projectData.client_name || '');
    formData.append('location', projectData.location || '');
    formData.append('floor', projectData.floor || '');
    formData.append('estimate_value', projectData.estimate_value || '');
    formData.append('wo_number', projectData.wo_number || '');
    formData.append('work_order_information', projectData.work_order_information || '');
    
    // Arrays - pr_po_tracking
    const prPoTracking = projectData.pr_po_tracking && Array.isArray(projectData.pr_po_tracking) 
      ? projectData.pr_po_tracking 
      : [];
    prPoTracking.forEach((item, index) => {
      formData.append(`pr_po_tracking[${index}]`, item);
    });
    
    // Arrays - samples
    const samples = projectData.samples && Array.isArray(projectData.samples) 
      ? projectData.samples 
      : [];
    samples.forEach((item, index) => {
      formData.append(`samples[${index}]`, item);
    });
    
    // ml_management - API expects array format in CREATE: ["asda"]
    const mlManagement = projectData.ml_management;
    if (mlManagement) {
      if (Array.isArray(mlManagement)) {
        mlManagement.forEach((item, index) => {
          formData.append(`ml_management[${index}]`, item);
        });
      } else if (mlManagement.ml_task && mlManagement.ml_task.trim()) {
        // Convert object to array format for create
        formData.append('ml_management[0]', mlManagement.ml_task);
      }
    }
    
    // Files
    if (projectData.work_order_file instanceof File) {
      formData.append('work_order_file', projectData.work_order_file);
    }
    if (typeof projectData.work_order_file_path === 'string' && projectData.work_order_file_path.trim()) {
      formData.append('work_order_file_path', projectData.work_order_file_path.trim());
    }
    
    if (projectData.mas_file instanceof File) {
      formData.append('mas_file', projectData.mas_file);
    }

    const response = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: getAuthHeaders(), // Don't set Content-Type, browser will set it with boundary for FormData
      body: formData,
    });
    return handleResponse(response);
  },

  getProjects: async () => {
    const response = await fetch(`${BASE_URL}/api/projects`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getProjectById: async (id) => {
    const response = await fetch(`${BASE_URL}/api/projects/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updateProject: async (id, projectData) => {
    const formData = new FormData();
    
    // According to API docs: PUT /api/projects/{id} uses multipart form data
    // Request fields: project_name, product_duration, client_name, work_order_information,
    // pr_po_tracking[], samples[], mas_file, ml_management{ml_task}
    
    // Text fields
    formData.append('project_name', projectData.project_name || '');
    
    // UPDATE uses product_duration (not project_startdate) per API docs
    // API example shows: "product_duration": "2023-12-31" (date string, not ISO)
    // So we send date as-is (YYYY-MM-DD format from date input)
    formData.append('product_duration', projectData.product_duration || '');
    
    formData.append('client_name', projectData.client_name || '');
    formData.append('location', projectData.location || '');
    formData.append('floor', projectData.floor || '');
    formData.append('estimate_value', projectData.estimate_value || '');
    formData.append('work_order_information', projectData.work_order_information || '');
    formData.append('wo_number', projectData.wo_number || '');
    
    // Arrays - pr_po_tracking
    const prPoTracking = projectData.pr_po_tracking && Array.isArray(projectData.pr_po_tracking) 
      ? projectData.pr_po_tracking 
      : [];
    prPoTracking.forEach((item, index) => {
      formData.append(`pr_po_tracking[${index}]`, item);
    });
    
    // Arrays - samples
    const samples = projectData.samples && Array.isArray(projectData.samples) 
      ? projectData.samples 
      : [];
    samples.forEach((item, index) => {
      formData.append(`samples[${index}]`, item);
    });
    
    // ml_management - API expects object format in UPDATE: { "ml_task": "..." }
    const mlManagement = projectData.ml_management;
    if (mlManagement) {
      if (typeof mlManagement === 'object' && mlManagement.ml_task !== undefined) {
        // Send as object format for update
        formData.append('ml_management[ml_task]', mlManagement.ml_task || '');
      } else if (Array.isArray(mlManagement) && mlManagement.length > 0) {
        // Convert array to object format for update
        formData.append('ml_management[ml_task]', mlManagement[0] || '');
      }
    }
    
    // Files (only if new files are provided)
    if (projectData.work_order_file instanceof File) {
      formData.append('work_order_file', projectData.work_order_file);
    }
    if (projectData.mas_file instanceof File) {
      formData.append('mas_file', projectData.mas_file);
    }

    const response = await fetch(`${BASE_URL}/api/projects/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: formData,
    });
    return handleResponse(response);
  },

  deleteProject: async (id) => {
    const response = await fetch(`${BASE_URL}/api/projects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Helper to get file URL
  getFileUrl: (filename) => {
    if (!filename) return null;
    return `${BASE_URL}/uploads/${filename}`;
  },

  /**
   * In dev (localhost), returns same-origin URL so fetch goes through Vite proxy and avoids CORS.
   * In production, returns the given absolute URL as-is.
   */
  getCompressedFileFetchUrl: (absoluteUrl) => {
    if (typeof window === 'undefined') return absoluteUrl;
    try {
      const u = new URL(absoluteUrl);
      if (u.hostname === 'api.festmate.in' && u.pathname.startsWith('/uploads/')) {
        const pathAfterUploads = u.pathname.slice('/uploads/'.length);
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          return `${window.location.origin}/api-uploads/${pathAfterUploads}`;
        }
      }
    } catch {
      return absoluteUrl;
    }
    return absoluteUrl;
  },

  /**
   * Compression API: POST /api/compress
   * Uploads a file and compresses it.
   * - Images: iteratively reduces quality/resolution so output is under 10MB.
   * - Other files: Gzip compression (best effort).
   * Request body: file (required, binary). Response: original_size, compressed_size, url, message.
   */
  compressFile: async (file) => {
    const formData = new FormData();
    if (file instanceof File) {
      formData.append('file', file); // required field per API: file * string(binary)
    } else {
      return { success: false, error: 'Invalid file' };
    }

    const response = await fetch(`${BASE_URL}/api/compress`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    return handleResponse(response);
  },

  getApiFileUrl: (path) => {
    if (!path) return '';
    if (typeof path === 'string' && /^https?:\/\//i.test(path)) return path;
    const cleaned = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_URL}${cleaned}`;
  },

  // BOQ (Bill of Quantities) – Base URL: https://api.festmate.in, Storage: /uploads/boq
  createBOQ: async (data) => {
    const formData = new FormData();
    formData.append('category', data.category || '');
    formData.append('project_id', data.project_id);
    if (data.item_code != null && data.item_code !== '') formData.append('item_code', data.item_code);
    if (data.description != null && data.description !== '') formData.append('description', data.description);
    if (data.floor != null && data.floor !== '') formData.append('floor', data.floor);
    if (data.unit != null && data.unit !== '') formData.append('unit', data.unit);
    if (data.quantity != null && data.quantity !== '') formData.append('quantity', data.quantity);
    if (data.rate != null && data.rate !== '') formData.append('rate', data.rate);
    if (data.amount != null && data.amount !== '') formData.append('amount', data.amount);
    if (data.boq_file instanceof File) formData.append('boq_file', data.boq_file);

    const response = await fetch(`${BASE_URL}/api/boq`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    return handleResponse(response);
  },

  getBOQs: async () => {
    const response = await fetch(`${BASE_URL}/api/boq`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getBOQById: async (id) => {
    const response = await fetch(`${BASE_URL}/api/boq/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getBOQsByProject: async (projectId) => {
    const response = await fetch(`${BASE_URL}/api/boq/project/${projectId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updateBOQ: async (id, data) => {
    const formData = new FormData();
    const fields = ['category', 'item_code', 'description', 'floor', 'unit', 'quantity', 'rate', 'amount', 'project_id'];
    fields.forEach((f) => {
      if (data[f] != null && data[f] !== '') formData.append(f, data[f]);
    });
    if (data.boq_file instanceof File) formData.append('boq_file', data.boq_file);

    const response = await fetch(`${BASE_URL}/api/boq/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: formData,
    });
    return handleResponse(response);
  },

  deleteBOQ: async (id) => {
    const response = await fetch(`${BASE_URL}/api/boq/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // MIR (Material Inspection Request) – Base URL: https://api.festmate.in, Storage: /uploads/mir
  uploadMirReference: async (file) => {
    const formData = new FormData();
    if (file instanceof File) {
      formData.append('file', file);
    } else {
      return { success: false, error: 'Invalid file' };
    }

    const response = await fetch(`${BASE_URL}/api/mir/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    return handleResponse(response);
  },

  validateMirPayload: (payload, options = {}) => validateMirPayload(payload, options),

  createMir: async (data) => {
    const { payload, errors } = normalizeMirPayload(data, { strictRequired: true });
    if (errors.length > 0) {
      return {
        success: false,
        status: 400,
        error: `Invalid MIR payload: ${errors[0]}`,
        validationErrors: errors,
      };
    }
    console.log('[MIR][POST] Final payload:', payload);

    const response = await fetch(`${BASE_URL}/api/mir`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  getMirs: async () => {
    const response = await fetch(`${BASE_URL}/api/mir`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getMirById: async (id) => {
    const response = await fetch(`${BASE_URL}/api/mir/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getMirsByProject: async (projectId) => {
    const response = await fetch(`${BASE_URL}/api/mir/project/${projectId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updateMir: async (id, data) => {
    const { payload, errors } = normalizeMirPayload(data, { strictRequired: true });
    if (errors.length > 0) {
      return {
        success: false,
        status: 400,
        error: `Invalid MIR payload: ${errors[0]}`,
        validationErrors: errors,
      };
    }
    console.log(`[MIR][PUT] Final payload for id=${id}:`, payload);

    const response = await fetch(`${BASE_URL}/api/mir/${id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  deleteMir: async (id) => {
    const response = await fetch(`${BASE_URL}/api/mir/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // PR (Purchase Requisition) – Base URL: https://api.festmate.in, Storage: /uploads/pr
  uploadPrFile: async (file) => {
    const formData = new FormData();
    if (file instanceof File) {
      formData.append('file', file);
    } else {
      return { success: false, error: 'Invalid file' };
    }

    const response = await fetch(`${BASE_URL}/api/pr/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    return handleResponse(response);
  },

  uploadPrSignature: async (file) => {
    const formData = new FormData();
    if (file instanceof File) {
      formData.append('file', file);
    } else {
      return { success: false, error: 'Invalid file' };
    }

    const response = await fetch(`${BASE_URL}/api/pr/upload-signature`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    return handleResponse(response);
  },

  createPr: async (data) => {
    const response = await fetch(`${BASE_URL}/api/pr`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getPrs: async () => {
    const response = await fetch(`${BASE_URL}/api/pr`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getPrById: async (id) => {
    const response = await fetch(`${BASE_URL}/api/pr/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getPrsByProject: async (projectId) => {
    const response = await fetch(`${BASE_URL}/api/pr/project/${projectId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getPrsBySample: async (sampleId) => {
    const response = await fetch(`${BASE_URL}/api/pr/sample/${sampleId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updatePr: async (id, data) => {
    const response = await fetch(`${BASE_URL}/api/pr/${id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deletePr: async (id) => {
    const response = await fetch(`${BASE_URL}/api/pr/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  sendPrEmail: async (payload) => {
    const attachmentFile = payload?.attachmentFile instanceof File ? payload.attachmentFile : null;

    if (attachmentFile) {
      const formData = new FormData();
      formData.append('pr', JSON.stringify(payload?.pr || {}));
      formData.append('vendors', JSON.stringify(payload?.vendors || []));
      formData.append('attachment', attachmentFile);

      const response = await fetch(`${BASE_URL}/api/pr/email`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      return handleResponse(response);
    }

    const response = await fetch(`${BASE_URL}/api/pr/email`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pr: payload?.pr || {},
        vendors: payload?.vendors || [],
      }),
    });
    return handleResponse(response);
  },

  // PO (Purchase Orders) – Base URL: https://api.festmate.in, Storage: /uploads/po
  uploadPoFile: async (file) => {
    const formData = new FormData();
    if (file instanceof File) {
      formData.append('file', file);
    } else {
      return { success: false, error: 'Invalid file' };
    }

    const response = await fetch(`${BASE_URL}/api/po/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    return handleResponse(response);
  },

  parsePoFile: async (file) => {
    const formData = new FormData();
    if (file instanceof File) {
      formData.append('file', file);
    } else {
      return { success: false, error: 'Invalid file' };
    }

    const response = await fetch(`${BASE_URL}/api/po-parser/parse`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    return handleResponse(response);
  },

  createPo: async (data) => {
    const response = await fetch(`${BASE_URL}/api/po`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getPosByProject: async (projectId) => {
    const response = await fetch(`${BASE_URL}/api/po/project/${projectId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getRecentPoByProject: async (projectId) => {
    const result = await api.getPosByProject(projectId);
    if (!result?.success) return result;
    const rows = Array.isArray(result.data) ? result.data : [];
    return {
      ...result,
      data: rows[0] || null,
    };
  },

  getPoById: async (id) => {
    const response = await fetch(`${BASE_URL}/api/po/${id}`, {
      cache: 'no-store',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updatePo: async (id, data) => {
    const response = await fetch(`${BASE_URL}/api/po/${id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deletePo: async (id) => {
    const response = await fetch(`${BASE_URL}/api/po/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  uploadDcFile: async (file) => {
    const formData = new FormData();
    if (file instanceof File) {
      formData.append('file', file);
    } else {
      return { success: false, error: 'Invalid file' };
    }
    const response = await fetch(`${BASE_URL}/api/dc/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    return handleResponse(response);
  },

  createDc: async (data) => {
    const response = await fetch(`${BASE_URL}/api/dc`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getDcsByProject: async (projectId) => {
    const response = await fetch(`${BASE_URL}/api/dc/project/${projectId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getDcsByPo: async (poId) => {
    const response = await fetch(`${BASE_URL}/api/dc/po/${poId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getDcById: async (id) => {
    const response = await fetch(`${BASE_URL}/api/dc/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updateDc: async (id, data) => {
    const response = await fetch(`${BASE_URL}/api/dc/${id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteDc: async (id) => {
    const response = await fetch(`${BASE_URL}/api/dc/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // ITR (Installation Test Report)
  uploadItrReference: async (file, meta = {}) => {
    const formData = new FormData();
    if (file instanceof File) {
      formData.append('file', file);
    } else {
      return { success: false, error: 'Invalid file' };
    }
    if (meta.user_id != null && meta.user_id !== '') {
      formData.append('user_id', String(meta.user_id));
    }
    if (meta.user_name != null && String(meta.user_name).trim() !== '') {
      formData.append('user_name', String(meta.user_name));
    }

    const response = await fetch(`${BASE_URL}/api/itr/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    return handleResponse(response);
  },

  createItr: async (data) => {
    const response = await fetch(`${BASE_URL}/api/itr`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  getItrs: async () => {
    const response = await fetch(`${BASE_URL}/api/itr`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getItrById: async (id) => {
    const response = await fetch(`${BASE_URL}/api/itr/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getItrsByProject: async (projectId) => {
    const response = await fetch(`${BASE_URL}/api/itr/project/${projectId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updateItr: async (id, data) => {
    const response = await fetch(`${BASE_URL}/api/itr/${id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteItr: async (id) => {
    const response = await fetch(`${BASE_URL}/api/itr/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updateItrStatus: async (id, data = {}) => {
    const response = await fetch(`${BASE_URL}/api/itr/${id}/status`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: data.status ?? '',
        inspection_code: data.inspection_code ?? data.inspectionCode ?? '',
        lodha_pmc_comments: data.lodha_pmc_comments ?? data.lodhaPmcComments ?? '',
        user_id: data.user_id,
        user_name: data.user_name,
      }),
    });
    return handleResponse(response);
  },

  uploadSampleFiles: async (files) => {
    const formData = new FormData();
    if (Array.isArray(files)) {
      files.forEach((file) => {
        if (file instanceof File) formData.append('file', file);
      });
    } else if (files instanceof File) {
      formData.append('file', files);
    }
    const response = await fetch(`${BASE_URL}/api/sample/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    return handleResponse(response);
  },

  getSamples: async () => {
    const response = await fetch(`${BASE_URL}/api/sample`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getSampleById: async (id) => {
    const response = await fetch(`${BASE_URL}/api/sample/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getSamplesByProject: async (projectId) => {
    const response = await fetch(`${BASE_URL}/api/sample/project/${projectId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updateSample: async (id, data) => {
    const payload = { ...data };
    ['location', 'item_description', 'add_fields'].forEach((k) => {
      if (payload[k] != null && typeof payload[k] !== 'string') {
        try {
          payload[k] = JSON.stringify(payload[k]);
        } catch {
          payload[k] = String(payload[k]);
        }
      }
    });
    const response = await fetch(`${BASE_URL}/api/sample/${id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  deleteSample: async (id) => {
    const response = await fetch(`${BASE_URL}/api/sample/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  createSample: async (data) => {
    const payload = { ...data };
    ['location', 'item_description', 'add_fields'].forEach((k) => {
      if (payload[k] != null && typeof payload[k] !== 'string') {
        try {
          payload[k] = JSON.stringify(payload[k]);
        } catch {
          payload[k] = String(payload[k]);
        }
      }
    });
    const post = async (path) => {
      const response = await fetch(`${BASE_URL}${path}`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      return handleResponse(response);
    };
    const candidates = [
      '/api/sample',
      '/api/sample/create',
      '/api/sample/create-sample',
      '/api/samples',
      '/api/samples/create',
      '/api/samples/create-sample',
    ];
    let lastError = null;
    for (const path of candidates) {
      const res = await post(path);
      if (res.success) return res;
      lastError = res;
      if (res.status !== 404) return res;
    }
    return lastError || { success: false, error: 'Create path not found', status: 404 };
  },

  // Vendors
  createVendor: async (data) => {
    const payload = {};
    ['vendor_name', 'vendor_company_name', 'vendor_email', 'mobile_number', 'location', 'status'].forEach((k) => {
      if (data[k] != null && String(data[k]).trim() !== '') payload[k] = data[k];
    });
    if (data.project_id != null && data.project_id !== '') payload.project_id = Number(data.project_id);

    const response = await fetch(`${BASE_URL}/api/vendors`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  getVendors: async () => {
    const response = await fetch(`${BASE_URL}/api/vendors`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getVendorsByProject: async (projectId) => {
    const response = await fetch(`${BASE_URL}/api/vendors/project/${projectId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getVendorById: async (id) => {
    const response = await fetch(`${BASE_URL}/api/vendors/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updateVendor: async (id, data) => {
    const payload = {};
    ['vendor_name', 'vendor_company_name', 'vendor_email', 'mobile_number', 'location', 'status'].forEach((k) => {
      if (data[k] != null && String(data[k]).trim() !== '') payload[k] = data[k];
    });
    if (data.project_id != null && data.project_id !== '') payload.project_id = Number(data.project_id);

    const response = await fetch(`${BASE_URL}/api/vendors/${id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  updateVendorStatus: async (id, status) => {
    const response = await fetch(`${BASE_URL}/api/vendors/${id}/status`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    return handleResponse(response);
  },

  deleteVendor: async (id) => {
    const response = await fetch(`${BASE_URL}/api/vendors/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // Vendor Price Lists
  uploadVendorPriceListFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BASE_URL}/api/vendor-price-list/upload`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });
    return handleResponse(response);
  },

  getVendorPriceLists: async (vendorId) => {
    const response = await fetch(`${BASE_URL}/api/vendor-price-list/vendor/${vendorId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getVendorPriceListById: async (id) => {
    const response = await fetch(`${BASE_URL}/api/vendor-price-list/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  createVendorPriceList: async (data) => {
    const response = await fetch(`${BASE_URL}/api/vendor-price-list`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  updateVendorPriceList: async (id, data) => {
    const response = await fetch(`${BASE_URL}/api/vendor-price-list/${id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  deleteVendorPriceList: async (id) => {
    const response = await fetch(`${BASE_URL}/api/vendor-price-list/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updateVendorPriceListStatus: async (id, status) => {
    const response = await fetch(`${BASE_URL}/api/vendor-price-list/${id}/status`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    return handleResponse(response);
  },

  compareVendorPriceListItems: async (params = {}) => {
    const query = new URLSearchParams();
    const allowedParams = [
      'q',
      'item_name',
      'product_name',
      'category',
      'vendor_id',
      'vendor_ids',
      'project_id',
      'status',
      'limit',
      'offset',
    ];

    allowedParams.forEach((key) => {
      const value = params[key];
      if (value === undefined || value === null || value === '') return;
      query.set(key, String(value));
    });

    const queryString = query.toString();
    const response = await fetch(`${BASE_URL}/api/vendor-price-list/compare${queryString ? `?${queryString}` : ''}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  createInventory: async (data) => {
    const payload = {
      project_id: data.project_id,
      brand: data.brand,
      quantity: Number(data.quantity),
      name: data.name,
      price: Number(data.price),
      stockin: Boolean(data.stockin),
      billing: Boolean(data.billing),
    };
    const response = await fetch(`${BASE_URL}/api/inventory`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  getInventories: async () => {
    const response = await fetch(`${BASE_URL}/api/inventory`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getInventoryById: async (id) => {
    const response = await fetch(`${BASE_URL}/api/inventory/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  getInventoriesByProject: async (projectId) => {
    const response = await fetch(`${BASE_URL}/api/inventory/project/${projectId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  updateInventory: async (id, data) => {
    const payload = {};
    ['brand', 'name'].forEach((k) => {
      if (data[k] != null && String(data[k]).trim() !== '') payload[k] = data[k];
    });
    if (data.quantity != null && data.quantity !== '') payload.quantity = Number(data.quantity);
    if (data.price != null && data.price !== '') payload.price = Number(data.price);
    if (typeof data.stockin === 'boolean') payload.stockin = data.stockin;
    if (typeof data.billing === 'boolean') payload.billing = data.billing;

    const response = await fetch(`${BASE_URL}/api/inventory/${id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  updateInventoryStockIn: async (id, stockin) => {
    const response = await fetch(`${BASE_URL}/api/inventory/${id}/stockin`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ stockin: Boolean(stockin) }),
    });
    return handleResponse(response);
  },

  updateInventoryBilling: async (id, billing) => {
    const response = await fetch(`${BASE_URL}/api/inventory/${id}/billing`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ billing: Boolean(billing) }),
    });
    return handleResponse(response);
  },

  deleteInventory: async (id) => {
    const response = await fetch(`${BASE_URL}/api/inventory/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};

// Helper to get token from storage
const getToken = () => {
  const userStr = localStorage.getItem('inventory_user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.token;
    } catch {
      return null;
    }
  }
  return null;
};

// Helper for auth headers
const getAuthHeaders = () => {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Helper to handle response
const handleResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const isMultipart = contentType.includes('multipart');
  
  let data = null;
  try {
    if (isJson) {
      data = await response.json();
    } else if (isMultipart || contentType.includes('application/octet-stream') || contentType.includes('application/pdf')) {
      // If response is a file/blob, return it as data
      const blob = await response.blob();
      return { success: true, data: blob, isBlob: true };
    } else {
      // Try to parse as JSON anyway, might be text/json
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
  } catch {
    // Invalid JSON (e.g. HTML error page)
    if (!response.ok) {
      return { success: false, error: response.statusText || 'Invalid response', status: response.status };
    }
  }

  if (!response.ok) {
    // Handle specific error codes with user-friendly messages
    let error = (data && (data.error || data.message)) || response.statusText;
    
    if (response.status === 413) {
      error = 'File too large for compression. The file exceeds the server\'s maximum request size. Please compress the file manually using a compression tool (like 7-Zip, WinRAR, or online tools) before uploading.';
    } else if (response.status === 400) {
      error = data?.error || 'Invalid request. Please check your input and try again.';
    } else if (response.status === 401) {
      error = 'Authentication failed. Please log in again.';
    } else if (response.status === 404) {
      error = data?.error || 'Resource not found.';
    } else if (response.status === 500) {
      error = data?.error || 'Server error. Please try again later.';
    }
    
    return { success: false, error, status: response.status };
  }

  return { success: true, data };
};
