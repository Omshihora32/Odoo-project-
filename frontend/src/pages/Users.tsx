import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Users as UsersIcon, PlusCircle, Search, Edit2, Trash2, Shield, UserCheck } from 'lucide-react';

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'PROCUREMENT_OFFICER' | 'MANAGER' | 'VENDOR';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

const INITIAL_USERS: SystemUser[] = [
  { id: '1', name: 'Amit Sharma', email: 'admin@vendorbridge.com', role: 'ADMIN', status: 'ACTIVE', createdAt: '2026-01-15' },
  { id: '2', name: 'Rohan Verma', email: 'procurement@vendorbridge.com', role: 'PROCUREMENT_OFFICER', status: 'ACTIVE', createdAt: '2026-02-10' },
  { id: '3', name: 'Priya Patel', email: 'manager@vendorbridge.com', role: 'MANAGER', status: 'ACTIVE', createdAt: '2026-02-18' },
  { id: '4', name: 'Tech Solutions Ltd.', email: 'vendor@techsolutions.com', role: 'VENDOR', status: 'ACTIVE', createdAt: '2026-03-01' },
  { id: '5', name: 'ABC Electronics', email: 'vendor@abcelectronics.com', role: 'VENDOR', status: 'INACTIVE', createdAt: '2026-04-12' },
];

export default function Users() {
  const { toast } = useToast();
  const [users, setUsers] = useState<SystemUser[]>(INITIAL_USERS);
  const [search, setSearch] = useState('');
  
  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'PROCUREMENT_OFFICER' | 'MANAGER' | 'VENDOR'>('PROCUREMENT_OFFICER');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const resetForm = () => {
    setName('');
    setEmail('');
    setRole('PROCUREMENT_OFFICER');
    setStatus('ACTIVE');
    setSelectedUser(null);
  };

  const handleOpenEdit = (user: SystemUser) => {
    setSelectedUser(user);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setStatus(user.status);
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      // Edit mode
      setUsers(users.map((u) => u.id === selectedUser.id ? { ...u, name, email, role, status } : u));
      toast({ title: 'User Updated', description: `User profile for ${name} has been updated.` });
    } else {
      // Create mode
      const newUser: SystemUser = {
        id: (users.length + 1).toString(),
        name,
        email,
        role,
        status,
        createdAt: new Date().toISOString().split('T')[0],
      };
      setUsers([...users, newUser]);
      toast({ title: 'User Created', description: `New user ${name} registered successfully.` });
    }
    setIsOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return;
    setUsers(users.filter((u) => u.id !== id));
    toast({ title: 'User Removed', description: 'The user account has been deleted.' });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PROCUREMENT_OFFICER':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MANAGER':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'VENDOR':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage system users, assign roles, define operational permissions, and monitor active profiles.
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-sm" onClick={resetForm}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedUser ? 'Edit User Credentials' : 'Create System User'}</DialogTitle>
              <DialogDescription>Define account details and assign an access level role.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="role">Security Role</Label>
                  <Select value={role} onValueChange={(val: any) => setRole(val)}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                      <SelectItem value="PROCUREMENT_OFFICER">PROCUREMENT_OFFICER</SelectItem>
                      <SelectItem value="MANAGER">MANAGER</SelectItem>
                      <SelectItem value="VENDOR">VENDOR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="status">Account Status</Label>
                  <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  {selectedUser ? 'Save Changes' : 'Create Account'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-sm border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total System Users</CardTitle>
            <UsersIcon className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-slate-400 mt-0.5">Across 4 access tiers</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Accounts</CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter((u) => u.status === 'ACTIVE').length}</div>
            <p className="text-xs text-emerald-600 mt-0.5">Ready for login</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">Security Admins</CardTitle>
            <Shield className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter((u) => u.role === 'ADMIN').length}</div>
            <p className="text-xs text-purple-600 mt-0.5">Full control clearance</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">External Suppliers</CardTitle>
            <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold">VENDOR</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter((u) => u.role === 'VENDOR').length}</div>
            <p className="text-xs text-slate-400 mt-0.5">Self-managed portals</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and List */}
      <Card className="shadow-sm border-slate-100">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between border-b border-slate-100">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name, email or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <UsersIcon className="h-12 w-12 mx-auto text-slate-300 mb-3" /> No users match search criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/75 hover:bg-slate-50/75">
                  <TableHead className="font-semibold text-slate-700">User Details</TableHead>
                  <TableHead className="font-semibold text-slate-700">Security Role</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="font-semibold text-slate-700">Registered On</TableHead>
                  <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium text-slate-900">
                      <div>{user.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`font-semibold ${getRoleBadge(user.role)}`}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${user.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                        {user.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600 text-sm">{user.createdAt}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => handleOpenEdit(user)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600" onClick={() => handleDelete(user.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
