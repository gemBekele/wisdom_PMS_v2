import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { mappedAccountsAPI, dashboardAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { Phone, TrendingUp, TrendingDown, Banknote, Target, Users, PiggyBank, FileText, ChevronDown, ChevronRight, User } from 'lucide-react';

const KPI_COLORS: Record<string, string> = {
  Account_Productivity: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  Deposit_Mobilization: 'bg-blue-50 border-blue-200 text-blue-700',
  New_Member_Registration: 'bg-purple-50 border-purple-200 text-purple-700',
  New_Account_Opening: 'bg-cyan-50 border-cyan-200 text-cyan-700',
  Share_Capital_Growth: 'bg-amber-50 border-amber-200 text-amber-700',
  Mobile_Banking_Users: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  Merchant_POS_Growth: 'bg-rose-50 border-rose-200 text-rose-700',
  Billers_Recruitment: 'bg-orange-50 border-orange-200 text-orange-700',
  Internal_Operations: 'bg-slate-50 border-slate-200 text-slate-700',
};

const KPI_ICONS: Record<string, any> = {
  Account_Productivity: TrendingUp, Deposit_Mobilization: PiggyBank,
  New_Member_Registration: Users, New_Account_Opening: Target,
  Share_Capital_Growth: TrendingUp, Mobile_Banking_Users: Users,
  Merchant_POS_Growth: TrendingUp, Billers_Recruitment: Users,
  Internal_Operations: FileText,
};

export function MappedAccounts() {
  const { user, role } = useUser();
  const isBranchManager = user?.role === 'branch_manager';
  const isSupervisor = role === 'supervisor';
  const [data, setData] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [staffAccounts, setStaffAccounts] = useState<any[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);

    if (isBranchManager) {
      mappedAccountsAPI.getBranchAccounts()
        .then(res => { if (res.success) setAccounts(res.data || []); else setError('Failed to load data'); })
        .catch(() => setError('Failed to load branch accounts'))
        .finally(() => setLoading(false));
    } else if (isSupervisor) {
      Promise.all([
        mappedAccountsAPI.getDashboard(user.id),
        dashboardAPI.getSupervisor(),
      ])
        .then(([mappingRes, dashRes]) => {
          if (mappingRes.success && mappingRes.data) setData(mappingRes.data);
          if (dashRes.success && dashRes.data) setTeamMembers(dashRes.data.teamMembers || []);
        })
        .catch(() => setError('Failed to load mapped accounts'))
        .finally(() => setLoading(false));
    } else {
      mappedAccountsAPI.getDashboard(user.id)
        .then(res => { if (res.success && res.data) setData(res.data); else setError('Failed to load data'); })
        .catch(() => setError('Failed to load mapped accounts'))
        .finally(() => setLoading(false));
    }
  }, [user?.id, isBranchManager, isSupervisor]);

  const loadStaffAccounts = async (staffId: string) => {
    if (selectedStaff === staffId) {
      setSelectedStaff(null);
      return;
    }
    setSelectedStaff(staffId);
    setStaffLoading(true);
    try {
      const res = await mappedAccountsAPI.getDashboard(staffId);
      if (res.success) setStaffAccounts(res.data?.accounts || []);
      else setStaffAccounts([]);
    } catch (_) { setStaffAccounts([]); }
    setStaffLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" />
    </div>
  );

  if (error) return <div className="p-6 text-red-600 bg-red-50 rounded-md">{error}</div>;

  if (isBranchManager) {
    const totalBalance = accounts.reduce((s: number, a: any) => s + (a.currentBalance || 0), 0);
    const activeAccounts = accounts.filter(a => a.activeStatus).length;
    const productiveAccounts = accounts.filter(a => a.isProductive).length;

    const branchColumns = [
      { key: 'accountNumber', header: 'Account #', primary: true, render: (a: any) => <span className="font-mono text-xs font-bold text-blue-600">{a.accountNumber}</span> },
      { key: 'customerName', header: 'Customer', render: (a: any) => <span className="font-medium text-slate-800">{a.customerName}</span> },
      {
        key: 'phoneNumber', header: 'Phone',
        render: (a: any) => a.phoneNumber ? (
          <a href={`tel:${a.phoneNumber}`} className="flex items-center gap-1 text-blue-600 hover:text-blue-800"><Phone className="h-3 w-3" /><span>{a.phoneNumber}</span></a>
        ) : <span className="text-slate-300">-</span>,
      },
      {
        key: 'mappedTo', header: 'Mapped To',
        render: (a: any) => (
          <span className="text-slate-700">{a.mappedTo?.name || 'N/A'}
            {a.mappedTo?.position && <span className="text-xs text-slate-400 ml-1">({a.mappedTo.position.replace(/_/g, ' ')})</span>}
          </span>
        ),
      },
      { key: 'currentBalance', header: 'Balance', className: 'text-right font-mono', render: (a: any) => <span className="font-mono text-sm">{(a.currentBalance ?? 0).toLocaleString()}</span> },
      {
        key: 'difference', header: 'Difference', className: 'text-right',
        render: (a: any) => a.difference !== 0 ? (
          <span className={`inline-flex items-center gap-0.5 font-mono text-sm ${a.difference > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {a.difference > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {a.difference > 0 ? '+' : ''}{(a.difference ?? 0).toLocaleString()}
          </span>
        ) : null,
      },
      {
        key: 'activeStatus', header: 'Status',
        render: (a: any) => <Badge variant={a.activeStatus ? 'default' : 'secondary'} className="text-xs">{a.activeStatus ? 'Active' : 'Inactive'}</Badge>,
      },
    ];

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mapped Accounts</h1>
          <p className="text-sm text-slate-500 mt-1">{user?.name} @ {user?.branch_code || user?.branchId?.name}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50"><Users className="h-5 w-5 text-blue-600" /></div>
              <div><p className="text-xs text-slate-500">Total Accounts</p><p className="text-xl font-bold text-slate-800">{accounts.length}</p></div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50"><Users className="h-5 w-5 text-green-600" /></div>
              <div><p className="text-xs text-slate-500">Active</p><p className="text-xl font-bold text-slate-800">{activeAccounts}</p></div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50"><TrendingUp className="h-5 w-5 text-emerald-600" /></div>
              <div><p className="text-xs text-slate-500">Productive</p><p className="text-xl font-bold text-slate-800">{productiveAccounts}</p></div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-50"><Banknote className="h-5 w-5 text-indigo-600" /></div>
              <div><p className="text-xs text-slate-500">Total Balance</p><p className="text-xl font-bold text-slate-800">{totalBalance.toLocaleString()}</p></div>
            </CardContent>
          </Card>
        </div>

        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-800">Branch Accounts ({accounts.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            <div className="table-scroll px-3 sm:px-0">
              <ResponsiveTable
                columns={branchColumns}
                data={accounts}
                rowKey={(a) => a.id}
                emptyMessage="No accounts mapped in this branch"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSupervisor) {
    const { stats, accounts: myAccounts, planProgress } = data || { stats: {}, accounts: [], planProgress: [] };
    const teamTotalAccounts = teamMembers.reduce((sum: number, m: any) => sum + (m.mappedAccounts || 0), 0) + (myAccounts?.length || 0);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Mapped Accounts</h1>
          <p className="text-sm text-slate-500 mt-1">
            {user?.name} — {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50"><Users className="h-5 w-5 text-blue-600" /></div>
              <div><p className="text-xs text-slate-500">My Accounts</p><p className="text-xl font-bold text-slate-800">{myAccounts?.length || 0}</p></div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-50"><Users className="h-5 w-5 text-violet-600" /></div>
              <div><p className="text-xs text-slate-500">Team Total Accounts</p><p className="text-xl font-bold text-slate-800">{teamTotalAccounts}</p></div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50"><PiggyBank className="h-5 w-5 text-green-600" /></div>
              <div><p className="text-xs text-slate-500">My Deposits</p><p className="text-xl font-bold text-slate-800">{(stats?.totalDeposits ?? 0).toLocaleString()}</p></div>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-50"><Users className="h-5 w-5 text-indigo-600" /></div>
              <div><p className="text-xs text-slate-500">Team Members</p><p className="text-xl font-bold text-slate-800">{teamMembers.length}</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Plan Progress */}
        {planProgress?.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">My Plan Progress</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {planProgress.map((plan: any) => {
                const Icon = KPI_ICONS[plan.kpi] || Target;
                const colorClass = KPI_COLORS[plan.kpi] || 'bg-slate-50 border-slate-200 text-slate-700';
                return (
                  <Card key={plan.kpi} className={`border ${colorClass}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><Icon className="h-4 w-4" /><span className="font-medium text-sm">{plan.label}</span></div>
                        <Badge variant="outline" className="text-xs">{plan.period}</Badge>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs"><span className="text-slate-500">Target</span><span className="font-semibold">{(plan.target ?? 0).toLocaleString()}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-slate-500">Achieved</span><span className="font-semibold">{(plan.achieved ?? 0).toLocaleString()}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-slate-500">Remaining</span><span className={`font-semibold ${plan.remaining > 0 ? 'text-red-500' : 'text-green-500'}`}>{(plan.remaining ?? 0).toLocaleString()}</span></div>
                        <div className="pt-1">
                          <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">Progress</span><span className="font-semibold">{plan.progress}%</span></div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div className={`h-2 rounded-full transition-all ${plan.progress >= 100 ? 'bg-green-500' : plan.progress >= 50 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${plan.progress}%` }} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* My Accounts */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-800">
              Accounts Mapped to You
              <span className="ml-2 text-sm font-normal text-slate-400">({myAccounts?.length || 0})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            {myAccounts?.length > 0 ? (
              <div className="table-scroll px-3 sm:px-0">
                <ResponsiveTable
                  columns={[
                    { key: 'accountNumber', header: 'Account #', primary: true, render: (a: any) => <span className="font-mono text-xs font-bold text-blue-600">{a.accountNumber}</span> },
                    { key: 'customerName', header: 'Customer', render: (a: any) => <span className="font-medium text-slate-800">{a.customerName}</span> },
                    { key: 'phoneNumber', header: 'Phone', render: (a: any) => a.phoneNumber ? <span>{a.phoneNumber}</span> : <span className="text-slate-300">-</span> },
                    { key: 'currentBalance', header: 'Curr Balance', className: 'text-right font-mono', render: (a: any) => <span className="font-mono text-sm">{a.currentBalance?.toLocaleString() || '0'}</span> },
                    {
                      key: 'difference', header: 'Diff', className: 'text-right',
                      render: (a: any) => a.difference !== 0 ? (
                        <span className={`inline-flex items-center gap-0.5 font-mono text-sm ${a.difference > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {a.difference > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {a.difference > 0 ? '+' : ''}{(a.difference ?? 0).toLocaleString()}
                        </span>
                      ) : null,
                    },
                    { key: 'activeStatus', header: 'Status', render: (a: any) => <Badge variant={a.activeStatus ? 'default' : 'secondary'} className="text-xs">{a.activeStatus ? 'Active' : 'Inactive'}</Badge> },
                    { key: 'isProductive', header: 'Productivity', render: (a: any) => <Badge variant={a.isProductive ? 'default' : 'outline'} className="text-xs">{a.isProductive ? 'Productive' : 'Non-Productive'}</Badge> },
                  ]}
                  data={myAccounts}
                  rowKey={(a) => a.id}
                  emptyMessage="No accounts mapped to you yet"
                />
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">No accounts mapped to you yet</div>
            )}
          </CardContent>
        </Card>

        {/* Team Members */}
        {teamMembers.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Team Members</h2>
            <div className="space-y-2">
              {teamMembers.map((member: any) => (
                <Card key={member.id} className="border border-slate-200 shadow-sm overflow-hidden">
                  <div
                    className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => loadStaffAccounts(member.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-slate-50"><User className="h-4 w-4 text-slate-600" /></div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{member.name}</p>
                        <p className="text-xs text-slate-400">{member.position?.replace(/_/g, ' ') || 'Staff'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-xs">
                        <p className="text-slate-500">{member.mappedAccounts || 0} accounts</p>
                        <p className={`font-medium ${member.kpiAchievement >= 80 ? 'text-emerald-600' : member.kpiAchievement >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                          {member.kpiAchievement?.toFixed(1) || 0}%
                        </p>
                      </div>
                      {selectedStaff === member.id ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {selectedStaff === member.id && (
                    <div className="border-t border-slate-100">
                      {staffLoading ? (
                        <div className="text-center py-6 text-slate-400 text-sm">Loading accounts...</div>
                      ) : staffAccounts.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-sm">No accounts mapped to {member.name}</div>
                      ) : (
                        <div className="table-scroll px-3 sm:px-0">
                          <ResponsiveTable
                            columns={[
                              { key: 'accountNumber', header: 'Account #', primary: true, render: (a: any) => <span className="font-mono text-xs font-bold text-blue-600">{a.accountNumber}</span> },
                              { key: 'customerName', header: 'Customer', render: (a: any) => <span className="font-medium text-slate-800 text-xs">{a.customerName}</span> },
                              { key: 'phoneNumber', header: 'Phone', render: (a: any) => <span className="text-xs">{a.phoneNumber || <span className="text-slate-300">-</span>}</span> },
                              { key: 'currentBalance', header: 'Curr Balance', className: 'text-right font-mono', render: (a: any) => <span className="font-mono text-xs">{(a.currentBalance || a.current_balance || 0).toLocaleString()}</span> },
                              {
                                key: 'diff', header: 'vs June', className: 'text-right',
                                render: (a: any) => {
                                  const diff = (a.currentBalance || a.current_balance || 0) - (a.juneBalance || a.june_balance || 0);
                                  return (
                                    <span className={`inline-flex items-center gap-0.5 font-mono text-xs ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                      {diff > 0 ? <TrendingUp className="h-3 w-3" /> : diff < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                                      {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                                    </span>
                                  );
                                },
                              },
                              { key: 'activeStatus', header: 'Status', render: (a: any) => <Badge variant={a.activeStatus || a.active_status ? 'default' : 'secondary'} className="text-[10px]">{a.activeStatus || a.active_status ? 'Active' : 'Inactive'}</Badge> },
                              { key: 'isProductive', header: 'Productivity', render: (a: any) => <Badge variant={a.isProductive ? 'default' : 'outline'} className="text-[10px]">{a.isProductive ? 'Productive' : 'Non-Productive'}</Badge> },
                            ]}
                            data={staffAccounts}
                            rowKey={(a) => a.id || a.accountNumber}
                            emptyMessage="No accounts mapped to this staff"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Staff view (original)
  const { stats, accounts: myAccounts, planProgress } = data || { stats: {}, accounts: [], planProgress: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Mapped Accounts</h1>
        <p className="text-sm text-slate-500 mt-1">{data?.user?.name} @ {data?.user?.branchName || ''}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50"><Users className="h-5 w-5 text-blue-600" /></div>
            <div><p className="text-xs text-slate-500">Total Accounts</p><p className="text-xl font-bold text-slate-800">{stats?.totalAccounts ?? 0}</p></div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50"><PiggyBank className="h-5 w-5 text-green-600" /></div>
            <div><p className="text-xs text-slate-500">Deposits</p><p className="text-xl font-bold text-slate-800">{(stats?.totalDeposits ?? 0).toLocaleString()}</p></div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-50"><Banknote className="h-5 w-5 text-rose-600" /></div>
            <div><p className="text-xs text-slate-500">Loans</p><p className="text-xl font-bold text-slate-800">{(stats?.totalLoans ?? 0).toLocaleString()}</p></div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className={`p-4 flex items-center gap-3 ${(stats?.totalDifference ?? 0) >= 0 ? '' : ''}`}>
            <div className={`p-2 rounded-lg ${(stats?.totalDifference ?? 0) >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
              {(stats?.totalDifference ?? 0) >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
            </div>
            <div><p className="text-xs text-slate-500">Net Growth</p><p className={`text-xl font-bold ${(stats?.totalDifference ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {(stats?.totalDifference ?? 0) >= 0 ? '+' : ''}{(stats?.totalDifference ?? 0).toLocaleString()}
            </p></div>
          </CardContent>
        </Card>
      </div>

      {planProgress?.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-3">Performance Plan Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {planProgress.map((plan: any) => {
              const Icon = KPI_ICONS[plan.kpi] || Target;
              const colorClass = KPI_COLORS[plan.kpi] || 'bg-slate-50 border-slate-200 text-slate-700';
              return (
                <Card key={plan.kpi} className={`border ${colorClass}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><Icon className="h-4 w-4" /><span className="font-medium text-sm">{plan.label}</span></div>
                      <Badge variant="outline" className="text-xs">{plan.period}</Badge>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs"><span className="text-slate-500">Target</span><span className="font-semibold">{(plan.target ?? 0).toLocaleString()}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-slate-500">Achieved</span><span className="font-semibold">{(plan.achieved ?? 0).toLocaleString()}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-slate-500">Remaining</span><span className={`font-semibold ${plan.remaining > 0 ? 'text-red-500' : 'text-green-500'}`}>{(plan.remaining ?? 0).toLocaleString()}</span></div>
                      <div className="pt-1">
                        <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">Progress</span><span className="font-semibold">{plan.progress}%</span></div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className={`h-2 rounded-full transition-all ${plan.progress >= 100 ? 'bg-green-500' : plan.progress >= 50 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${plan.progress}%` }} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-800">
            Accounts Mapped to You
            <span className="ml-2 text-sm font-normal text-slate-400">({myAccounts?.length || 0})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <div className="table-scroll px-3 sm:px-0">
            <ResponsiveTable
              columns={[
                { key: 'accountNumber', header: 'Account #', primary: true, render: (a: any) => <span className="font-mono text-xs font-bold text-blue-600">{a.accountNumber}</span> },
                { key: 'customerName', header: 'Customer', render: (a: any) => <span className="font-medium text-slate-800">{a.customerName}</span> },
                {
                  key: 'phoneNumber', header: 'Phone',
                  render: (a: any) => a.phoneNumber ? (
                    <a href={`tel:${a.phoneNumber}`} className="flex items-center gap-1 text-blue-600 hover:text-blue-800"><Phone className="h-3 w-3" /><span>{a.phoneNumber}</span></a>
                  ) : <span className="text-slate-300">-</span>,
                },
                { key: 'juneBalance', header: 'June Balance', className: 'text-right font-mono', render: (a: any) => <span className="font-mono text-sm">{a.juneBalance?.toLocaleString() || '0'}</span> },
                { key: 'currentBalance', header: 'Current Balance', className: 'text-right font-mono', render: (a: any) => <span className="font-mono text-sm">{a.currentBalance?.toLocaleString() || '0'}</span> },
                {
                  key: 'difference', header: 'Difference', className: 'text-right',
                  render: (a: any) => a.difference !== 0 ? (
                    <span className={`inline-flex items-center gap-0.5 font-mono text-sm ${a.difference > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {a.difference > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {a.difference > 0 ? '+' : ''}{(a.difference ?? 0).toLocaleString()}
                    </span>
                  ) : null,
                },
                { key: 'activeStatus', header: 'Status', render: (a: any) => <Badge variant={a.activeStatus ? 'default' : 'secondary'} className="text-xs">{a.activeStatus ? 'Active' : 'Inactive'}</Badge> },
                { key: 'isProductive', header: 'Productivity', render: (a: any) => <Badge variant={a.isProductive ? 'default' : 'outline'} className="text-xs">{a.isProductive ? 'Productive' : 'Non-Productive'}</Badge> },
              ]}
              data={myAccounts || []}
              rowKey={(a) => a.id}
              emptyMessage="No accounts mapped to you yet"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
