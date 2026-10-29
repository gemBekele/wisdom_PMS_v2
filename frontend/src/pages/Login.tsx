import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authAPI } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';
import { mapBackendRoleToFrontend } from '@/lib/roleMapper';
import { AlertCircle, Lock, BarChart3, Search, Check } from 'lucide-react';

const ROLE_FILTERS = [
  { key: '', label: 'All' },
  { key: 'admin', label: 'Admin' },
  { key: 'areaManager', label: 'Area' },
  { key: 'branchManager', label: 'BM' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'staff', label: 'Staff' },
];

export function Login() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { setRole, setCurrentBranch, setUserName, loadUser } = useUser();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users/public-list');
      const data = await res.json();
      if (data && data.data) setUsers(data.data);
      else if (Array.isArray(data)) setUsers(data);
    } catch (_) {}
  };

  const filteredUsers = users.filter(u => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = (u.name || '').toLowerCase();
      const pos = (u.position || u.role || '').toLowerCase();
      const loc = (u.location || u.branch_code || '').toLowerCase();
      if (!name.includes(q) && !pos.includes(q) && !loc.includes(q)) return false;
    }
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedUser) { setError('Please select a user'); return; }
    if (!password) { setError('Please enter password'); return; }
    setLoading(true);

    try {
      const response = await authAPI.login(selectedUser.email, password);
      if (response.success && response.data) {
        const frontendRole = mapBackendRoleToFrontend(response.data.role);
        setRole(frontendRole);
        setUserName(response.data.name);
        if (response.data.branch_code) {
          setCurrentBranch(response.data.branch_code);
        } else if (response.data.branchId?.name) {
          setCurrentBranch(response.data.branchId.name);
        } else {
          setCurrentBranch('');
        }
        await loadUser();
        setTimeout(() => {
          const dashMap: Record<string, string> = {
            admin: '/dashboard/hq', areaManager: '/dashboard/area',
            branchManager: '/dashboard/branch', supervisor: '/dashboard/supervisor',
            staff: '/dashboard/staff',
          };
          navigate(dashMap[frontendRole] || '/dashboard', { replace: true });
        }, 100);
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-600 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.07]">
        <svg className="w-full h-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          <g fill="none" stroke="white">
            <polyline points="0,700 100,650 200,680 300,550 400,480 500,500 600,380 700,420 800,300 900,250 1000,280 1100,180 1200,220 1300,100 1440,120" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="0,750 100,720 200,740 300,650 400,600 500,620 600,520 700,550 800,450 900,400 1000,420 1100,340 1200,370 1300,280 1440,300" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
            <polyline points="0,600 100,580 200,610 300,500 400,440 500,460 600,350 700,390 800,280 900,220 1000,250 1100,150 1200,190 1300,80 1440,90" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
          </g>
          <g fill="white" opacity="0.15">
            <rect x="50" y="500" width="20" height="200" rx="2" />
            <rect x="150" y="450" width="20" height="250" rx="2" />
            <rect x="280" y="380" width="20" height="320" rx="2" />
            <rect x="420" y="320" width="20" height="380" rx="2" />
            <rect x="560" y="250" width="20" height="450" rx="2" />
            <rect x="700" y="200" width="20" height="500" rx="2" />
            <rect x="850" y="150" width="20" height="550" rx="2" />
            <rect x="1000" y="180" width="20" height="520" rx="2" />
            <rect x="1150" y="100" width="20" height="600" rx="2" />
            <rect x="1300" y="60" width="20" height="640" rx="2" />
          </g>
          <g fill="none" stroke="white" opacity="0.08">
            <line x1="0" y1="200" x2="1440" y2="200" strokeWidth="1" strokeDasharray="4,6" />
            <line x1="0" y1="400" x2="1440" y2="400" strokeWidth="1" strokeDasharray="4,6" />
            <line x1="0" y1="600" x2="1440" y2="600" strokeWidth="1" strokeDasharray="4,6" />
            <line x1="0" y1="800" x2="1440" y2="800" strokeWidth="1" strokeDasharray="4,6" />
          </g>
        </svg>
      </div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400" />
      <Card className="w-full max-w-lg shadow-2xl border-0 relative">
        <div className="h-2 bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 rounded-t-xl" />
        <CardHeader className="text-center pt-8">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary-50 rounded-xl flex items-center justify-center shadow-sm">
            <BarChart3 className="h-8 w-8 text-primary-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-slate-800 tracking-tight">SACCOS PMS</CardTitle>
          <p className="text-slate-500 mt-1 text-sm">Performance Management System</p>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Select User</label>
              <div className="relative" ref={listRef}>
                <div className="flex items-center gap-1 mb-2 flex-wrap">
                  {ROLE_FILTERS.map(f => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => { setRoleFilter(f.key); setSearchQuery(''); }}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                        roleFilter === f.key
                          ? 'bg-primary-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by name, role, or branch..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => setFocused(true)}
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
                  />
                </div>

                {focused && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                    {filteredUsers.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-400">No users match</div>
                    ) : (
                      filteredUsers.map((u: any) => {
                        const isSelected = selectedUser?._id === u._id || selectedUser?.id === u.id;
                        return (
                          <div
                            key={u._id || u.id}
                            onClick={() => { setSelectedUser(u); setFocused(false); setError(''); }}
                            className={`flex items-center justify-between px-3 py-2.5 cursor-pointer text-sm hover:bg-primary-50 transition-colors ${
                              isSelected ? 'bg-primary-50 border-l-2 border-primary-600' : 'border-l-2 border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="font-medium text-slate-800 truncate">{u.name}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium shrink-0">
                                {u.position || u.role}
                              </span>
                              {u.branch_code && (
                                <span className="text-xs text-slate-400 truncate shrink-0">{u.branch_code}</span>
                              )}
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-primary-600 shrink-0 ml-2" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              {selectedUser && !focused && (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 border border-primary-200 rounded-lg text-sm">
                  <Check className="h-4 w-4 text-primary-600 shrink-0" />
                  <span className="font-medium text-primary-800">{selectedUser.name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-primary-100 text-primary-700">{selectedUser.position || selectedUser.role}</span>
                  {selectedUser.branch_code && <span className="text-xs text-slate-500">{selectedUser.branch_code}</span>}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 shadow-sm"
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-base font-semibold rounded-lg shadow-md" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>

            <p className="text-center text-xs text-slate-400 mt-6">
              Secure System &copy; {new Date().getFullYear()} SACCOS
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

