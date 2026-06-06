import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/store/sidebarStore';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  CheckCircle,
  ShoppingCart,
  Receipt,
  BarChart3,
  Activity,
  ChevronLeft,
  ChevronRight,
  Building2,
  User as UserIcon,
  Settings,
} from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();
  const { isOpen, toggle } = useSidebarStore();
  const { user } = useAuth();

  const menuByRole: { [key: string]: Array<{ name: string; href: string; icon: any }> } = {
    ADMIN: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Users', href: '/users', icon: Users },
      { name: 'Vendors', href: '/vendors', icon: Building2 },
      { name: 'RFQs', href: '/rfqs', icon: FileText },
      { name: 'Quotations', href: '/quotations', icon: ClipboardList },
      { name: 'Approvals', href: '/approvals', icon: CheckCircle },
      { name: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart },
      { name: 'Invoices', href: '/invoices', icon: Receipt },
      { name: 'Reports', href: '/reports', icon: BarChart3 },
      { name: 'Activity Logs', href: '/activity', icon: Activity },
      { name: 'Settings', href: '/settings', icon: Settings },
      { name: 'My Profile', href: '/profile', icon: UserIcon },
    ],
    PROCUREMENT_OFFICER: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Vendors', href: '/vendors', icon: Building2 },
      { name: 'RFQs', href: '/rfqs', icon: FileText },
      { name: 'Quotations', href: '/quotations', icon: ClipboardList },
      { name: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart },
      { name: 'Invoices', href: '/invoices', icon: Receipt },
      { name: 'Reports', href: '/reports', icon: BarChart3 },
      { name: 'My Profile', href: '/profile', icon: UserIcon },
    ],
    MANAGER: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Approvals', href: '/approvals', icon: CheckCircle },
      { name: 'RFQs', href: '/rfqs', icon: FileText },
      { name: 'Reports', href: '/reports', icon: BarChart3 },
      { name: 'Approval History', href: '/approvals?tab=history', icon: ClipboardList },
      { name: 'My Profile', href: '/profile', icon: UserIcon },
    ],
    VENDOR: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'My RFQs', href: '/rfqs', icon: FileText },
      { name: 'My Quotations', href: '/quotations', icon: ClipboardList },
      { name: 'My Purchase Orders', href: '/purchase-orders', icon: ShoppingCart },
      { name: 'My Invoices', href: '/invoices', icon: Receipt },
      { name: 'My Profile', href: '/profile', icon: UserIcon },
    ],
  };

  const userRole = (user?.role || '').toUpperCase();
  const navigation = menuByRole[userRole] || [];

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-slate-800 text-white transition-all duration-300 ease-in-out no-print',
        isOpen ? 'w-64' : 'w-20'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-slate-700 px-4">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          {isOpen && (
            <span className="text-lg font-bold tracking-tight">VendorBridge</span>
          )}
        </Link>
        <button
          onClick={toggle}
          className="rounded-md p-1.5 hover:bg-slate-700 transition-colors"
        >
          {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <nav className="space-y-1 px-3 py-4">
          {navigation.map((item) => {
            const isActive = item.href.includes('?') 
              ? (location.pathname + location.search) === item.href 
              : (location.pathname === item.href && !location.search) || (location.pathname.startsWith(item.href + '/') && item.href !== '/dashboard');
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white',
                  !isOpen && 'justify-center px-2'
                )}
                title={!isOpen ? item.name : undefined}
              >
                <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-white')} />
                {isOpen && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User info at bottom */}
        {isOpen && user && (
          <div className="absolute bottom-0 left-0 right-0 border-t border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 truncate">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-slate-400 truncate capitalize">{user.role?.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
