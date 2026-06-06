import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const { user, token, isAuthenticated, isLoading, error, login, register, logout, loadUser, clearError, updateProfile } = useAuthStore();

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    loadUser,
    clearError,
    updateProfile,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager' || user?.role === 'admin',
    isVendor: user?.role === 'vendor',
    isProcurement: user?.role === 'procurement_officer',
  };
}
