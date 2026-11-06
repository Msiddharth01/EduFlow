'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi, User } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  register: (name: string, email: string, password: string, role: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  updateUser: (updatedUser: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setIsLoading(false);
      } catch (e) {
        console.error('Failed to parse cached user:', e);
      }
    }
    if (storedToken) {
      setToken(storedToken);
      authApi.getMe().then((res) => {
        if (res.success) {
          setUser(res.data.user);
          localStorage.setItem('user', JSON.stringify(res.data.user));
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    if (res.success) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      return { success: true, user: res.data.user };
    }
    return { success: false, error: res.error };
  };

  const register = async (name: string, email: string, password: string, role: string) => {
    const res = await authApi.register({ name, email, password, role });
    if (res.success) {
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      return { success: true, user: res.data.user };
    }
    return { success: false, error: res.error };
  };

  const refreshUser = async () => {
    const res = await authApi.getMe();
    if (res.success && res.data.user) {
      setUser(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
    }
  };

  const updateUser = (updatedFields: Partial<User>) => {
    setUser((prev) => {
      const updated = prev ? { ...prev, ...updatedFields } : null;
      if (updated) {
        localStorage.setItem('user', JSON.stringify(updated));
      }
      return updated;
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
