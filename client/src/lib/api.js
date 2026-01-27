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
    
    // Add text fields
    if (projectData.project_name) formData.append('project_name', projectData.project_name);
    if (projectData.product_duration) formData.append('product_duration', projectData.product_duration);
    if (projectData.client_name) formData.append('client_name', projectData.client_name);
    if (projectData.work_order_information) formData.append('work_order_information', projectData.work_order_information);
    if (projectData.wo_number) formData.append('wo_number', projectData.wo_number);
    
    // Add arrays
    if (projectData.pr_po_tracking && Array.isArray(projectData.pr_po_tracking)) {
      projectData.pr_po_tracking.forEach((item, index) => {
        formData.append(`pr_po_tracking[${index}]`, item);
      });
    }
    
    if (projectData.samples && Array.isArray(projectData.samples)) {
      projectData.samples.forEach((item, index) => {
        formData.append(`samples[${index}]`, item);
      });
    }
    
    // Add files
    if (projectData.work_order_file instanceof File) {
      formData.append('work_order_file', projectData.work_order_file);
    }
    
    if (projectData.mas_file instanceof File) {
      formData.append('mas_file', projectData.mas_file);
    }
    
    // Add ml_management object
    if (projectData.ml_management) {
      if (projectData.ml_management.ml_task) {
        formData.append('ml_management[ml_task]', projectData.ml_management.ml_task);
      }
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
    
    // Add text fields
    if (projectData.project_name) formData.append('project_name', projectData.project_name);
    if (projectData.product_duration) formData.append('product_duration', projectData.product_duration);
    if (projectData.client_name) formData.append('client_name', projectData.client_name);
    if (projectData.work_order_information) formData.append('work_order_information', projectData.work_order_information);
    if (projectData.wo_number) formData.append('wo_number', projectData.wo_number);
    
    // Add arrays
    if (projectData.pr_po_tracking && Array.isArray(projectData.pr_po_tracking)) {
      projectData.pr_po_tracking.forEach((item, index) => {
        formData.append(`pr_po_tracking[${index}]`, item);
      });
    }
    
    if (projectData.samples && Array.isArray(projectData.samples)) {
      projectData.samples.forEach((item, index) => {
        formData.append(`samples[${index}]`, item);
      });
    }
    
    // Add files (only if new files are provided)
    if (projectData.work_order_file instanceof File) {
      formData.append('work_order_file', projectData.work_order_file);
    }
    if (projectData.mas_file instanceof File) {
      formData.append('mas_file', projectData.mas_file);
    }
    
    // Add ml_management object
    if (projectData.ml_management) {
      if (projectData.ml_management.ml_task) {
        formData.append('ml_management[ml_task]', projectData.ml_management.ml_task);
      }
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
    // API returns error in format: { "error": "..." }
    const error = (data && (data.error || data.message)) || response.statusText;
    return { success: false, error, status: response.status };
  }

  return { success: true, data };
};
