import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ResponsiveTable from '@/components/ui/responsive-table';
import { dashboardAPI } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';
import {
  Users, Clock, CheckCircle2, AlertCircle, TrendingUp,
  Banknote, Target, UserCheck, FileText, Search, X, Home, Building2,
} from 'lucide-react';

const TYPE_ICONS: Record<string, any> = {
  Deposit_Mobilization: Banknote,
  New_Member_Registration: UserCheck,
  New_Account_Opening: FileText,
  Share_Capital: TrendingUp,
  Mobile_Banking_Activation: Target,
  Merchant_POS_Activation: TrendingUp,
  Biller_Recruitment: Users,
  Transaction_Processing: FileText,
  SMS_Alert_Config: FileText,
  Complaint_Resolution: AlertCircle,
};

type ApprovalStatus = 'All' | 'Approved' | 'Pending';

export function BranchMonitoring() {
  const { user, role } = useUser();
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus>('All');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);

  const isAreaManager = role === 'areaManager';
  const isBranchManager = role === 'branchManager';

  useEffect(() => {
    if (isAreaManager) {
      dashboardAPI.getBranchOperations(selectedDate)
        .then(res => { if (res.success) { setBranches(res.data || []); setExpandedBranch(null); } })
        .catch(() => {});
    } else if (isBranchManager) {
      dashboardAPI.getMyBranchOperations(selectedDate)
        .then(res => { if (res.success && res.data?.length > 0) { setBranches(res.data); setExpandedBranch(res.data[0].id); } })
        .catch(() => {});
    }
  }, [selectedDate, isAreaManager, isBranchManager]);

  const allStaff = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach(b => {
      (b.staffActivity || []).forEach((s: any) => {
        if (!map.has(s.id)) map.set(s.id, s.name);
      });
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [branches]);

  const filteredBranches = useMemo(() => {
    return branches.map(branch => {
      let recentTasks = branch.recentTasks || [];
      let staffActivity = branch.staffActivity || [];

      recentTasks = recentTasks.filter((t: any) => {
        if (statusFilter !== 'All' && t.status !== statusFilter) return false;
        return true;
      });

      if (staffFilter !== 'all') {
        staffActivity = staffActivity.filter((s: any) => s.id === staffFilter);
      }

      const filteredPending = recentTasks.filter((t: any) => t.status === 'Pending').length;
      const filteredApproved = recentTasks.filter((t: any) => t.status === 'Approved').length;
      const filteredTotal = recentTasks.length;
      const filteredAmount = recentTasks.reduce((s: number, t: any) => s + (t.amount || 0), 0);

      return {
        ...branch,
        _filteredTasks: recentTasks,
        _filteredStaff: staffActivity,
        _total: filteredTotal,
        _pending: filteredPending,
        _approved: filteredApproved,
        _amount: filteredAmount,
      };
    });
  }, [branches, statusFilter, staffFilter]);

  const totals = useMemo(() => {
    return filteredBranches.reduce(
      (acc, b) => ({
        tasks: acc.tasks + b._total,
        pending: acc.pending + b._pending,
        approved: acc.approved + b._approved,
        amount: acc.amount + b._amount,
        staff: acc.staff + b.staffCount,
      }),
      { tasks: 0, pending: 0, approved: 0, amount: 0, staff: 0 }
    );
  }, [filteredBranches]);

  const clearFilters = () => {
    setStatusFilter('All');
    setStaffFilter('all');
  };

  const hasFilters = statusFilter !== 'All' || staffFilter !== 'all';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between bg-white px-4 py-2.5 border border-slate-200 rounded-lg shadow-sm">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Home className="w-3.5 h-3.5 text-slate-400" />
          <span>Home / Branch Monitoring{isBranchManager ? ` / ${user?.branch_code || 'Branch'}` : ''}</span>
        </div>
        <div className="text-xs text-slate-400">
          {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Branch Monitoring</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAreaManager
              ? 'Daily operations across all branches under your area'
              : `Daily operations for ${user?.branch_code || 'your branch'}`}
          </p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:border-slate-400"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
          {(['All', 'Approved', 'Pending'] as ApprovalStatus[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === s
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {s === 'All' ? 'All Status' : s}
            </button>
          ))}
        </div>

        {allStaff.length > 0 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={staffFilter}
              onChange={e => setStaffFilter(e.target.value)}
              className="pl-8 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 appearance-none cursor-pointer focus:outline-none focus:border-slate-400"
            >
              <option value="all">All Staff</option>
              {allStaff.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {staffFilter !== 'all' && (
              <button
                onClick={() => setStaffFilter('all')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50"><Building2 size={16} className="text-blue-600" /></div>
            <div>
              <p className="text-[11px] text-slate-500">{isAreaManager ? 'Branches' : 'Staff'}</p>
              <p className="text-lg font-bold text-slate-800">{isAreaManager ? branches.length : totals.staff}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50"><CheckCircle2 size={16} className="text-emerald-600" /></div>
            <div><p className="text-[11px] text-slate-500">Approved</p><p className="text-lg font-bold text-slate-800">{totals.approved}</p></div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-50"><Clock size={16} className="text-amber-600" /></div>
            <div><p className="text-[11px] text-slate-500">Pending</p><p className="text-lg font-bold text-slate-800">{totals.pending}</p></div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50"><FileText size={16} className="text-indigo-600" /></div>
            <div><p className="text-[11px] text-slate-500">Total Tasks</p><p className="text-lg font-bold text-slate-800">{totals.tasks}</p></div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-50"><Banknote size={16} className="text-purple-600" /></div>
            <div><p className="text-[11px] text-slate-500">Amount</p><p className="text-lg font-bold text-slate-800">{totals.amount.toLocaleString()}</p></div>
          </CardContent>
        </Card>
      </div>

      {filteredBranches.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No activity found</p>
          <p className="text-sm text-slate-400 mt-1">Try a different date or clear your filters</p>
        </div>
      ) : isBranchManager ? (
        <div className="space-y-5">
          {filteredBranches.map(branch => {
            const byType = branch.todayStats.byType || {};
            const typeKeys = Object.keys(byType);
            return (
              <div key={branch.id} className="space-y-5">
                {typeKeys.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Tasks by Type</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {typeKeys.map(type => {
                        const Icon = TYPE_ICONS[type] || FileText;
                        const t = byType[type];
                        return (
                          <div key={type} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 bg-slate-50/50">
                            <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium text-slate-700 truncate">{type.replace(/_/g, ' ')}</p>
                              <p className="text-[10px] text-slate-400">{t.count} tasks · {(t.amount || 0).toLocaleString()} ETB</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                    Staff Activity
                    {staffFilter !== 'all' && <span className="text-slate-400 normal-case ml-1">(filtered)</span>}
                  </h4>
                  <div className="table-scroll px-3 sm:px-0 border border-slate-200 rounded-lg">
                    <ResponsiveTable
                      columns={[
                        {
                          key: 'name',
                          header: 'Staff',
                          primary: true,
                          render: (s: any) => <span className="font-medium text-slate-700">{s.name}</span>,
                        },
                        {
                          key: 'position',
                          header: 'Position',
                          render: (s: any) => <span className="text-slate-400">{s.position?.replace(/_/g, ' ') || 'Staff'}</span>,
                        },
                        {
                          key: 'todayTasks',
                          header: 'Tasks',
                          className: 'text-right',
                          render: (s: any) => <span className="font-mono text-slate-700">{s.todayTasks}</span>,
                        },
                        {
                          key: 'totalAmount',
                          header: 'Amount',
                          className: 'text-right',
                          render: (s: any) => <span className="font-mono text-slate-700">{(s.totalAmount || 0).toLocaleString()}</span>,
                        },
                      ]}
                      data={branch._filteredStaff}
                      rowKey={(s: any) => s.id}
                      emptyMessage="No staff activity for the selected filters"
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                    Recent Submissions ({branch._total})
                    {statusFilter !== 'All' && <span className="text-slate-400 normal-case ml-1">({statusFilter})</span>}
                  </h4>
                  <div className="space-y-1.5">
                    {branch._filteredTasks.length > 0 ? branch._filteredTasks.map((t: any) => (
                      <div key={t._id || t.id} className="flex items-center justify-between p-2.5 rounded-md bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-medium text-slate-700">{t.type}</span>
                          {t.amount > 0 && (
                            <span className="text-[11px] font-mono text-slate-500">{(t.amount || 0).toLocaleString()} ETB</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {t.remarks && (
                            <span className="text-[10px] text-slate-400 max-w-[200px] truncate hidden sm:block" title={t.remarks}>
                              {t.remarks}
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              t.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : t.status === 'Pending'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {t.status}
                          </Badge>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-4 text-slate-400 text-xs">No submissions for the selected filters</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBranches.map(branch => {
            const isOpen = expandedBranch === branch.id;
            const byType = branch.todayStats.byType || {};
            const typeKeys = Object.keys(byType);

            return (
              <Card key={branch.id} className="border border-slate-200 shadow-sm overflow-hidden">
                <div
                  className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedBranch(isOpen ? null : branch.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-slate-50">
                      <Building2 size={16} className="text-slate-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm">{branch.name}</h3>
                      <p className="text-[11px] text-slate-400">
                        {branch.staffCount} staff · {branch.staffActive} active today
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-slate-800">{branch._total}</p>
                      <p className="text-[11px] text-slate-400">tasks</p>
                    </div>
                    <div className="flex gap-1">
                      {branch._pending > 0 && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[11px]">
                          {branch._pending} pending
                        </Badge>
                      )}
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]">
                        {branch._approved} approved
                      </Badge>
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-slate-100 px-4 py-3 space-y-4">
                    {typeKeys.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Tasks by Type</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {typeKeys.map(type => {
                            const Icon = TYPE_ICONS[type] || FileText;
                            const t = byType[type];
                            return (
                              <div key={type} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 bg-slate-50/50">
                                <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-[11px] font-medium text-slate-700 truncate">{type.replace(/_/g, ' ')}</p>
                                  <p className="text-[10px] text-slate-400">{t.count} tasks · {(t.amount || 0).toLocaleString()} ETB</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {branch._filteredStaff.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                          Staff Activity
                          {staffFilter !== 'all' && <span className="text-slate-400 normal-case ml-1">(filtered)</span>}
                        </h4>
                        <div className="table-scroll px-3 sm:px-0">
                          <ResponsiveTable
                            columns={[
                              {
                                key: 'name',
                                header: 'Staff',
                                primary: true,
                                render: (s: any) => <span className="font-medium text-slate-700">{s.name}</span>,
                              },
                              {
                                key: 'position',
                                header: 'Position',
                                render: (s: any) => <span className="text-slate-400">{s.position?.replace(/_/g, ' ') || 'Staff'}</span>,
                              },
                              {
                                key: 'todayTasks',
                                header: 'Tasks',
                                className: 'text-right',
                                render: (s: any) => <span className="font-mono text-slate-700">{s.todayTasks}</span>,
                              },
                              {
                                key: 'totalAmount',
                                header: 'Amount',
                                className: 'text-right',
                                render: (s: any) => <span className="font-mono text-slate-700">{(s.totalAmount || 0).toLocaleString()}</span>,
                              },
                            ]}
                            data={branch._filteredStaff}
                            rowKey={(s: any) => s.id}
                          />
                        </div>
                      </div>
                    )}

                    {branch._filteredTasks.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                          Recent Submissions
                          {statusFilter !== 'All' && <span className="text-slate-400 normal-case ml-1">({statusFilter})</span>}
                        </h4>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {branch._filteredTasks.map((t: any) => (
                            <div key={t._id || t.id} className="flex items-center justify-between p-2 rounded-md bg-slate-50 border border-slate-100">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-medium text-slate-700">{t.type}</span>
                                {t.amount > 0 && (
                                  <span className="text-[11px] font-mono text-slate-500">{(t.amount || 0).toLocaleString()} ETB</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {t.remarks && (
                                  <span className="text-[10px] text-slate-400 max-w-[150px] truncate hidden sm:block" title={t.remarks}>
                                    {t.remarks}
                                  </span>
                                )}
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    t.status === 'Approved'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : t.status === 'Pending'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-slate-100 text-slate-500 border-slate-200'
                                  }`}
                                >
                                  {t.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {branch._filteredStaff.length === 0 && branch._filteredTasks.length === 0 && typeKeys.length === 0 && (
                      <div className="text-center py-4 text-slate-400 text-xs">No matching activity for this branch</div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
