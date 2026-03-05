const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://api.festmate.in').replace(/\/$/, '');

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

  updateUser: async (id, data) => {
    const response = await fetch(`${BASE_URL}/api/auth/users/${id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
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

  // Projects
  createProject: async (projectData) => {
    const formData = new FormData();
    
    // According to API docs: POST /api/projects uses multipart form data
    // Request fields: project_name, project_startdate, client_name, location, floor, 
    // estimate_value, wo_number, work_order_file, pr_po_tracking[], samples[], mas_file, ml_management[]
    
    // Required/Text fields
    formData.append('project_name', projectData.project_name || '');
    
    // API expects project_startdate in CREATE request (ISO format: "2026-01-26T00:00:00.000Z")
    // Convert date to ISO string if it's a date input value
    let startDate = projectData.product_duration || projectData.project_startdate || '';
    if (startDate && !startDate.includes('T')) {
      // If it's a date input (YYYY-MM-DD), convert to ISO
      startDate = new Date(startDate + 'T00:00:00.000Z').toISOString();
    }
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
    } catch (_) {}
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

  createMir: async (data) => {
    const response = await fetch(`${BASE_URL}/api/mir`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
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
    const response = await fetch(`${BASE_URL}/api/mir/${id}`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
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

  getPoById: async (id) => {
    const response = await fetch(`${BASE_URL}/api/po/${id}`, {
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
        } catch (_) {}
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
        } catch (_) {}
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

  createInventory: async (data) => {
    const payload = {
      project_id: data.project_id,
      brand: data.brand,
      quantity: Number(data.quantity),
      name: data.name,
      price: Number(data.price),
      stockin: Boolean(data.stockin),
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
    } catch (e) {
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
  } catch (e) {
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
