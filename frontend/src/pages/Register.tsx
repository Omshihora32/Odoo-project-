import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Loader2, Eye, EyeOff } from 'lucide-react';

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  country: z.string().optional(),
  role: z.enum(['ADMIN', 'PROCUREMENT_OFFICER', 'VENDOR', 'MANAGER']),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();
  const { register: signup, isLoading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'PROCUREMENT_OFFICER' | 'VENDOR' | 'MANAGER'>('VENDOR');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', firstName: '', lastName: '', phone: '', country: '', role: 'VENDOR' },
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      await signup(data);
      navigate('/dashboard');
    } catch {
      // Error handled by store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-emerald-50 px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-600/30 mb-3">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">VendorBridge</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Enterprise Procurement Portal</p>
        </div>

        <Card className="shadow-xl border-0 shadow-gray-200/50">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg text-center">Create account</CardTitle>
            <CardDescription className="text-center">
              Register a new user to access the ERP workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="John" {...register('firstName')} className={errors.firstName ? 'border-red-500' : ''} />
                  {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Doe" {...register('lastName')} className={errors.lastName ? 'border-red-500' : ''} />
                  {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  {...register('email')}
                  onChange={(e) => { register('email').onChange(e); clearError(); }}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    onChange={(e) => { register('password').onChange(e); clearError(); }}
                    className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+91 98765 43210" {...register('phone')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" placeholder="India" {...register('country')} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role">Workspace Role</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(val: any) => {
                    setSelectedRole(val);
                    setValue('role', val);
                  }}
                >
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VENDOR">Vendor (Submit quotes & track POs)</SelectItem>
                    <SelectItem value="PROCUREMENT_OFFICER">Procurement Officer (Create RFQs, POs & Invoices)</SelectItem>
                    <SelectItem value="MANAGER">Manager / Approver (Review & approve quotations)</SelectItem>
                    <SelectItem value="ADMIN">System Administrator (Full access)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 mt-2" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center pt-0">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
