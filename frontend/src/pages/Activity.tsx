import { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationStore } from '@/store/notificationStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Activity as ActivityIcon, Bell, CheckSquare, Search, Loader2, Clock, User } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface LogEntry {
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
}

export default function Activity() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  
  // Notification Store
  const {
    notifications,
    unreadCount,
    isLoading: isNotifLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationStore();

  // Fetch Activity Logs
  const { data: logData, isLoading: isLogsLoading, refetch: refetchLogs } = useApi<{ data: LogEntry[] }>({
    url: '/activity-logs',
    params: { search: search || undefined },
  });

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const logs = Array.isArray(logData) ? logData : (logData as any)?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Activity Logs & Notifications</h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitor recent workflow alerts, audit trail history, and track team operations.
        </p>
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="bg-slate-100 p-1 rounded-lg">
          <TabsTrigger value="notifications" className="font-bold flex items-center gap-1.5 px-4 py-2 rounded-md transition-all">
            <Bell className="h-4 w-4" />
            Alerts Inbox
            {unreadCount > 0 && (
              <Badge className="bg-rose-500 text-white border-0 font-black h-5 px-1.5 min-w-5 justify-center rounded-full text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="logs" className="font-bold flex items-center gap-1.5 px-4 py-2 rounded-md transition-all">
            <ActivityIcon className="h-4 w-4" />
            Audit Trail
          </TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Alerts Inbox</h2>
            {unreadCount > 0 && (
              <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-semibold" onClick={markAllAsRead}>
                <CheckSquare className="mr-1.5 h-4 w-4" /> Mark All as Read
              </Button>
            )}
          </div>

          <Card className="shadow-sm border-slate-100">
            <CardContent className="p-0">
              {isNotifLoading ? (
                <div className="p-8 text-center text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600 mb-2" /> Loading alerts...
                </div>
              ) : !notifications || notifications.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Bell className="h-12 w-12 mx-auto text-slate-300 mb-3" /> No notifications received yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-4 flex justify-between items-start gap-4 transition-colors hover:bg-slate-50/50 ${
                        !n.isRead ? 'bg-emerald-50/20 font-medium' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center ${
                          !n.isRead ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <Bell className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className={`text-sm text-slate-900 ${!n.isRead ? 'font-bold' : ''}`}>{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {!n.isRead && (
                        <Button size="sm" variant="ghost" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline shrink-0" onClick={() => markAsRead(n.id)}>
                          Mark read
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Trail Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-800">System Audit Trail</h2>
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search audit trail..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  refetchLogs();
                }}
                className="pl-9"
              />
            </div>
          </div>

          <Card className="shadow-sm border-slate-100">
            <CardContent className="p-0">
              {isLogsLoading ? (
                <div className="p-8 text-center text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600 mb-2" /> Loading audit logs...
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <ActivityIcon className="h-12 w-12 mx-auto text-slate-300 mb-3" /> No audit logs found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/75 hover:bg-slate-50/75">
                      <TableHead className="font-semibold text-slate-700">Timestamp</TableHead>
                      <TableHead className="font-semibold text-slate-700">Operator</TableHead>
                      <TableHead className="font-semibold text-slate-700">Action Type</TableHead>
                      <TableHead className="font-semibold text-slate-700">Entity Affected</TableHead>
                      <TableHead className="font-semibold text-slate-700">Audit Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log: LogEntry) => (
                      <TableRow key={log.id} className="hover:bg-slate-50/50">
                        <TableCell className="text-xs text-slate-500 flex items-center gap-1.5 py-3.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-semibold text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <User className="h-4 w-4 text-slate-400" />
                            <div>
                              <div>{log.user.firstName} {log.user.lastName}</div>
                              <div className="text-[10px] text-slate-400 capitalize">{log.user.role.replace('_', ' ').toLowerCase()}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-semibold text-xs py-0.5">
                            {log.action.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-slate-700">{log.entity}</TableCell>
                        <TableCell className="text-slate-600 max-w-[280px] truncate" title={log.details || ''}>
                          {log.details || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
