import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

interface RoleGuardProps {
  children: React.ReactNode;
  roles: string[];
}

export default function RoleGuard({ children, roles }: RoleGuardProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const { toast } = useToast();

  const userRole = user?.role || '';
  const upperRoles = roles.map(r => r.toUpperCase());
  const isAuthorized = upperRoles.includes(userRole.toUpperCase());

  useEffect(() => {
    if (isAuthenticated && !isAuthorized) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access this page.',
        variant: 'destructive',
      });
    }
  }, [isAuthenticated, isAuthorized, toast]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAuthorized) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
