import React, { createContext, useContext, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { loginStart, loginSuccess, loginFailure, logout as logoutAction } from '../redux/slices/authSlice';
import { api } from '@/lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const { user, isAuthenticated, loading, error } = useSelector((state) => state.auth);

  // We rely on Redux initial state for checking localStorage on mount
  // But if we wanted to sync or re-validate token on mount, we could do it here.

  const login = async (email, password) => {
    dispatch(loginStart());
    try {
      // Try to login via API
      const result = await api.login(email, password);

      if (result.success) {
        const userData = {
          ...result.data.user,
          token: result.data.token
        };
        dispatch(loginSuccess(userData));
        return true;
      } else {
        dispatch(loginFailure(result.error || 'Login failed'));
        return false;
      }
    } catch (error) {
      console.warn("API Login failed", error);
      dispatch(loginFailure(error.message || 'Login error'));
      return false;
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error("Logout failed", error);
    }
    dispatch(logoutAction());
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, loading, error }}>
      {children}
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
