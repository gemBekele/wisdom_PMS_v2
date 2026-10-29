import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authAPI } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';
import { mapBackendRoleToFrontend } from '@/lib/roleMapper';
import { AlertCircle, Lock, Search, Check } from 'lucide-react';

const ROLE_FILTERS = [
  { key: '', label: 'All' },
  { key: 'admin', label: 'Admin' },
  { key: 'areaManager', label: 'Area' },
  { key: 'branchManager', label: 'BM' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'staff', label: 'Staff' },
];

const DEMO_ACCOUNTS = [
  { role: 'admin', label: 'Administrator', email: 'admin@wisdomsaccos.com', password: 'admin123', position: 'Branch Manager' },
  { role: 'areaManager', label: 'Area Manager', email: 'areamanager@wisdomsaccos.com', password: 'area123', position: 'Area Manager' },
  { role: 'branchManager', label: 'Branch Manager', email: 'branchmanager@wisdomsaccos.com', password: 'branch123', position: 'Branch Manager' },
  { role: 'supervisor', label: 'Supervisor', email: 'supervisor@wisdomsaccos.com', password: 'supervisor123', position: 'Operation Supervisor' },
  { role: 'staff', label: 'Staff', email: 'staff@wisdomsaccos.com', password: 'staff123', position: 'Customer Service Officer I' },
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
    } catch {
      // Public list is optional; the demo accounts below still work.
    }
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

  const handleDemoLogin = (account: typeof DEMO_ACCOUNTS[number]) => {
    const match = users.find(u => u.email === account.email);
    setSelectedUser(match || {
      email: account.email,
      name: account.label,
      role: account.role,
      position: account.position,
    });
    setPassword(account.password);
    setRoleFilter('');
    setSearchQuery('');
    setFocused(false);
    setError('');
  };

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

  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-ivory lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-navy-deep via-primary-900 to-primary-700 p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12]">
          <svg className="h-full w-full" viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice" fill="none">
            <polyline points="-50,720 80,650 200,690 340,540 460,470 580,510 700,360 820,300" stroke="white" strokeWidth="2" />
            <polyline points="-50,780 80,730 200,760 340,640 460,580 580,620 700,500 820,450" stroke="white" strokeWidth="1" opacity="0.6" />
            <polyline points="-50,640 80,600 200,630 340,480 460,420 580,450 700,320 820,260" stroke="white" strokeWidth="1" opacity="0.4" />
          </svg>
        </div>
        <div className="pointer-events-none absolute -right-28 top-1/4 h-[30rem] w-[30rem] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <img
            src="/wisdom-logo.png"
            alt="Wisdom SACCOS"
            className="h-14 w-14 rounded-full bg-white object-contain p-0.5"
          />
          <div>
            <p className="font-display text-xl font-extrabold uppercase leading-none tracking-[0.18em]">Wisdom</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.42em] text-white/60">SACCOS</p>
          </div>
        </div>

        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-2 border border-white/20 bg-white/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/80">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Performance Management
          </span>
          <h1 className="mt-7 font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-tight xl:text-6xl">
            We drive for<br />
            <span className="text-accent">excellent</span><br />
            service.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-white/70">
            Measure performance, celebrate progress and build stronger financial futures — together.
          </p>
          <div className="mt-10 flex items-center gap-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/50">
            <span>Member-owned</span>
            <span className="h-px w-8 bg-accent" />
            <span>Community-driven</span>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-[10px] font-semibold uppercase tracking-[0.28em] text-white/40">
          <span>Addis Ababa · Ethiopia</span>
          <span>© {year} Wisdom SACCOS</span>
        </div>
      </div>

      {/* Sign-in panel */}
      <div className="flex min-h-screen items-center justify-center bg-ivory px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
            <img src="/wisdom-logo.png" alt="Wisdom SACCOS" className="h-12 w-12 object-contain" />
            <div>
              <p className="font-display text-lg font-extrabold uppercase leading-none tracking-[0.18em] text-primary-900">Wisdom</p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.38em] text-stone">SACCOS PMS</p>
            </div>
          </div>

          <Card className="overflow-hidden rounded-md border-line bg-white shadow-2xl shadow-primary-900/10">
            <div className="h-1.5 bg-accent" />
            <CardHeader className="px-6 pb-4 pt-7 sm:px-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-stone">Welcome back</p>
              <CardTitle className="mt-2 font-display text-2xl font-extrabold uppercase tracking-tight text-primary-900">
                Sign in to continue
              </CardTitle>
              <p className="text-sm text-stone">Wisdom SACCOS Performance Management System</p>
            </CardHeader>
            <CardContent className="px-6 pb-7 sm:px-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone">Select user</label>
                  <div className="relative" ref={listRef}>
                    <div className="mb-2 flex flex-wrap items-center gap-1">
                      {ROLE_FILTERS.map(f => (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => { setRoleFilter(f.key); setSearchQuery(''); }}
                          className={`px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                            roleFilter === f.key
                              ? 'bg-primary-900 text-white'
                              : 'bg-ivory text-stone hover:bg-line'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone/60" />
                      <input
                        type="text"
                        placeholder="Search by name, role, or branch..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onFocus={() => setFocused(true)}
                        className="w-full border border-line bg-ivory py-2.5 pl-9 pr-4 text-sm text-ink placeholder:text-stone/50 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20"
                      />
                    </div>

                    {focused && (
                      <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto border border-line bg-white shadow-xl">
                        {filteredUsers.length === 0 ? (
                          <div className="p-4 text-center text-sm text-stone">No users match</div>
                        ) : (
                          filteredUsers.map((u: any) => {
                            const isSelected = selectedUser?._id === u._id || selectedUser?.id === u.id;
                            return (
                              <div
                                key={u._id || u.id}
                                onClick={() => { setSelectedUser(u); setFocused(false); setError(''); }}
                                className={`flex cursor-pointer items-center justify-between px-3 py-2.5 text-sm transition-colors hover:bg-accent-50 ${
                                  isSelected ? 'border-l-2 border-accent bg-accent-50' : 'border-l-2 border-transparent'
                                }`}
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                  <span className="truncate font-medium text-ink">{u.name}</span>
                                  <span className="shrink-0 bg-ivory px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone">
                                    {u.position || u.role}
                                  </span>
                                  {u.branch_code && (
                                    <span className="shrink-0 truncate text-xs text-stone/70">{u.branch_code}</span>
                                  )}
                                </div>
                                {isSelected && <Check className="ml-2 h-4 w-4 shrink-0 text-accent-600" />}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                  {selectedUser && !focused && (
                    <div className="flex items-center gap-2 border border-accent-200 bg-accent-50 px-3 py-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-accent-600" />
                      <span className="font-medium text-primary-900">{selectedUser.name}</span>
                      <span className="bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone">{selectedUser.position || selectedUser.role}</span>
                      {selectedUser.branch_code && <span className="text-xs text-stone">{selectedUser.branch_code}</span>}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-stone">Password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone/60" />
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter password"
                      required
                      disabled={loading}
                      autoComplete="current-password"
                      className="w-full border border-line bg-ivory py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-stone/50 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700/20"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full bg-accent text-sm font-semibold uppercase tracking-wider text-white hover:bg-accent-600"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </Button>

                {import.meta.env.DEV && (
                  <div className="border-t border-line pt-4">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-stone">
                      Demo accounts — click to fill (development only)
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {DEMO_ACCOUNTS.map(account => (
                        <button
                          key={account.email}
                          type="button"
                          onClick={() => handleDemoLogin(account)}
                          className="grid grid-cols-[auto_1fr_auto] items-center gap-2 border border-line bg-ivory px-2.5 py-1.5 text-left text-[11px] transition-colors hover:border-accent-300 hover:bg-accent-50"
                        >
                          <span className="font-semibold text-primary-900">{account.label}</span>
                          <span className="truncate text-stone">{account.email}</span>
                          <span className="font-mono text-stone/70">{account.password}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-[10px] font-semibold uppercase tracking-[0.24em] text-stone/60">
            © {year} Wisdom SACCOS · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
