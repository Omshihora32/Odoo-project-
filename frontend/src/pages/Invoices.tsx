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
import { Receipt, PlusCircle, Search, FileDown, Mail, Printer, Trash2, Eye, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface InvoiceItem {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  gstAmount: number;
  totalPrice: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  grandTotal: number;
  status: 'DRAFT' | 'SENT' | 'PAID';
  createdAt: string;
  purchaseOrder: {
    id: string;
    poNumber: string;
  };
  vendor: {
    id: string;
    companyName: string;
    email: string;
  };
  items: InvoiceItem[];
}

export default function Invoices() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Create Invoice states
  const [selectedPoId, setSelectedPoId] = useState('');
  const [gstRate, setGstRate] = useState(18);

  // Fetch Invoices
  const { data: invoiceData, isLoading, refetch } = useApi<{ data: Invoice[] }>({
    url: '/invoices',
    params: { search: search || undefined },
  });

  // Fetch POs for dropdown (SENT status means it can be invoiced)
  const { data: poData } = useApi<{ data: any[] }>({
    url: '/purchase-orders',
    params: { status: 'SENT' },
  });

  const { mutate, isLoading: isMutating } = useApiMutation();

  const invoices = Array.isArray(invoiceData) ? invoiceData : (invoiceData as any)?.data || [];
  const purchaseOrdersList = Array.isArray(poData) ? poData : (poData as any)?.data || [];

  const isVendor = user?.role === 'vendor';
  const isPO = user?.role === 'procurement_officer' || user?.role === 'admin';

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedPo = purchaseOrdersList.find((p: any) => p.id === selectedPoId);
      if (!selectedPo) return;

      const payload = {
        purchaseOrderId: selectedPo.id,
        vendorId: selectedPo.vendor.id,
        gstRate: Number(gstRate),
        items: selectedPo.items.map((item: any) => ({
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
      };

      await mutate('post', '/invoices', payload);
      toast({ title: 'Success', description: 'Invoice generated successfully in DRAFT status.' });
      setIsCreateOpen(false);
      setSelectedPoId('');
      refetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to generate Invoice.', variant: 'destructive' });
    }
  };

  const handleSendEmail = async (id: string) => {
    try {
      await mutate('post', `/invoices/${id}/email`);
      toast({ title: 'Email Sent', description: 'Invoice PDF sent to vendor successfully.' });
      refetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to email invoice.', variant: 'destructive' });
    }
  };

  const handleDownloadPDF = async (id: string, invoiceNumber: string) => {
    try {
      const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast({ title: 'Error', description: 'Failed to download PDF document.', variant: 'destructive' });
    }
  };

  const handlePrint = async (id: string) => {
    try {
      const response = await api.get(`/invoices/${id}/print`);
      const data = response.data.data;
      
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const html = `
        <html>
          <head>
            <title>Print Invoice - ${data.invoiceNumber}</title>
            <style>
              body { font-family: sans-serif; padding: 20px; color: #333; }
              .header { display: flex; justify-content: space-between; border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
              .company { font-size: 24px; font-weight: bold; }
              .details { margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
              th { bg-color: #f5f5f5; }
              .total-sec { text-align: right; margin-top: 20px; font-size: 16px; font-weight: bold; }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            <div class="header">
              <div>
                <div class="company">VendorBridge ERP</div>
                <div>Procurement Department</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 18px; font-weight: bold;">INVOICE</div>
                <div>No: ${data.invoiceNumber}</div>
                <div>Date: ${data.date}</div>
              </div>
            </div>
            <div class="details">
              <strong>Billed From (Supplier):</strong><br/>
              ${data.vendor.companyName}<br/>
              Contact: ${data.vendor.contactName}<br/>
              Email: ${data.vendor.email}<br/>
              GSTIN: ${data.vendor.gstNumber || 'N/A'}<br/>
              Address: ${data.vendor.address || 'N/A'}
            </div>
            <div>
              <strong>Reference PO:</strong> ${data.poNumber}
            </div>
            <table>
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>GST Amount</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${data.items.map((i: any) => `
                  <tr>
                    <td>${i.itemName}</td>
                    <td>${i.quantity} ${i.unit}</td>
                    <td>₹${i.unitPrice}</td>
                    <td>₹${i.gstAmount}</td>
                    <td>₹${i.totalPrice}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="total-sec">
              Subtotal: ₹${data.subtotal.toLocaleString()}<br/>
              GST Amount (${data.gstRate}%): ₹${data.gstAmount.toLocaleString()}<br/>
              Grand Total: ₹${data.grandTotal.toLocaleString()}
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
    } catch {
      toast({ title: 'Error', description: 'Failed to print invoice.', variant: 'destructive' });
    }
  };

  const handleUpdateStatus = async (id: string, status: 'PAID') => {
    try {
      await mutate('put', `/invoices/${id}`, { status });
      toast({ title: 'Status Updated', description: 'Invoice status changed to PAID.' });
      refetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Operation failed.', variant: 'destructive' });
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await mutate('delete', `/invoices/${id}`);
      toast({ title: 'Deleted', description: 'Invoice deleted successfully.' });
      refetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete invoice.', variant: 'destructive' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-slate-100 text-slate-800';
      case 'SENT':
        return 'bg-blue-100 text-blue-800';
      case 'PAID':
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate invoices against fulfilled Purchase Orders, review GST details, print, and export.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-sm" onClick={() => setSelectedPoId('')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Generate Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Generate Invoice</DialogTitle>
                <DialogDescription>Generate an billing invoice against a completed Purchase Order.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="poSelect">Select Issued PO</Label>
                  <Select value={selectedPoId} onValueChange={setSelectedPoId}>
                    <SelectTrigger id="poSelect">
                      <SelectValue placeholder="Choose a Purchase Order" />
                    </SelectTrigger>
                    <SelectContent>
                      {purchaseOrdersList.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.poNumber} — {p.vendor.companyName} (₹{p.grandTotal})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gstRate">GST Rate (%)</Label>
                  <Input id="gstRate" type="number" min="0" max="100" value={gstRate} onChange={(e) => setGstRate(Number(e.target.value))} required />
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isMutating || !selectedPoId}>
                    {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Generate Invoice
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Filter */}
      <Card className="shadow-sm border-slate-100">
        <CardContent className="p-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search Invoice Number..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                refetch();
              }}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoice Table */}
      <Card className="shadow-sm border-slate-100">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600 mb-2" /> Loading invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Receipt className="h-12 w-12 mx-auto text-slate-300 mb-3" /> No invoices found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/75 hover:bg-slate-50/75">
                  <TableHead className="font-semibold text-slate-700">Invoice Number</TableHead>
                  <TableHead className="font-semibold text-slate-700">PO Ref</TableHead>
                  <TableHead className="font-semibold text-slate-700">Supplier Company</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Tax (GST)</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Grand Total</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv: Invoice) => (
                  <TableRow key={inv.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-semibold font-mono text-slate-900">{inv.invoiceNumber}</TableCell>
                    <TableCell className="font-mono text-slate-700 text-xs">{inv.purchaseOrder.poNumber}</TableCell>
                    <TableCell className="font-semibold text-slate-800">{inv.vendor.companyName}</TableCell>
                    <TableCell className="text-right font-medium text-slate-600">₹{inv.gstAmount.toLocaleString()} ({inv.gstRate}%)</TableCell>
                    <TableCell className="text-right font-bold text-slate-950">₹{inv.grandTotal.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(inv.status)}`}>
                        {inv.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => { setSelectedInvoice(inv); setIsDetailOpen(true); }} title="View Details">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-indigo-600" onClick={() => handleDownloadPDF(inv.id, inv.invoiceNumber)} title="Download PDF">
                          <FileDown className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-600" onClick={() => handlePrint(inv.id)} title="Print Layout">
                          <Printer className="h-4 w-4" />
                        </Button>
                        {isPO && inv.status !== 'PAID' && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={() => handleUpdateStatus(inv.id, 'PAID')} title="Mark as PAID">
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {isPO && inv.status !== 'SENT' && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-indigo-600" onClick={() => handleSendEmail(inv.id)} title="Email to vendor">
                            <Mail className="h-4 w-4" />
                          </Button>
                        )}
                        {isPO && inv.status === 'DRAFT' && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => handleDeleteInvoice(inv.id)} title="Delete invoice">
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

      {/* Invoice Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        {selectedInvoice && (
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <div>
                  <Badge variant="secondary" className="font-mono text-xs">{selectedInvoice.invoiceNumber}</Badge>
                  <DialogTitle className="text-lg font-bold mt-1">Tax Invoice details</DialogTitle>
                </div>
                <Badge className={`${getStatusColor(selectedInvoice.status)}`}>{selectedInvoice.status}</Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 text-xs font-semibold block">Billed From (Supplier)</span>
                  <span className="font-bold text-slate-800 block mt-0.5">{selectedInvoice.vendor.companyName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-semibold block">Reference PO</span>
                  <span className="font-bold text-slate-800 block mt-0.5 font-mono">{selectedInvoice.purchaseOrder.poNumber}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-1.5">
                <Label className="font-semibold text-slate-700 text-sm">Billing Items Specifications</Label>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-semibold text-xs py-1.5">Item Name</TableHead>
                        <TableHead className="font-semibold text-xs py-1.5 text-right">Quantity</TableHead>
                        <TableHead className="font-semibold text-xs py-1.5 text-right">GST Amount</TableHead>
                        <TableHead className="font-semibold text-xs py-1.5 text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-slate-900 py-2">
                            <div>{item.itemName}</div>
                            <div className="text-xs text-slate-400">Rate: ₹{item.unitPrice} / unit</div>
                          </TableCell>
                          <TableCell className="text-right text-slate-700 py-2">{item.quantity} {item.unit}</TableCell>
                          <TableCell className="text-right text-slate-700 py-2">₹{item.gstAmount.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-bold text-slate-900 py-2">₹{item.totalPrice.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                        <TableCell className="font-semibold text-slate-600 py-1.5">Subtotal</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right text-slate-750 font-medium py-1.5">₹{selectedInvoice.subtotal.toLocaleString()}</TableCell>
                      </TableRow>
                      <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                        <TableCell className="font-semibold text-slate-600 py-1.5">GST ({selectedInvoice.gstRate}%)</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right text-slate-750 font-medium py-1.5">₹{selectedInvoice.gstAmount.toLocaleString()}</TableCell>
                      </TableRow>
                      <TableRow className="bg-slate-50/75 hover:bg-slate-50/75 font-bold">
                        <TableCell className="text-slate-900 py-2">Grand Total</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                        <TableCell className="text-right font-black text-slate-950 text-base py-2">₹{selectedInvoice.grandTotal.toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button type="button" variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
              <Button type="button" variant="outline" className="border-slate-200 text-slate-700" onClick={() => handlePrint(selectedInvoice.id)}>
                <Printer className="mr-1.5 h-4 w-4" /> Print Invoice
              </Button>
              <Button type="button" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => handleDownloadPDF(selectedInvoice.id, selectedInvoice.invoiceNumber)}>
                <FileDown className="mr-1.5 h-4 w-4" /> Download PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
