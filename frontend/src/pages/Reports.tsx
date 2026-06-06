import { useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart3, FileDown, Loader2, Star, Award, TrendingUp, DollarSign } from 'lucide-react';
import api from '@/lib/api';

interface AnalyticsData {
  spendTrend: Array<{
    month: string;
    spend: number;
  }>;
  spendByCategory: Array<{
    category: string;
    value: number;
  }>;
  vendorPerformance: Array<{
    id: string;
    companyName: string;
    rating: number;
    performanceScore: number;
    category: string;
    status: string;
    totalOrders: number;
    totalSpend: number;
  }>;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#374151', '#06b6d4'];

export default function Reports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  // Fetch Analytics data
  const { data: analytics, isLoading } = useApi<AnalyticsData>({
    url: '/reports/analytics',
  });

  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      if (format === 'json') {
        const response = await api.get('/reports/export/json');
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(response.data.data, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', 'purchase_orders_report.json');
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      } else {
        // Download CSV
        const response = await api.get('/reports/export/csv', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'purchase_orders_report.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
      toast({ title: 'Export Complete', description: 'Requisition reports exported successfully.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to export reports.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const formatRupee = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Analyze company-wide spend distribution, monthly procurement trends, and supplier performance scorecards.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('json')} disabled={isExporting}>
            <FileDown className="mr-1.5 h-4 w-4" /> Export JSON
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 font-semibold size-sm shadow" onClick={() => handleExport('csv')} disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileDown className="mr-1.5 h-4 w-4" />} Export CSV Requisition
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600 mb-2" /> Evaluating spend summaries...
        </div>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Monthly spend trend */}
            <Card className="shadow-sm border-slate-100">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 font-bold text-slate-800">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  Monthly Procurement Spend (INR)
                </CardTitle>
                <CardDescription>Visual trend of finalized PO values for the last 6 months</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.spendTrend || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${(v || 0) / 1000}k`} />
                    <Tooltip formatter={(value: any) => [`₹${(value || 0).toLocaleString()}`, 'Finalized Spend']} />
                    <Bar dataKey="spend" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Spend by category */}
            <Card className="shadow-sm border-slate-100">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 font-bold text-slate-800">
                  <DollarSign className="h-5 w-5 text-indigo-600" />
                  Spend Allocation by Category (INR)
                </CardTitle>
                <CardDescription>Comparison of spend values allocated to category channels</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] w-full relative">
                {(!analytics?.spendByCategory || analytics.spendByCategory.length === 0) ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">No spend data categorized yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.spendByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="category"
                      >
                        {analytics.spendByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `₹${(value || 0).toLocaleString()}`} />
                      <Legend formatter={(value) => (value || '').replace('_', ' ').toLowerCase()} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Supplier Performance Scorecards */}
          <Card className="shadow-sm border-slate-100">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 font-bold text-slate-800">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
                Supplier Performance Scorecards
              </CardTitle>
              <CardDescription>Key stats, rating, and historical spend metrics of partner suppliers</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {!analytics?.vendorPerformance || analytics.vendorPerformance.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No supplier performance metrics evaluated yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/75 hover:bg-slate-50/75">
                      <TableHead className="font-semibold text-slate-700">Company Name</TableHead>
                      <TableHead className="font-semibold text-slate-700">Category</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-center">Star Rating</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-center">Fulfillment Score</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-center">Total Orders Issued</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-right">Cumulative Spend Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.vendorPerformance.map((v) => (
                      <TableRow key={v.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-bold text-slate-900">{v.companyName}</TableCell>
                        <TableCell className="capitalize text-slate-600">{v.category.replace('_', ' ').toLowerCase()}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-0.5 font-bold text-amber-500 text-sm">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                            {v.rating.toFixed(1)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1 font-bold text-emerald-700 text-sm">
                            <Award className="h-4 w-4" />
                            {v.performanceScore}%
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-medium text-slate-700">{v.totalOrders} POs</TableCell>
                        <TableCell className="text-right font-black text-slate-900">{formatRupee(v.totalSpend)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
