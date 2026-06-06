import { useState } from 'react';
import { useApi, useApiMutation } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ShoppingCart, PlusCircle, Search, FileDown, Mail, Trash2, Eye, Loader2, IndianRupee } from 'lucide-react';
import api from '@/lib/api';

interface POItem {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
  status: 'DRAFT' | 'APPROVED' | 'SENT';
  createdAt: string;
  rfq: {
    id: string;
    rfqNumber: string;
    title: string;
  };
  quotation: {
    id: string;
    quotationNumber: string;
  };
  vendor: {
    id: string;
    companyName: string;
    email: string;
  };
  items: POItem[];
}

export default function PurchaseOrders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Create PO states
  const [selectedApprovalId, setSelectedApprovalId] = useState('');

  // Fetch POs
  const { data: poData, isLoading, refetch } = useApi<{ data: PurchaseOrder[] }>({
    url: '/purchase-orders',
    params: { search: search || undefined },
  });

  // Fetch APPROVED approvals for PO generation
  const { data: approvalData } = useApi<{ data: any[] }>({
    url: '/approvals',
    params: { status: 'APPROVED' },
    immediate: user?.role !== 'vendor',
  });

  const { mutate, isLoading: isMutating } = useApiMutation();

  const pos = Array.isArray(poData) ? poData : (poData as any)?.data || [];
  const approvedSelections = Array.isArray(approvalData) ? approvalData : (approvalData as any)?.data || [];

  const isVendor = user?.role === 'vendor';
  const isPO = user?.role === 'procurement_officer' || user?.role === 'admin';

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedApproval = approvedSelections.find((a: any) => a.id === selectedApprovalId);
      if (!selectedApproval) return;

      const payload = {
        rfqId: selectedApproval.rfq.id,
        quotationId: selectedApproval.quotation.id,
        vendorId: selectedApproval.quotation.vendor.id,
        approvalId: selectedApproval.id,
        items: selectedApproval.quotation.items.map((item: any) => ({
          itemName: item.rfqItem.itemName,
          quantity: item.rfqItem.quantity,
          unit: item.rfqItem.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
      };

      await mutate('post', '/purchase-orders', payload);
      toast({ title: 'Success', description: 'Purchase Order generated successfully in DRAFT status.' });
      setIsCreateOpen(false);
      setSelectedApprovalId('');
      refetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to generate PO.', variant: 'destructive' });
    }
  };

  const handleSendPO = async (id: string) => {
    try {
      await mutate('post', `/purchase-orders/${id}/send`);
      toast({ title: 'Sent', description: 'Purchase Order PDF sent to supplier via email.' });
      refetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to send PO.', variant: 'destructive' });
    }
  };

  const handleDownloadPDF = async (id: string, poNumber: string) => {
    try {
      const response = await api.get(`/purchase-orders/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${poNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast({ title: 'Error', description: 'Failed to download PDF document.', variant: 'destructive' });
    }
  };

  const handleDeletePO = async (id: string) => {
    if (!confirm('Are you sure you want to delete this PO?')) return;
    try {
      await mutate('delete', `/purchase-orders/${id}`);
      toast({ title: 'Deleted', description: 'Purchase Order deleted successfully.' });
      refetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete PO.', variant: 'destructive' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-slate-100 text-slate-800';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800';
      case 'SENT':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-slate-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Purchase Orders</h1>
          <p className="text-sm text-slate-500 mt-1">
            Issue official Purchase Orders (POs) to suppliers, download PDF documents, and send emails.
          </p>
        </div>
        {isPO && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-sm" onClick={() => setSelectedApprovalId('')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Issue Purchase Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Issue Purchase Order</DialogTitle>
                <DialogDescription>Convert a manager approved quotation into a formal Purchase Order contract.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePO} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="approvalSelect">Select Approved Quotation</Label>
                  <Select value={selectedApprovalId} onValueChange={setSelectedApprovalId}>
                    <SelectTrigger id="approvalSelect">
                      <SelectValue placeholder="Choose an Approved Quote" />
                    </SelectTrigger>
                    <SelectContent>
                      {approvedSelections.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.rfq.rfqNumber} — {a.quotation.vendor.companyName} (₹{a.quotation.totalAmount})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isMutating || !selectedApprovalId}>
                    {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Issue PO
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search Filter */}
      <Card className="shadow-sm border-slate-100">
        <CardContent className="p-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search PO Number..."
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

      {/* PO Table */}
      <Card className="shadow-sm border-slate-100">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600 mb-2" /> Loading purchase orders...
            </div>
          ) : pos.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ShoppingCart className="h-12 w-12 mx-auto text-slate-300 mb-3" /> No purchase orders found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/75 hover:bg-slate-50/75">
                  <TableHead className="font-semibold text-slate-700">PO Number</TableHead>
                  <TableHead className="font-semibold text-slate-700">RFQ Ref</TableHead>
                  <TableHead className="font-semibold text-slate-700">Supplier Company</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Grand Total</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pos.map((po: PurchaseOrder) => (
                  <TableRow key={po.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-semibold font-mono text-slate-900">{po.poNumber}</TableCell>
                    <TableCell>
                      <div>{po.rfq.rfqNumber}</div>
                      <div className="text-xs text-slate-400 mt-0.5 max-w-[200px] truncate">{po.rfq.title}</div>
                    </TableCell>
                    <TableCell className="font-semibold text-slate-800">{po.vendor.companyName}</TableCell>
                    <TableCell className="text-right font-bold text-slate-950">₹{po.grandTotal.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(po.status)}`}>
                        {po.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => { setSelectedPo(po); setIsDetailOpen(true); }} title="View details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-indigo-600" onClick={() => handleDownloadPDF(po.id, po.poNumber)} title="Download PDF">
                          <FileDown className="h-4 w-4" />
                        </Button>
                        {isPO && po.status !== 'SENT' && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={() => handleSendPO(po.id)} title="Send to supplier">
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}
                        {isPO && po.status === 'DRAFT' && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => handleDeletePO(po.id)} title="Delete PO">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* PO Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        {selectedPo && (
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <div>
                  <Badge variant="secondary" className="font-mono text-xs">{selectedPo.poNumber}</Badge>
                  <DialogTitle className="text-lg font-bold mt-1">Purchase Order Contract</DialogTitle>
                </div>
                <Badge className={`${getStatusColor(selectedPo.status)}`}>{selectedPo.status}</Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 text-xs font-semibold block">Supplier Company</span>
                  <span className="font-bold text-slate-800 block mt-0.5">{selectedPo.vendor.companyName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-semibold block">Supplier Email</span>
                  <span className="font-bold text-slate-800 block mt-0.5">{selectedPo.vendor.email}</span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 text-sm">Requested Items Specifications</Label>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-semibold text-xs py-1.5">Item Name</TableHead>
                        <TableHead className="font-semibold text-xs py-1.5 text-right">Quantity</TableHead>
                        <TableHead className="font-semibold text-xs py-1.5 text-right">Unit Price</TableHead>
                        <TableHead className="font-semibold text-xs py-1.5 text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPo.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-slate-900 py-2">{item.itemName}</TableCell>
                          <TableCell className="text-right text-slate-700 py-2">{item.quantity} {item.unit}</TableCell>
                          <TableCell className="text-right text-slate-700 py-2">₹{item.unitPrice.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-slate-900 py-2">₹{item.totalPrice.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                        <TableCell className="font-semibold text-slate-600 py-1.5">Subtotal</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right text-slate-750 font-medium py-1.5">₹{selectedPo.subtotal.toLocaleString()}</TableCell>
                      </TableRow>
                      <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                        <TableCell className="font-semibold text-slate-600 py-1.5">GST (18% Flat)</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right text-slate-750 font-medium py-1.5">₹{selectedPo.gstAmount.toLocaleString()}</TableCell>
                      </TableRow>
                      <TableRow className="bg-slate-50/75 hover:bg-slate-50/75 font-bold">
                        <TableCell className="text-slate-900 py-2">Grand Total</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right font-black text-slate-950 text-base py-2">₹{selectedPo.grandTotal.toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button type="button" variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
              <Button type="button" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => handleDownloadPDF(selectedPo.id, selectedPo.poNumber)}>
                <FileDown className="mr-1.5 h-4 w-4" /> Download PO PDF
              </Button>
              {isPO && selectedPo.status !== 'SENT' && (
                <Button type="button" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSendPO(selectedPo.id)}>
                  <Mail className="mr-1.5 h-4 w-4" /> Send PO to Supplier
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
