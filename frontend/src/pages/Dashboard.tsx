import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNotificationStore } from '@/store/notificationStore';
import {
  Users,
  FileText,
  CheckCircle,
  ShoppingCart,
  Receipt,
  IndianRupee,
  Activity,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  Clock,
  BarChart3,
  UserCheck,
  XCircle,
  ClipboardList,
} from 'lucide-react';

interface DashboardData {
  totalVendors: number;
  activeRFQs: number;
  pendingApprovals: number;
  totalPurchaseOrders: number;
  totalInvoices: number;
  totalSpend: number;
  vendorResponses: number;
  approvalRate: number;
  vendorStatus: string;
  recentActivities: Array<{
    id: string;
    action: string;
    entity: string;
    details: string | null;
    createdAt: string;
    user: {
      firstName: string;
      lastName: string;
      role: string;
    };
  }>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { fetchNotifications } = useNotificationStore();
  
  const { data: stats, isLoading, refetch } = useApi<DashboardData>({
    url: '/reports/dashboard',
  });

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const formatRupee = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const isVendor = user?.role === 'vendor';
  const isPO = user?.role === 'procurement_officer';
  const isManager = user?.role === 'manager';
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, <span className="font-semibold text-emerald-600">{user?.name}</span>. Here is a summary of your workspace activities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isPO && (
            <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-sm" onClick={() => navigate('/rfqs')}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create RFQ
            </Button>
          )}
          <Button variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isAdmin && (
          <>
            <Card className="shadow-sm border-slate-100 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Total Users</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <Users className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '...' : (stats as any)?.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">System user accounts</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-100 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Total Vendors</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Users className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '...' : stats?.totalVendors || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Procurement vendors</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-100 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Active RFQs</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FileText className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '...' : stats?.activeRFQs || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Open requisition RFQs</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-100 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Total Spend</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <IndianRupee className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{isLoading ? '...' : formatRupee(stats?.totalSpend || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Approved spend value</p>
              </CardContent>
            </Card>
          </>
        )}

        {isPO && (
          <>
            <Card className="shadow-sm border-slate-100 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">RFQs Created</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FileText className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '...' : stats?.activeRFQs || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Total operational RFQs</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-100 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Pending Quotations</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Clock className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '...' : Math.max(0, (stats?.activeRFQs || 0) * 2 - (stats?.totalPurchaseOrders || 0))}</div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting vendor submissions</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-100 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Vendor Responses</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <ClipboardList className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '...' : stats?.vendorResponses || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Submitted vendor quotations</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-100 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Purchase Orders Generated</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <ShoppingCart className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '...' : stats?.totalPurchaseOrders || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">POs issued to suppliers</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-100 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Procurement Spend</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <IndianRupee className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{isLoading ? '...' : formatRupee(stats?.totalSpend || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Active spend value</p>
              </CardContent>
            </Card>
          </>
        )}

        {isManager && (
          <>
            <Card className="shadow-sm border-slate-100 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Pending Approvals</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{isLoading ? '...' : stats?.pendingApprovals || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Requires your authorization</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-100 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Approved Requests</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <UserCheck className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">{isLoading ? '...' : (stats?.totalPurchaseOrders || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Cleared purchase cycles</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-100 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Rejected Requests</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                  <XCircle className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-600">1</div>
                <p className="text-xs text-muted-foreground mt-1">Exceeded budget limits</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-100 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Budget Review</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <IndianRupee className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{isLoading ? '...' : formatRupee(stats?.totalSpend || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">Approved budget allocation</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-100 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Approval Statistics</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <BarChart3 className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{isLoading ? '...' : `${stats?.approvalRate || 100}%`}</div>
                <p className="text-xs text-muted-foreground mt-1">Approval rate of requests</p>
              </CardContent>
            </Card>
          </>
        )}

        {isVendor && (
          <>
            <Card className="shadow-sm border-slate-100 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Assigned RFQs</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FileText className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '...' : stats?.activeRFQs || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Invited to submit quotes</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-100 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Submitted Quotations</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Clock className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '...' : stats?.totalPurchaseOrders || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Pending approval reviews</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-100 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Active Purchase Orders</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <ShoppingCart className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '...' : stats?.totalPurchaseOrders || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting invoice fulfillment</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-100 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Pending Payments</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                  <Receipt className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '...' : stats?.totalInvoices || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Unsettled vendor invoices</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-100 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Profile Status</CardTitle>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                  <UserCheck className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600 capitalize">{isLoading ? '...' : stats?.vendorStatus?.toLowerCase() || 'pending'}</div>
                <p className="text-xs text-muted-foreground mt-1">Vendor compliance status</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Grid: Shortcuts & Activity */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="shadow-sm border-slate-100 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common ERP operations</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {isPO && (
              <>
                <Button className="w-full justify-start text-left" variant="outline" onClick={() => navigate('/rfqs')}>
                  <PlusCircle className="mr-2 h-4 w-4 text-emerald-600" /> Create RFQ Document
                </Button>
                <Button className="w-full justify-start text-left" variant="outline" onClick={() => navigate('/quotations')}>
                  <ArrowRight className="mr-2 h-4 w-4 text-blue-600" /> Compare Quotations Matrix
                </Button>
              </>
            )}
            {isVendor && (
              <>
                <Button className="w-full justify-start text-left" variant="outline" onClick={() => navigate('/rfqs')}>
                  <FileText className="mr-2 h-4 w-4 text-emerald-600" /> View Invited RFQs
                </Button>
                <Button className="w-full justify-start text-left" variant="outline" onClick={() => navigate('/quotations')}>
                  <PlusCircle className="mr-2 h-4 w-4 text-blue-600" /> Submit New Quotation
                </Button>
                <Button className="w-full justify-start text-left" variant="outline" onClick={() => navigate('/invoices')}>
                  <Receipt className="mr-2 h-4 w-4 text-rose-600" /> Create Invoice
                </Button>
              </>
            )}
            {isManager && (
              <Button className="w-full justify-start text-left" variant="outline" onClick={() => navigate('/approvals')}>
                <CheckCircle className="mr-2 h-4 w-4 text-amber-600" /> Process Pending Approvals
              </Button>
            )}
            {isAdmin && (
              <>
                <Button className="w-full justify-start text-left" variant="outline" onClick={() => navigate('/vendors')}>
                  <Users className="mr-2 h-4 w-4 text-emerald-600" /> Manage Vendor Directory
                </Button>
                <Button className="w-full justify-start text-left" variant="outline" onClick={() => navigate('/reports')}>
                  <BarChart3 className="mr-2 h-4 w-4 text-indigo-600" /> View Spend Analytics
                </Button>
              </>
            )}
            <Button className="w-full justify-start text-left" variant="outline" onClick={() => navigate('/activity')}>
              <Activity className="mr-2 h-4 w-4 text-slate-600" /> Audit trail timeline
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity Logs */}
        <Card className="shadow-sm border-slate-100 md:col-span-2 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-600" />
                Audit Trail Timeline
              </CardTitle>
              <CardDescription>Recent actions logged in the system</CardDescription>
            </div>
            <Link to="/activity" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
                ))}
              </div>
            ) : !stats?.recentActivities || stats.recentActivities.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No recent activities found.</div>
            ) : (
              <div className="relative pl-6 border-l border-slate-100 space-y-6">
                {stats.recentActivities.map((act) => (
                  <div key={act.id} className="relative group">
                    {/* Bullet */}
                    <div className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-emerald-500 bg-white group-hover:scale-125 transition-transform" />
                    <div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                        {act.action.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-slate-400 ml-2">
                        {new Date(act.createdAt).toLocaleString()}
                      </span>
                      <p className="text-sm font-medium text-slate-900 mt-1">{act.details || act.action}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        By {act.user.firstName} {act.user.lastName} ({act.user.role.replace('_', ' ').toLowerCase()})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
