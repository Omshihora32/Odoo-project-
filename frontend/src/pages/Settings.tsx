import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { Settings as SettingsIcon, Shield, Lock, Bell, Server, Save } from 'lucide-react';

export default function Settings() {
  const { toast } = useToast();
  
  // State variables for settings
  const [appName, setAppName] = useState('VendorBridge ERP');
  const [tokenExpiration, setTokenExpiration] = useState('24');
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [auditLogRetention, setAuditLogRetention] = useState('90');
  const [restrictDomain, setRestrictDomain] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: 'Settings Saved',
      description: 'System-wide configuration has been updated successfully.',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">System Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure security protocols, login variables, RBAC levels, and general database preferences.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* General Application Configurations */}
          <Card className="shadow-sm border-slate-100">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
                <Server className="h-5 w-5 text-emerald-600" /> General Setup
              </CardTitle>
              <CardDescription>Basic variables for the ERP application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="appName">Organization ERP Title</Label>
                <Input id="appName" value={appName} onChange={(e) => setAppName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tokenExp">JWT Token Expiry (Hours)</Label>
                <Select value={tokenExpiration} onValueChange={setTokenExpiration}>
                  <SelectTrigger id="tokenExp">
                    <SelectValue placeholder="Select Expiry Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 Hours</SelectItem>
                    <SelectItem value="8">8 Hours</SelectItem>
                    <SelectItem value="24">24 Hours</SelectItem>
                    <SelectItem value="168">7 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Security & Authentication Setup */}
          <Card className="shadow-sm border-slate-100">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
                <Lock className="h-5 w-5 text-emerald-600" /> Access & Authentication
              </CardTitle>
              <CardDescription>Setup multi-factor credentials and email checks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2.5 py-2">
                <Checkbox 
                  id="mfa" 
                  checked={mfaEnabled} 
                  onCheckedChange={(val: any) => setMfaEnabled(!!val)} 
                  className="h-4 w-4 border-slate-300 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <Label htmlFor="mfa" className="font-semibold text-slate-700 text-sm cursor-pointer">Require Multi-Factor Authentication (MFA)</Label>
              </div>
              <div className="flex items-center space-x-2.5 py-2">
                <Checkbox 
                  id="domains" 
                  checked={restrictDomain} 
                  onCheckedChange={(val: any) => setRestrictDomain(!!val)} 
                  className="h-4 w-4 border-slate-300 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <Label htmlFor="domains" className="font-semibold text-slate-700 text-sm cursor-pointer">Restrict login domains to official company address</Label>
              </div>
            </CardContent>
          </Card>

          {/* RBAC Access Clearance Controls */}
          <Card className="shadow-sm border-slate-100 md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
                <Shield className="h-5 w-5 text-emerald-600" /> RBAC Clearances & Audit Settings
              </CardTitle>
              <CardDescription>Setup log audit retention policies and system privileges.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="retention">Audit Log Retention Period (Days)</Label>
                <Select value={auditLogRetention} onValueChange={setAuditLogRetention}>
                  <SelectTrigger id="retention">
                    <SelectValue placeholder="Retention Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 Days</SelectItem>
                    <SelectItem value="90">90 Days</SelectItem>
                    <SelectItem value="180">180 Days</SelectItem>
                    <SelectItem value="365">1 Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="block font-semibold text-slate-700 text-sm">System Operation Clearances</Label>
                <div className="space-y-1">
                  <div className="text-xs text-slate-500">• ADMIN: Full Access Authorization</div>
                  <div className="text-xs text-slate-500">• PROCUREMENT_OFFICER: Operational Requisitions only</div>
                  <div className="text-xs text-slate-500">• MANAGER: Pending Approvals Reviews and remarks</div>
                  <div className="text-xs text-slate-500">• VENDOR: Quotation Submissions and profile dashboard</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 shadow font-semibold">
            <Save className="mr-2 h-4 w-4" /> Save System Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
