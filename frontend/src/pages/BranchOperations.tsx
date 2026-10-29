import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ResponsiveTable from '@/components/ui/responsive-table';
import { dashboardAPI } from '@/lib/api';
import { Users, Clock, CheckCircle2, AlertCircle, TrendingUp, Banknote, Target, UserCheck, FileText } from 'lucide-react';

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

export function BranchOperations() {
  const [branch, setBranch] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    dashboardAPI.getMyBranchOperations(selectedDate)
      .then(res => { if (res.success && res.data?.length > 0) setBranch(res.data[0]); })
      .catch(() => {});
  }, [selectedDate]);

  if (!branch) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-3xl font-bold text-slate-800">Branch Operations</h1><p className="text-slate-600 mt-1">Daily activity overview</p></div>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="border rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="text-center py-12 text-slate-400">
          <p>No data for this date</p>
          <p className="text-sm text-slate-500 mt-1">Try selecting a different date</p>
        </div>
      </div>
    );
  }

  const byType = branch.todayStats.byType || {};
  const typeKeys = [...new Set(Object.keys(byType))];
  const pctActive = branch.staffCount > 0 ? Math.round((branch.staffActive / branch.staffCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{branch.name}</h1>
          <p className="text-slate-600 mt-1">{selectedDate === new Date().toISOString().split('T')[0] ? "Today's" : "Daily"} branch operations and activity</p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50"><Users className="h-5 w-5 text-blue-600" /></div>
            <div><p className="text-xs text-slate-500">Staff</p><p className="text-xl font-bold text-slate-800">{branch.staffCount}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
            <div><p className="text-xs text-slate-500">Tasks Today</p><p className="text-xl font-bold text-slate-800">{branch.todayStats.totalTasks}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50"><Clock className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-xs text-slate-500">Pending</p><p className="text-xl font-bold text-slate-800">{branch.todayStats.pending}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50"><Users className="h-5 w-5 text-indigo-600" /></div>
            <div><p className="text-xs text-slate-500">Active Staff</p><p className="text-xl font-bold text-slate-800">{branch.staffActive}/{branch.staffCount} ({pctActive}%)</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Task Type Breakdown */}
      <Card>
        <CardHeader><CardTitle>Today's Tasks by Type</CardTitle></CardHeader>
        <CardContent>
          {typeKeys.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {typeKeys.map(type => {
                const Icon = TYPE_ICONS[type] || FileText;
                const t = byType[type];
                return (
                  <div key={type} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200">
                    <div className="p-2 rounded-lg bg-slate-50"><Icon className="h-4 w-4 text-slate-600" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-500">{t.count} tasks · {(t.amount || 0).toLocaleString()} ETB</p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-emerald-600">{t.approved} approved</p>
                      {t.pending > 0 && <p className="text-amber-600">{t.pending} pending</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">No tasks submitted today</div>
          )}
        </CardContent>
      </Card>

      {/* Staff Activity */}
      <Card>
        <CardHeader><CardTitle>Staff Activity Today</CardTitle></CardHeader>
        <CardContent className="p-0">
          {branch.staffActivity.length > 0 ? (
            <div className="table-scroll px-3 sm:px-0">
              <ResponsiveTable
                columns={[
                  {
                    key: 'name',
                    header: 'Staff',
                    primary: true,
                    render: (s: any) => <span className="font-medium text-slate-800">{s.name}</span>,
                  },
                  {
                    key: 'position',
                    header: 'Position',
                    render: (s: any) => <span className="text-slate-600">{s.position?.replace(/_/g, ' ') || 'N/A'}</span>,
                  },
                  {
                    key: 'todayTasks',
                    header: 'Tasks',
                    className: 'text-right',
                    render: (s: any) => <span className="font-mono">{s.todayTasks}</span>,
                  },
                  {
                    key: 'totalAmount',
                    header: 'Total Amount',
                    className: 'text-right',
                    render: (s: any) => <span className="font-mono">{(s.totalAmount || 0).toLocaleString()}</span>,
                  },
                ]}
                data={branch.staffActivity}
                rowKey={(s: any) => s.id}
              />
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">No staff activity recorded today</div>
          )}
        </CardContent>
      </Card>

      {/* Recent Submissions */}
      <Card>
        <CardHeader><CardTitle>Recent Submissions</CardTitle></CardHeader>
        <CardContent>
          {branch.recentTasks.length > 0 ? (
            <div className="space-y-2">
              {branch.recentTasks.map((t: any) => (
                <div key={t._id || t.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">{t.type}</span>
                    {t.amount > 0 && <span className="text-sm font-mono text-slate-500">{(t.amount || 0).toLocaleString()} ETB</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {t.remarks && <span className="text-xs text-slate-400 max-w-[250px] truncate">{t.remarks}</span>}
                    <Badge variant={t.status === 'Approved' ? 'success' : t.status === 'Pending' ? 'warning' : 'secondary'} className="text-xs">
                      {t.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">No recent submissions</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
