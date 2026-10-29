import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { authAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Shield, Mail, Building2, MapPin, KeyRound, Briefcase, Hash } from 'lucide-react';

export function Profile() {
  const { user, userName, role, currentBranch } = useUser();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const roleMeta: Record<string, { label: string; color: string; icon: string }> = {
    admin: { label: 'Administrator', color: 'bg-purple-500', icon: '🛡️' },
    areaManager: { label: 'Area Manager', color: 'bg-indigo-500', icon: '📌' },
    branchManager: { label: 'Branch Manager', color: 'bg-emerald-500', icon: '🏦' },
    supervisor: { label: 'Supervisor', color: 'bg-amber-500', icon: '👁️' },
    staff: { label: 'Staff', color: 'bg-slate-500', icon: '👤' },
  };

  const meta = roleMeta[role] || roleMeta.staff;

  const formatRole = (r: string) =>
    r.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();

  const msgBg = message?.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200';

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    try {
      setLoading(true);
      await authAPI.updatePassword(currentPassword, newPassword);
      setMessage({ type: 'success', text: 'Password changed successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="h-48 rounded-xl bg-gradient-to-r from-primary-700 via-primary-600 to-primary-400 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 1200 200" preserveAspectRatio="none">
              <defs>
                <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.5" fill="white" />
                </pattern>
              </defs>
              <rect width="1200" height="200" fill="url(#dots)" />
            </svg>
          </div>
        </div>
        <div className="px-6 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-16">
            <Avatar className="h-32 w-32 ring-4 ring-white shadow-xl">
              <AvatarFallback className="bg-primary-600 text-white text-4xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 pb-2 sm:pb-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mt-4 sm:mt-0">
                <h1 className="text-2xl font-bold text-slate-900 truncate">{userName}</h1>
                <Badge className={`${meta.color} text-white border-0 text-xs`}>{formatRole(role)}</Badge>
              </div>
              <p className="text-slate-500 text-sm mt-0.5">{user?.email || ''}</p>
              {currentBranch && (
                <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {currentBranch}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-6 sm:px-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary-600" />
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                <div>
                  <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Full Name</Label>
                  <p className="text-slate-800 font-medium mt-1">{user?.name || userName}</p>
                </div>
                <div>
                  <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </Label>
                  <p className="text-slate-800 font-medium mt-1">{user?.email || '-'}</p>
                </div>
                <div>
                  <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-1">
                    <Hash className="h-3 w-3" /> Employee ID
                  </Label>
                  <p className="text-slate-800 font-medium mt-1 font-mono text-sm">{user?.employeeId || '-'}</p>
                </div>
                <div>
                  <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Role
                  </Label>
                  <p className="text-slate-800 font-medium mt-1">{formatRole(role)}</p>
                </div>
                <div>
                  <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> Branch
                  </Label>
                  <p className="text-slate-800 font-medium mt-1">{currentBranch || user?.branch?.name || '-'}</p>
                </div>
                <div>
                  <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Position
                  </Label>
                  <p className="text-slate-800 font-medium mt-1">{user?.position || '-'}</p>
                </div>
              </div>
              {user?.area && (
                <div className="mt-5 pt-5 border-t border-slate-100">
                  <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Area</Label>
                  <p className="text-slate-800 font-medium mt-1">{user.area.name}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="lg:sticky lg:top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary-600" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent>
              {message && (
                <div className={'p-3 rounded-lg mb-4 text-sm flex items-center gap-2 ' + msgBg}>
                  {message.text}
                </div>
              )}
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="currentPassword" className="text-xs font-medium">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword" className="text-xs font-medium">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-medium">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                    className="h-9 text-sm"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full h-9 text-sm">
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
