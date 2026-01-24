import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '@/lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved user in localStorage on mount
    const savedUser = localStorage.getItem('inventory_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      // Try to login via API
      const result = await api.login(email, password);

      if (result.success) {
        const userData = {
          ...result.data.user,
          token: result.data.token
        };
        setUser(userData);
        localStorage.setItem('inventory_user', JSON.stringify(userData));
        return true;
      }
    } catch (error) {
      console.warn("API Login failed, falling back to local demo if applicable", error);
    }

    // Fallback/Dummy credential check for demo purposes
    if (email === 'admin@madhuram.com' && password === 'admin123') {
      const userData = {
        user_id: '1',
        name: 'Admin User',
        email: email,
        role: 'admin',
        avatar: 'https://github.com/shadcn.png',
        token: 'demo-token-admin',
        project_list: []
      };
      setUser(userData);
      localStorage.setItem('inventory_user', JSON.stringify(userData));
      return true;
    }
    
    if (email === 'pm@madhuram.com' && password === 'pm123') {
         const userData = {
           user_id: '2',
           name: 'Rajesh Kumar',
           email: email,
           role: 'project_manager',
           avatar: 'https://github.com/shadcn.png',
           token: 'demo-token-pm',
           project_list: []
         };
         setUser(userData);
        localStorage.setItem('inventory_user', JSON.stringify(userData));
        return true;
      }
    return false;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error("Logout failed", error);
    }
    setUser(null);
    localStorage.removeItem('inventory_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
