import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { User as UserIcon, Building2, Phone, MapPin, BadgePercent, Loader2, Save } from 'lucide-react';
import api from '@/lib/api';

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // User details states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userCountry, setUserCountry] = useState('');

  // Vendor details states (only for vendor role)
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [address, setAddress] = useState('');
  const [vendorCountry, setVendorCountry] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setUserPhone(user.phone || '');
      setUserCountry(user.country || '');

      if (user.role === 'vendor' && user.vendor) {
        setCompanyName(user.vendor.companyName || '');
        setContactName(user.vendor.contactName || '');
        setVendorPhone(user.vendor.phone || '');
        setAddress(user.vendor.address || '');
        setVendorCountry(user.vendor.country || '');
        setGstNumber(user.vendor.gstNumber || '');
      }
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // 1. Save User Profile
      const userPayload = {
        firstName,
        lastName,
        phone: userPhone || null,
        country: userCountry || null,
      };
      
      const userRes = await api.put('/auth/profile', userPayload);
      let updatedUser = {
        ...user,
        ...userRes.data.data.user
      };

      // 2. Save Vendor Profile (if role is vendor)
      if (user?.role === 'vendor' && user.vendor?.id) {
        const vendorPayload = {
          companyName,
          contactName,
          phone: vendorPhone || null,
          address: address || null,
          country: vendorCountry || null,
          gstNumber: gstNumber || null,
        };

        const vendorRes = await api.put(`/vendors/${user.vendor.id}`, vendorPayload);
        updatedUser = {
          ...updatedUser,
          vendor: {
            ...updatedUser.vendor,
            ...vendorRes.data.data
          }
        };
      }

      // 3. Update the Zustand store and LocalStorage
      const normalizeUser = (u: any) => {
        if (!u) return u;
        return {
          ...u,
          name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
          role: (u.role || '').toLowerCase()
        };
      };
      
      const normalized = normalizeUser(updatedUser);
      localStorage.setItem('vendorbridge_user', JSON.stringify(normalized));
      
      // Update state in Zustand auth store
      useAuthStore.setState({ user: normalized });

      toast({
        title: 'Success',
        description: 'Profile details updated successfully.',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to update profile.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your personal details and company credentials for the procurement portal.
        </p>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Personal Details */}
        <Card className="shadow-sm border-slate-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 font-bold text-slate-800">
              <UserIcon className="h-5 w-5 text-emerald-600" />
              Personal Credentials
            </CardTitle>
            <CardDescription>Update your contact and administrative profile settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address (Read-only)</Label>
                <Input id="email" type="email" value={user?.email || ''} disabled className="bg-slate-50 border-slate-200" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role">Workspace Role (Read-only)</Label>
                <Input id="role" value={user?.role?.replace('_', ' ').toUpperCase() || ''} disabled className="bg-slate-50 border-slate-200" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="userPhone">Phone Number</Label>
                <Input id="userPhone" value={userPhone} onChange={(e) => setUserPhone(e.target.value)} placeholder="+91 99999 88888" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="userCountry">Country</Label>
                <Input id="userCountry" value={userCountry} onChange={(e) => setUserCountry(e.target.value)} placeholder="India" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendor Partner Details (Only for Vendor Role) */}
        {user?.role === 'vendor' && (
          <Card className="shadow-sm border-slate-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 font-bold text-slate-800">
                <Building2 className="h-5 w-5 text-indigo-600" />
                Supplier Company Information
              </CardTitle>
              <CardDescription>Company profile details shared with the procurement team.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contactName">Primary Contact Name</Label>
                  <Input id="contactName" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="gstNumber" className="flex items-center gap-1"><BadgePercent className="h-4 w-4 text-slate-400" /> GST Identification Number</Label>
                  <Input id="gstNumber" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="29AAAAA0000A1Z0" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vendorPhone" className="flex items-center gap-1"><Phone className="h-4 w-4 text-slate-400" /> Company Phone</Label>
                  <Input id="vendorPhone" value={vendorPhone} onChange={(e) => setVendorPhone(e.target.value)} placeholder="+91 99999 88888" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="address" className="flex items-center gap-1"><MapPin className="h-4 w-4 text-slate-400" /> Street Address</Label>
                  <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Plot No. 100, Industrial Area" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vendorCountry" className="flex items-center gap-1"><MapPin className="h-4 w-4 text-slate-400" /> Company Country</Label>
                  <Input id="vendorCountry" value={vendorCountry} onChange={(e) => setVendorCountry(e.target.value)} placeholder="India" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Button */}
        <div className="flex justify-end">
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 font-bold px-6 py-2 shadow" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" /> Save Profile Settings
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
