import { create } from 'zustand';
import type { User, LoginRequest, RegisterRequest } from '@/types';
import api from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  loadUser: () => void;
  clearError: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const normalizeUser = (user: any): User => {
  if (!user) return user;
  return {
    ...user,
    name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
    role: (user.role || '').toLowerCase() as any
  };
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (data: LoginRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', data);
      const { token, user } = response.data.data;
      const normalizedUser = normalizeUser(user);
      localStorage.setItem('vendorbridge_token', token);
      localStorage.setItem('vendorbridge_user', JSON.stringify(normalizedUser));
      set({ user: normalizedUser, token, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  register: async (data: RegisterRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/register', data);
      const { token, user } = response.data.data;
      const normalizedUser = normalizeUser(user);
      localStorage.setItem('vendorbridge_token', token);
      localStorage.setItem('vendorbridge_user', JSON.stringify(normalizedUser));
      set({ user: normalizedUser, token, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: () => {
    localStorage.removeItem('vendorbridge_token');
    localStorage.removeItem('vendorbridge_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadUser: () => {
    const token = localStorage.getItem('vendorbridge_token');
    const userStr = localStorage.getItem('vendorbridge_user');
    if (token && userStr) {
      try {
        const user = normalizeUser(JSON.parse(userStr));
        set({ user, token, isAuthenticated: true });
      } catch {
        localStorage.removeItem('vendorbridge_token');
        localStorage.removeItem('vendorbridge_user');
      }
    }
  },

  clearError: () => set({ error: null }),

  updateProfile: async (data: Partial<User>) => {
    set({ isLoading: true });
    try {
      const response = await api.put('/auth/profile', data);
      const user = normalizeUser(response.data.data.user);
      localStorage.setItem('vendorbridge_user', JSON.stringify(user));
      set({ user, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },
}));
