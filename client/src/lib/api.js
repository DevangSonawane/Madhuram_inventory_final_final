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
    const error = (data && data.message) || response.statusText;
    return { success: false, error, status: response.status };
  }

  return { success: true, data };
};
