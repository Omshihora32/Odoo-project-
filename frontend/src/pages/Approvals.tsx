import { useState } from 'react';
import { useApi, useApiMutation } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Search, ClipboardList, Loader2, Eye, UserCheck } from 'lucide-react';

interface Approval {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comments: string | null;
  createdAt: string;
  rfq: {
    id: string;
    rfqNumber: string;
    title: string;
    category: string;
  };
  quotation: {
    id: string;
    quotationNumber: string;
    totalAmount: number;
    deliveryDays: number;
    vendor: {
      companyName: string;
      email: string;
    };
    items: Array<{
      id: string;
      unitPrice: number;
      totalPrice: number;
      rfqItem: {
        itemName: string;
        quantity: number;
        unit: string;
      };
    }>;
  };
  approver: {
    firstName: string;
    lastName: string;
  };
}

export default function Approvals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [comments, setComments] = useState('');

  // Fetch approvals
  const { data: approvalData, isLoading, refetch } = useApi<{ data: Approval[] }>({
    url: '/approvals',
    params: { search: search || undefined },
  });

  const { mutate, isLoading: isMutating } = useApiMutation();

  const approvals = Array.isArray(approvalData) ? approvalData : (approvalData as any)?.data || [];

  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const handleProcessApproval = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await mutate('post', `/approvals/${id}/${status.toLowerCase()}`, { comments });
      toast({
        title: status === 'APPROVED' ? 'Approved' : 'Rejected',
        description: `Quotation has been successfully ${status.toLowerCase()}.`,
      });
      setIsDetailOpen(false);
      setComments('');
      refetch();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Operation failed.',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-800';
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-slate-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Approvals</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review recommended quotations, read comments, and approve or reject purchase requisitions.
        </p>
      </div>

      {/* Search Filter */}
      <Card className="shadow-sm border-slate-100">
        <CardContent className="p-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search RFQ or Quotation number..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSearch(e.target.value);
                refetch();
              }}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Approvals Table */}
      <Card className="shadow-sm border-slate-100">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600 mb-2" /> Loading approval list...
            </div>
          ) : approvals.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ClipboardList className="h-12 w-12 mx-auto text-slate-300 mb-3" /> No approvals requests found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/75 hover:bg-slate-50/75">
                  <TableHead className="font-semibold text-slate-700">RFQ Reference</TableHead>
                  <TableHead className="font-semibold text-slate-700">Quotation</TableHead>
                  <TableHead className="font-semibold text-slate-700">Supplier Name</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Quote Amount</TableHead>
                  <TableHead className="font-semibold text-slate-700">Approver Assigned</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvals.map((app: Approval) => (
                  <TableRow key={app.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium text-slate-900">
                      <div>{app.rfq.rfqNumber}</div>
                      <div className="text-xs text-slate-400 mt-0.5 max-w-[200px] truncate">{app.rfq.title}</div>
                    </TableCell>
                    <TableCell className="font-mono text-slate-700 text-xs">{app.quotation.quotationNumber}</TableCell>
                    <TableCell className="font-semibold text-slate-800">{app.quotation.vendor.companyName}</TableCell>
                    <TableCell className="text-right font-bold text-slate-950">₹{app.quotation.totalAmount.toLocaleString()}</TableCell>
                    <TableCell className="text-slate-700 font-medium">{app.approver.firstName} {app.approver.lastName}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(app.status)}`}>
                        {app.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="border-indigo-100 text-indigo-700 hover:bg-indigo-50 font-semibold" onClick={() => { setSelectedApproval(app); setComments(app.comments || ''); setIsDetailOpen(true); }}>
                        <Eye className="mr-1.5 h-4 w-4" /> Review Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Review Details Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        {selectedApproval && (
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <div>
                  <Badge variant="secondary" className="font-mono text-xs">{selectedApproval.quotation.quotationNumber}</Badge>
                  <DialogTitle className="text-lg font-bold mt-1">Review Approval Request</DialogTitle>
                </div>
                <Badge className={`${getStatusColor(selectedApproval.status)}`}>{selectedApproval.status}</Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 text-xs font-semibold block">Supplier Company</span>
                  <span className="font-bold text-slate-800 block mt-0.5">{selectedApproval.quotation.vendor.companyName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-semibold block">RFQ Requisition</span>
                  <span className="font-bold text-slate-800 block mt-0.5 font-mono">{selectedApproval.rfq.rfqNumber}</span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 text-sm">Pricing Details Requisition</Label>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-semibold text-xs py-1.5">Item Name</TableHead>
                        <TableHead className="font-semibold text-xs py-1.5 text-right">Unit Price</TableHead>
                        <TableHead className="font-semibold text-xs py-1.5 text-right">Total Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedApproval.quotation.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-slate-900 py-2">
                            <div>{item.rfqItem.itemName}</div>
                            <div className="text-xs text-slate-400">Qty: {item.rfqItem.quantity} {item.rfqItem.unit}</div>
                          </TableCell>
                          <TableCell className="text-right text-slate-700 py-2">₹{item.unitPrice.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-slate-900 py-2">₹{item.totalPrice.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50/75 hover:bg-slate-50/75 font-bold">
                        <TableCell>Grand Total</TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right font-black text-slate-950 text-base">₹{selectedApproval.quotation.totalAmount.toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Comments / Decision */}
              <div className="space-y-1.5 border-t border-slate-100 pt-3">
                <Label htmlFor="comments">Decision Comments/Remarks</Label>
                <Textarea
                  id="comments"
                  placeholder="Input feedback or reason for approval/rejection..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  disabled={selectedApproval.status !== 'PENDING' || !isManager}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3 flex justify-between items-center">
              <Button type="button" variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
              {selectedApproval.status === 'PENDING' && isManager && (
                <div className="flex gap-2">
                  <Button type="button" variant="destructive" onClick={() => handleProcessApproval(selectedApproval.id, 'REJECTED')} disabled={isMutating}>
                    <XCircle className="mr-1.5 h-4 w-4" /> Reject Requisition
                  </Button>
                  <Button type="button" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleProcessApproval(selectedApproval.id, 'APPROVED')} disabled={isMutating}>
                    <CheckCircle className="mr-1.5 h-4 w-4" /> Approve Requisition
                  </Button>
                </div>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
