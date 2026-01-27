const BASE_URL = 'https://api.festmate.in';

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
    // Convert date to ISO string if needed
    let productDuration = projectData.product_duration || '';
    if (productDuration && !productDuration.includes('T') && productDuration.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // If it's a date input (YYYY-MM-DD), convert to ISO
      productDuration = new Date(productDuration + 'T00:00:00.000Z').toISOString();
    }
    formData.append('product_duration', productDuration);
    
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
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    // Handle specific error codes with user-friendly messages
    let error = (data && (data.error || data.message)) || response.statusText;
    
    if (response.status === 413) {
      error = 'File too large. Maximum file size is 10 MB. Please compress your file or use a smaller file.';
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
