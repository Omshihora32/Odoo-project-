import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSidebarStore } from '@/store/sidebarStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useAuth } from '@/hooks/useAuth';
import { getInitials, formatDateTime } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell,
  Search,
  LogOut,
  User,
  Settings,
  Menu,
  X,
  CheckCheck,
} from 'lucide-react';

export default function Navbar() {
  const { isOpen, toggle } = useSidebarStore();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/dashboard?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header
      className={cn(
        'fixed top-0 z-30 flex h-16 items-center border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 transition-all duration-300 no-print',
        isOpen ? 'left-64' : 'left-20',
        'right-0'
      )}
    >
      <div className="flex w-full items-center justify-between px-4 md:px-6">
        {/* Left side: hamburger + search */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggle}
            className="rounded-md p-2 hover:bg-gray-100 transition-colors lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <form onSubmit={handleSearch} className="hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search anything..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[300px] pl-10 bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>
          </form>
        </div>

        {/* Right side: notifications + user */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-2 py-1.5">
                <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllAsRead()}
                    className="h-auto text-xs text-muted-foreground hover:text-foreground p-1"
                  >
                    <CheckCheck className="mr-1 h-3 w-3" />
                    Mark all read
                  </Button>
                )}
              </div>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              ) : (
                notifications.slice(0, 5).map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={cn(
                      'flex flex-col items-start gap-1 p-3 cursor-pointer',
                      !notification.isRead && 'bg-emerald-50/50'
                    )}
                    onClick={() => {
                      markAsRead(notification.id);
                      if (notification.link) navigate(notification.link);
                      setShowNotifications(false);
                    }}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <p className="text-sm font-medium">{notification.title}</p>
                      {!notification.isRead && (
                        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDateTime(notification.createdAt)}</p>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="bg-emerald-600 text-white text-sm">
                    {user ? getInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
