import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  const API_URL = import.meta.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // First check if setup is required
      const setupResponse = await fetch(`${API_URL}/api/auth/setup/check`);
      const setupData = await setupResponse.json();
      
      if (!setupData.authEnabled) {
        // Auth is disabled - treat as single user mode
        setUser({ id: 1, username: 'admin', role: 'admin', email: 'admin@localhost' });
        setLoading(false);
        return;
      }

      if (setupData.setupRequired) {
        setSetupRequired(true);
        setLoading(false);
        return;
      }

      // Check if we have a valid token
      if (token) {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData.user);
        } else {
          // Token is invalid, remove it
          localStorage.removeItem('auth_token');
          setToken(null);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // On error, assume auth is disabled for now
      setUser({ id: 1, username: 'admin', role: 'admin', email: 'admin@localhost' });
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('auth_token', data.token);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  const setupAdmin = async (username, email, password) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        setUser(data.user);
        setSetupRequired(false);
        localStorage.setItem('auth_token', data.token);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Setup failed' };
      }
    } catch (error) {
      console.error('Setup error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const value = {
    user,
    token,
    loading,
    setupRequired,
    login,
    logout,
    setupAdmin,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};