'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '@/lib/api';

type User = {
  id: string;
  name: string;
  email: string;
  role: 'farmer' | 'auditor' | 'registry';
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAuditor: boolean;
  isRegistry: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Initialize state with null values, we'll update after mounting
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication status on initial render and when browser is refreshed
  useEffect(() => {
    // Skip this effect during server-side rendering
    if (typeof window === 'undefined') return;
    
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Verify the token is still valid by making a request to the profile endpoint
        try {
          await authAPI.getProfile();
          // If successful, token is valid - keep the user logged in
        } catch (err) {
          // If the token is invalid or expired, clear the stored values
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
      }
      
      setIsLoading(false);
    };
    
    verifyAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authAPI.login({ email, password });
      const { user, token } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setUser(user);
      setToken(token);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to login');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await authAPI.register(userData);
      
      // Auto login after successful registration
      await login(userData.email, userData.password);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to register');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Explicit logout function (called when user clicks logout)
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    
    // If using Next.js router, you can redirect here
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  };

  const value = {
    user,
    token,
    isLoading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user && !!token,
    isAuditor: user?.role === 'auditor',
    isRegistry: user?.role === 'registry',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};
