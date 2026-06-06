import { useState } from 'react';
import { useApi, useApiMutation } from '@/hooks/useApi';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, PlusCircle, Search, Trash2, Calendar, FileDown, Loader2, Send } from 'lucide-react';

interface RFQItem {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  expectedPrice: number | null;
}

interface RFQVendor {
  id: string;
  vendorId: string;
  status: string;
  vendor: {
    companyName: string;
    email: string;
  };
}

interface RFQ {
  id: string;
  rfqNumber: string;
  title: string;
  description: string | null;
  category: string;
  deadline: string;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'CANCELLED';
  createdBy: {
    firstName: string;
    lastName: string;
  };
  items: RFQItem[];
  vendors: RFQVendor[];
  _count: {
    quotations: number;
  };
  hasAcceptedQuotation?: boolean;
}

interface Vendor {
  id: string;
  companyName: string;
}

const CATEGORIES = [
  { value: 'IT_HARDWARE', label: 'IT Hardware' },
  { value: 'IT_SOFTWARE', label: 'IT Software' },
  { value: 'OFFICE_SUPPLIES', label: 'Office Supplies' },
  { value: 'RAW_MATERIALS', label: 'Raw Materials' },
  { value: 'LOGISTICS', label: 'Logistics' },
  { value: 'CONSULTING', label: 'Consulting' },
  { value: 'OTHER', label: 'Other' },
];

export default function RFQs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Creation States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [deadline, setDeadline] = useState('');
  const [items, setItems] = useState<Array<{ itemName: string; quantity: number; unit: string; expectedPrice: number }>>([
    { itemName: '', quantity: 1, unit: 'Units', expectedPrice: 0 },
  ]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);

  // Detailed View State
  const [selectedRfq, setSelectedRfq] = useState<RFQ | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Fetch RFQs list
  const { data: rfqData, isLoading, refetch } = useApi<{ data: RFQ[] }>({
    url: '/rfqs',
    params: {
      search: search || undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
    },
  });

  // Fetch Vendors to assign
  const { data: vendorData } = useApi<{ data: Vendor[] }>({
    url: '/vendors',
    immediate: user?.role !== 'vendor',
  });

  const { mutate, isLoading: isMutating } = useApiMutation();

  const rfqs = Array.isArray(rfqData) ? rfqData : (rfqData as any)?.data || [];
  const vendorsList = Array.isArray(vendorData) ? vendorData : (vendorData as any)?.data || [];

  const isVendor = user?.role === 'vendor';
  const isPO = user?.role === 'procurement_officer' || user?.role === 'admin';

  const addItemField = () => {
    setItems([...items, { itemName: '', quantity: 1, unit: 'Units', expectedPrice: 0 }]);
  };

  const removeItemField = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const handleVendorCheckboxChange = (vendorId: string) => {
    if (selectedVendors.includes(vendorId)) {
      setSelectedVendors(selectedVendors.filter((id) => id !== vendorId));
    } else {
      setSelectedVendors([...selectedVendors, vendorId]);
    }
  };

  const handleCreateRFQ = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title,
        description,
        category,
        deadline: new Date(deadline).toISOString(),
        items: items.map((item) => ({
          itemName: item.itemName,
          quantity: Number(item.quantity),
          unit: item.unit,
          expectedPrice: item.expectedPrice ? Number(item.expectedPrice) : null,
        })),
        vendorIds: selectedVendors,
      };

      await mutate('post', '/rfqs', payload);
      toast({ title: 'Success', description: 'RFQ created in DRAFT status.' });
      setIsCreateOpen(false);
      resetForm();
      refetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create RFQ.', variant: 'destructive' });
    }
  };

  const handlePublishRFQ = async (rfqId: string, inviteVendors: string[]) => {
    try {
      await mutate('post', `/rfqs/${rfqId}/publish`, { vendorIds: inviteVendors });
      toast({ title: 'Published', description: 'RFQ published and suppliers notified.' });
      refetch();
      if (selectedRfq?.id === rfqId) {
        setIsDetailOpen(false);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to publish RFQ.', variant: 'destructive' });
    }
  };

  const handleDeleteRFQ = async (rfqId: string) => {
    if (!confirm('Are you sure you want to delete/cancel this RFQ?')) return;
    try {
      await mutate('delete', `/rfqs/${rfqId}`);
      toast({ title: 'Cancelled', description: 'RFQ cancelled successfully.' });
      refetch();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to cancel RFQ.', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('OTHER');
    setDeadline('');
    setItems([{ itemName: '', quantity: 1, unit: 'Units', expectedPrice: 0 }]);
    setSelectedVendors([]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-slate-100 text-slate-800';
      case 'PUBLISHED':
        return 'bg-emerald-100 text-emerald-800';
      case 'CLOSED':
        return 'bg-amber-100 text-amber-800';
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-800';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800 font-semibold';
      default:
        return 'bg-slate-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Requests for Quotations (RFQs)</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create RFQs, specify expected pricing, assign suppliers, and review submissions.
          </p>
        </div>
        {isPO && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-sm" onClick={resetForm}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create RFQ
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New RFQ</DialogTitle>
                <DialogDescription>Create a draft procurement requisition and select vendors.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateRFQ} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="title">RFQ Title</Label>
                    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="deadline">Submission Deadline</Label>
                    <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                  </div>
                </div>

                {/* Items Requisitions */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <div className="flex justify-between items-center">
                    <Label className="font-semibold text-slate-700 text-sm">Requested Items</Label>
                    <Button type="button" variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 font-semibold" onClick={addItemField}>
                      + Add Item Requisition
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {items.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5">
                          <Input placeholder="Item Name/Specs" value={item.itemName} onChange={(e) => handleItemChange(index, 'itemName', e.target.value)} required />
                        </div>
                        <div className="col-span-2">
                          <Input type="number" placeholder="Qty" min="1" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} required />
                        </div>
                        <div className="col-span-2">
                          <Input placeholder="Unit" value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} required />
                        </div>
                        <div className="col-span-2">
                          <Input type="number" placeholder="Exp Price" value={item.expectedPrice} onChange={(e) => handleItemChange(index, 'expectedPrice', e.target.value)} />
                        </div>
                        <div className="col-span-1 text-right">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-rose-500" onClick={() => removeItemField(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vendor Invitations */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  <Label className="font-semibold text-slate-700 text-sm">Invite Suppliers</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                    {vendorsList.map((v: any) => (
                      <div key={v.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`vendor-${v.id}`}
                          checked={selectedVendors.includes(v.id)}
                          onChange={() => handleVendorCheckboxChange(v.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4 border-gray-300"
                        />
                        <Label htmlFor={`vendor-${v.id}`} className="text-xs text-slate-700 font-medium cursor-pointer">{v.companyName}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <DialogFooter className="pt-2 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isMutating}>
                    {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save Requisition
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card className="shadow-sm border-slate-100">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search RFQ Number, Title or Details..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                refetch();
              }}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Select
              value={selectedCategory}
              onValueChange={(val) => {
                setSelectedCategory(val);
                refetch();
              }}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* RFQ List Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600 mb-2" /> Loading RFQs...
        </div>
      ) : rfqs.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-100 rounded-lg shadow-sm text-slate-400">
          <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" /> No Requests for Quotations found.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rfqs.map((rfq: RFQ) => (
            <Card key={rfq.id} className="shadow-sm border-slate-100 hover:shadow-md transition-all flex flex-col justify-between">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <Badge variant="secondary" className="font-semibold font-mono text-emerald-700">{rfq.rfqNumber}</Badge>
                  <Badge className={`${getStatusColor(rfq.hasAcceptedQuotation ? 'APPROVED' : rfq.status)}`}>
                    {rfq.hasAcceptedQuotation ? 'APPROVED' : rfq.status}
                  </Badge>
                </div>
                <CardTitle className="text-lg font-bold text-slate-900 mt-2 hover:text-emerald-700 cursor-pointer" onClick={() => { setSelectedRfq(rfq); setIsDetailOpen(true); }}>
                  {rfq.title}
                </CardTitle>
                <CardDescription className="line-clamp-2 mt-1">{rfq.description || 'No description provided.'}</CardDescription>
              </CardHeader>
              <CardContent className="pt-2 pb-4 flex-grow">
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 font-medium">
                  <div className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-slate-400" /> Deadline: {new Date(rfq.deadline).toLocaleDateString()}</div>
                  <div className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-slate-400" /> Items: {rfq.items?.length || 0} items</div>
                  <div className="flex items-center gap-1.5 capitalize"><Badge variant="outline">{rfq.category.replace('_', ' ').toLowerCase()}</Badge></div>
                  <div className="flex items-center gap-1.5"><Send className="h-3.5 w-3.5 text-slate-400" /> Quotes: {rfq._count?.quotations || 0} submitted</div>
                </div>
              </CardContent>
              <CardContent className="pt-2 border-t border-slate-100 bg-slate-50/50 rounded-b-lg flex justify-between items-center gap-2">
                <Button variant="ghost" size="sm" className="font-semibold text-slate-700 hover:text-emerald-700" onClick={() => { setSelectedRfq(rfq); setIsDetailOpen(true); }}>
                  View Details Requisition
                </Button>
                <div className="flex gap-1.5">
                  {isPO && rfq.status === 'DRAFT' && (
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" onClick={() => handlePublishRFQ(rfq.id, rfq.vendors.map((v) => v.vendorId))}>
                      Publish & Invite
                    </Button>
                  )}
                  {isPO && rfq.status !== 'CANCELLED' && !rfq.hasAcceptedQuotation && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500" onClick={() => handleDeleteRFQ(rfq.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* RFQ Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        {selectedRfq && (
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <Badge variant="secondary" className="font-mono text-xs">{selectedRfq.rfqNumber}</Badge>
                  <DialogTitle className="text-xl font-bold text-slate-900 mt-1">{selectedRfq.title}</DialogTitle>
                </div>
                <Badge className={`${getStatusColor(selectedRfq.hasAcceptedQuotation ? 'APPROVED' : selectedRfq.status)}`}>
                  {selectedRfq.hasAcceptedQuotation ? 'APPROVED' : selectedRfq.status}
                </Badge>
              </div>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-slate-500 font-medium text-xs">Description</Label>
                <p className="text-sm text-slate-800 font-medium mt-0.5">{selectedRfq.description || 'No description provided.'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 text-xs font-semibold block">Submission Deadline</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5"><Calendar className="h-4 w-4 text-emerald-600" /> {new Date(selectedRfq.deadline).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-xs font-semibold block">Created By</span>
                  <span className="font-bold text-slate-800 block mt-0.5">{selectedRfq.createdBy.firstName} {selectedRfq.createdBy.lastName}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <Label className="font-semibold text-slate-700 text-sm">Requested Items Specifications</Label>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-semibold text-xs py-2">Item Name</TableHead>
                        <TableHead className="font-semibold text-xs py-2 text-right">Quantity</TableHead>
                        <TableHead className="font-semibold text-xs py-2 text-right">Expected Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRfq.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm font-medium text-slate-900">{item.itemName}</TableCell>
                          <TableCell className="text-sm text-right font-medium text-slate-700">{item.quantity} {item.unit}</TableCell>
                          <TableCell className="text-sm text-right text-slate-700 font-semibold">{item.expectedPrice ? `₹${item.expectedPrice}` : 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Invited Vendors List */}
              {!isVendor && (
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700 text-sm">Assigned Suppliers Onboarding Status</Label>
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[140px] overflow-y-auto">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-semibold text-xs py-2">Company Name</TableHead>
                          <TableHead className="font-semibold text-xs py-2">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRfq.vendors.map((rv) => (
                          <TableRow key={rv.id}>
                            <TableCell className="text-xs font-semibold text-slate-800">{rv.vendor.companyName}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs uppercase font-semibold text-slate-600">{rv.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button type="button" variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
              {isPO && selectedRfq.status === 'DRAFT' && (
                <Button type="button" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handlePublishRFQ(selectedRfq.id, selectedRfq.vendors.map((v) => v.vendorId))}>
                  Publish & Invite Suppliers
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
