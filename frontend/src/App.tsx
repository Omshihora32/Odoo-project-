import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Toaster } from '@/components/ui/toaster';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import RoleGuard from '@/components/layout/RoleGuard';

// Pages
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Users from '@/pages/Users';
import Vendors from '@/pages/Vendors';
import RFQs from '@/pages/RFQs';
import Quotations from '@/pages/Quotations';
import Approvals from '@/pages/Approvals';
import PurchaseOrders from '@/pages/PurchaseOrders';
import Invoices from '@/pages/Invoices';
import Reports from '@/pages/Reports';
import Activity from '@/pages/Activity';
import Settings from '@/pages/Settings';
import Profile from '@/pages/Profile';

export default function App() {
  const { loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected ERP Workspace Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          <Route
            path="users"
            element={
              <RoleGuard roles={['ADMIN']}>
                <Users />
              </RoleGuard>
            }
          />
          <Route
            path="vendors"
            element={
              <RoleGuard roles={['ADMIN', 'PROCUREMENT_OFFICER']}>
                <Vendors />
              </RoleGuard>
            }
          />
          <Route
            path="rfqs"
            element={
              <RoleGuard roles={['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR']}>
                <RFQs />
              </RoleGuard>
            }
          />
          <Route
            path="quotations"
            element={
              <RoleGuard roles={['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR']}>
                <Quotations />
              </RoleGuard>
            }
          />
          <Route
            path="approvals"
            element={
              <RoleGuard roles={['ADMIN', 'MANAGER']}>
                <Approvals />
              </RoleGuard>
            }
          />
          <Route
            path="purchase-orders"
            element={
              <RoleGuard roles={['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER', 'VENDOR']}>
                <PurchaseOrders />
              </RoleGuard>
            }
          />
          <Route
            path="invoices"
            element={
              <RoleGuard roles={['ADMIN', 'PROCUREMENT_OFFICER', 'VENDOR']}>
                <Invoices />
              </RoleGuard>
            }
          />
          <Route
            path="reports"
            element={
              <RoleGuard roles={['ADMIN', 'PROCUREMENT_OFFICER', 'MANAGER']}>
                <Reports />
              </RoleGuard>
            }
          />
          <Route
            path="activity"
            element={
              <RoleGuard roles={['ADMIN']}>
                <Activity />
              </RoleGuard>
            }
          />
          <Route
            path="settings"
            element={
              <RoleGuard roles={['ADMIN']}>
                <Settings />
              </RoleGuard>
            }
          />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
