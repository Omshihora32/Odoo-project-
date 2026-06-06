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
import { Users, PlusCircle, Search, Star, Trash2, Edit2, Loader2, Award } from 'lucide-react';

interface Vendor {
  id: string;
  companyName: string;
  gstNumber: string | null;
  category: string;
  contactName: string;
  email: string;
  phone: string | null;
  address: string | null;
  country: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED' | 'PENDING';
  rating: number;
  performanceScore: number;
}

const CATEGORIES = [
  { value: 'IT_HARDWARE', label: 'IT Hardware' },
  { value: 'IT_SOFTWARE', label: 'IT Software' },
  { value: 'OFFICE_SUPPLIES', label: 'Office Supplies' },
  { value: 'RAW_MATERIALS', label: 'Raw Materials' },
  { value: 'LOGISTICS', label: 'Logistics' },
  { value: 'CONSULTING', label: 'Consulting' },
  { value: 'MAINTENANCE', label: 'Maintenance' },
  { value: 'ELECTRICAL', label: 'Electrical' },
  { value: 'CONSTRUCTION', label: 'Construction' },
  { value: 'OTHER', label: 'Other' },
];

export default function Vendors() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  // Form states
  const [companyName, setCompanyName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('India');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'BLACKLISTED' | 'PENDING'>('PENDING');
  const [rating, setRating] = useState(0);
  const [performanceScore, setPerformanceScore] = useState(0);

  const { data: vendorData, isLoading, refetch } = useApi<{ data: Vendor[] }>({
    url: '/vendors',
    params: {
      search: search || undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
    },
  });

  const { mutate, isLoading: isMutating } = useApiMutation();

  const vendors = Array.isArray(vendorData) ? vendorData : (vendorData as any)?.data || [];

  const handleOpenEdit = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setCompanyName(vendor.companyName);
    setGstNumber(vendor.gstNumber || '');
    setCategory(vendor.category);
    setContactName(vendor.contactName);
    setEmail(vendor.email);
    setPhone(vendor.phone || '');
    setAddress(vendor.address || '');
    setCountry(vendor.country || 'India');
    setStatus(vendor.status);
    setRating(vendor.rating);
    setPerformanceScore(vendor.performanceScore);
    setIsEditOpen(true);
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await mutate('post', '/vendors', {
        companyName,
        gstNumber: gstNumber || null,
        category,
        contactName,
        email,
        phone: phone || null,
        address: address || null,
        country: country || null,
        status,
      });
      toast({
        title: 'Success',
        description: 'Vendor created successfully.',
      });
      setIsCreateOpen(false);
      resetForm();
      refetch();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to create vendor.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor) return;
    try {
      await mutate('put', `/vendors/${selectedVendor.id}`, {
        companyName,
        gstNumber: gstNumber || null,
        category,
        contactName,
        email,
        phone: phone || null,
        address: address || null,
        country: country || null,
        status,
        rating: Number(rating),
        performanceScore: Number(performanceScore),
      });
      toast({
        title: 'Success',
        description: 'Vendor updated successfully.',
      });
      setIsEditOpen(false);
      refetch();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to update vendor.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteVendor = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this vendor?')) return;
    try {
      await mutate('delete', `/vendors/${id}`);
      toast({
        title: 'Success',
        description: 'Vendor deactivated successfully.',
      });
      refetch();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete vendor.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setCompanyName('');
    setGstNumber('');
    setCategory('OTHER');
    setContactName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCountry('India');
    setStatus('PENDING');
    setRating(0);
    setPerformanceScore(0);
  };

  const getStatusColor = (vStatus: string) => {
    switch (vStatus) {
      case 'ACTIVE':
        return 'bg-emerald-100 text-emerald-800';
      case 'INACTIVE':
        return 'bg-slate-100 text-slate-800';
      case 'BLACKLISTED':
        return 'bg-rose-100 text-rose-800';
      case 'PENDING':
      default:
        return 'bg-amber-100 text-amber-800';
    }
  };

  const canEdit = user?.role === 'admin' || user?.role === 'procurement_officer' || user?.role === 'vendor' || user?.role === 'manager';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Vendors</h1>
          <p className="text-sm text-slate-500 mt-1">
            Maintain the directory of suppliers, complete with categories, ratings, and performance scores.
          </p>
        </div>
        {canEdit && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-sm" onClick={resetForm}>
                <PlusCircle className="mr-2 h-4 w-4" /> Register Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Register Supplier</DialogTitle>
                <DialogDescription>Create a vendor profile and login account credentials.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateVendor} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gstNumber">GST Number</Label>
                    <Input id="gstNumber" placeholder="27XXXXX0000X0Z0" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="category">Supplier Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contactName">Primary Contact Name</Label>
                    <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="vendor@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="status">Onboarding Status</Label>
                  <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending Approval</SelectItem>
                      <SelectItem value="ACTIVE">Active Partner</SelectItem>
                      <SelectItem value="INACTIVE">Inactive Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isMutating}>
                    {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Register
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
              placeholder="Search company, contact, email or GST..."
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

      {/* Vendors Table */}
      <Card className="shadow-sm border-slate-100">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600 mb-2" /> Loading supplier list...
            </div>
          ) : vendors.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Users className="h-12 w-12 mx-auto text-slate-300 mb-3" /> No suppliers match the criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/75 hover:bg-slate-50/75">
                  <TableHead className="font-semibold text-slate-700">Company Name</TableHead>
                  <TableHead className="font-semibold text-slate-700">Category</TableHead>
                  <TableHead className="font-semibold text-slate-700">Contact</TableHead>
                  <TableHead className="font-semibold text-slate-700">Email & Phone</TableHead>
                  <TableHead className="font-semibold text-slate-700">Rating</TableHead>
                  <TableHead className="font-semibold text-slate-700">Performance</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  {canEdit && <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor: Vendor) => (
                  <TableRow key={vendor.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium text-slate-900">
                      <div>{vendor.companyName}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{vendor.gstNumber || 'No GST details'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {(vendor.category || '').replace('_', ' ').toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-700 font-medium">{vendor.contactName}</TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      <div>{vendor.email}</div>
                      <div className="mt-0.5">{vendor.phone || '—'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-amber-500 font-semibold text-sm">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        {(vendor.rating || 0).toFixed(1)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Award className="h-4 w-4 text-emerald-600" />
                        <span className="font-bold text-sm text-slate-800">{vendor.performanceScore || 0}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(vendor.status)}`}>
                        {vendor.status}
                      </span>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => handleOpenEdit(vendor)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => handleDeleteVendor(vendor.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Vendor Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modify Supplier Details</DialogTitle>
            <DialogDescription>Update the partner profile settings and performance stats.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateVendor} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="editCompanyName">Company Name</Label>
                <Input id="editCompanyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editGstNumber">GST Number</Label>
                <Input id="editGstNumber" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="editCategory">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="editCategory">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editContactName">Contact Name</Label>
                <Input id="editContactName" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="editEmail">Email</Label>
                <Input id="editEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editPhone">Phone</Label>
                <Input id="editPhone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="editAddress">Address</Label>
                <Input id="editAddress" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editCountry">Country</Label>
                <Input id="editCountry" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="editRating">Rating (0-5)</Label>
                <Input id="editRating" type="number" step="0.1" min="0" max="5" value={rating} onChange={(e) => setRating(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editPerformance">Score (0-100%)</Label>
                <Input id="editPerformance" type="number" min="0" max="100" value={performanceScore} onChange={(e) => setPerformanceScore(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editStatus">Status</Label>
                <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                  <SelectTrigger id="editStatus">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="BLACKLISTED">Blacklisted</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={isMutating}>
                {isMutating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
