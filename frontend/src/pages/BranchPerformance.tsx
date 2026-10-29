import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import ResponsiveTable from '@/components/ui/responsive-table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { dashboardAPI } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';
import { Home, Users, Target, TrendingUp } from 'lucide-react';

const pctColor = (v: number) => {
  if (v >= 80) return 'text-emerald-600';
  if (v >= 50) return 'text-amber-600';
  return 'text-red-600';
};

const pctBarColor = (v: number) => {
  if (v >= 80) return 'bg-emerald-500';
  if (v >= 50) return 'bg-amber-500';
  return 'bg-red-500';
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#6366f1'];

export function BranchPerformance() {
  const { user } = useUser();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await dashboardAPI.getBranch('Deposit Mobilization');
      if (res.success) setDashboardData(res.data);
    } catch (e) {
      console.error('Failed to load branch performance', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading performance data...</div>;
  if (!dashboardData) return <div className="text-center py-8 text-red-500">Failed to load data</div>;

  const kpiData = dashboardData.kpiData || [];
  const teamPerformance = dashboardData.teamPerformance || [];

  const totalTarget = kpiData.reduce((s: number, k: any) => s + (k.target || 0), 0);
  const totalActual = kpiData.reduce((s: number, k: any) => s + (k.actual || 0), 0);
  const overallPct = totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-white px-4 py-2.5 border rounded-lg shadow-sm">
        <Home className="w-3.5 h-3.5 text-slate-400" />
        <span>Home / Branch Management / {user?.branch_code || 'Branch'} / Performance</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Branch KPI Performance</h1>
          <p className="text-sm text-slate-500 mt-0.5">{user?.branch_code || 'Branch'} — Actual vs Target Achievement</p>
        </div>
        <button onClick={loadData} className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-md">Refresh</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500 uppercase tracking-wider">Total Target</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold text-slate-800">{totalTarget.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500 uppercase tracking-wider">Total Actual</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <span className="text-2xl font-bold text-slate-800">{totalActual.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500 uppercase tracking-wider">Overall Achievement</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${pctColor(overallPct)}`}>{overallPct}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500 uppercase tracking-wider">Active Staff</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-500" />
              <span className="text-2xl font-bold text-slate-800">{dashboardData.totalStaff || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>KPI Achievement by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {kpiData.map((kpi: any) => (
              <div key={kpi.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{kpi.category}</span>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-slate-500">Target: {kpi.target?.toLocaleString()}</span>
                    <span className="text-slate-500">Actual: {kpi.actual?.toLocaleString()}</span>
                    <span className={`font-semibold w-12 text-right ${pctColor(kpi.value)}`}>{kpi.value}%</span>
                  </div>
                </div>
                <Progress value={Math.min(kpi.value, 100)} className={`h-2.5 ${pctBarColor(kpi.value)?.replace('bg-', 'bg-').replace('-500', '-100')}`} />
              </div>
            ))}
            {kpiData.length === 0 && <div className="text-center py-8 text-slate-400">No KPI data available</div>}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Achievement by KPI</CardTitle></CardHeader>
          <CardContent>
            {kpiData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={kpiData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Bar dataKey="value" name="Achievement %" radius={[4, 4, 0, 0]}>
                    {kpiData.map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="text-center py-8 text-slate-400">No data</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Target vs Actual</CardTitle></CardHeader>
          <CardContent>
            {kpiData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={kpiData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Bar dataKey="target" name="Target" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Actual" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="text-center py-8 text-slate-400">No data</div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Member Performance</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="table-scroll px-3 sm:px-0">
            <ResponsiveTable
              columns={[
                {
                  key: 'name',
                  header: 'Staff',
                  primary: true,
                  render: (m: any) => <span className="font-medium text-slate-800">{m.name}</span>,
                },
                {
                  key: 'role',
                  header: 'Role',
                  render: (m: any) => <span className="text-slate-500 text-xs">{m.role}</span>,
                },
                {
                  key: 'mappedAccounts',
                  header: 'Mapped Accounts',
                  className: 'text-center',
                  render: (m: any) => <span className="font-mono text-xs">{m.mappedAccounts || 0}</span>,
                },
                {
                  key: 'target',
                  header: 'Target',
                  className: 'text-right',
                  render: (m: any) => <span className="font-mono text-xs">{m.target?.toLocaleString()}</span>,
                },
                {
                  key: 'actual',
                  header: 'Actual',
                  className: 'text-right',
                  render: (m: any) => <span className="font-mono text-xs">{m.actual?.toLocaleString()}</span>,
                },
                {
                  key: 'overall',
                  header: 'Achievement',
                  className: 'text-right',
                  render: (m: any) => (
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-20 bg-slate-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${pctBarColor(m.overall)}`} style={{ width: `${Math.min(m.overall, 100)}%` }} />
                      </div>
                      <span className={`text-xs font-semibold ${pctColor(m.overall)}`}>{m.overall}%</span>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  className: 'text-center',
                  render: (m: any) => (
                    <Badge variant={m.status === 'good' ? 'default' : m.status === 'warning' ? 'warning' : m.status === 'critical' ? 'destructive' : 'secondary'} className="text-xs">
                      {m.status?.replace(/-/g, ' ')}
                    </Badge>
                  ),
                },
              ]}
              data={teamPerformance}
              rowKey={(m: any) => m.id}
              emptyMessage="No team data"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
