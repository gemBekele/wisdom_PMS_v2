import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ResponsiveTable from '@/components/ui/responsive-table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardAPI } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';
import { Home, Building2, Users, Target } from 'lucide-react';

export function AreaPerformance() {
  const { user } = useUser();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getArea();
      if (response.success) {
        setData(response.data);
      }
    } catch (error) {
      console.error('Error loading area performance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading area performance...</div>
      </div>
    );
  }

  const branches = data?.branches || [];
  const avgAchievement = data?.avgBranchAchievement || 0;
  const staffCount = data?.staffCount || 0;
  const branchCount = data?.branchCount || 0;

  const chartData = branches.map((b: any) => ({
    name: b.name,
    achievement: b.achievement || 0,
  }));

  const getStatus = (achievement: number) => {
    if (achievement >= 80) return { label: 'Good', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (achievement >= 60) return { label: 'On Track', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (achievement > 0) return { label: 'Needs Attention', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'No Data', color: 'bg-slate-100 text-slate-500 border-slate-200' };
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between bg-white px-4 py-2.5 border border-slate-200 rounded-lg shadow-sm">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Home className="w-3.5 h-3.5 text-slate-400" />
          <span>Home / Area Performance / {user?.branchId?.name || user?.area?.name || user?.areaId?.name || 'My Area'}</span>
        </div>
        <div className="text-xs text-slate-400">
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Area Performance</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {branches.length > 0
            ? `${branches.length} branches under ${user?.branchId?.name || user?.area?.name || user?.areaId?.name || 'your area'}`
            : 'No branches assigned to your area'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Branches</p>
              <p className="text-2xl font-bold text-slate-800">{branchCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Staff</p>
              <p className="text-2xl font-bold text-slate-800">{staffCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50">
              <Target className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Average Achievement</p>
              <p className="text-2xl font-bold text-slate-800">{avgAchievement}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-800">Branch Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  formatter={(val: number) => [`${val}%`, 'Achievement']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="achievement" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-10 text-slate-400 text-sm">No branch performance data available</div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-800">Branch Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="table-scroll px-3 sm:px-0">
            <ResponsiveTable
              columns={[
                {
                  key: 'name',
                  header: 'Branch Name',
                  primary: true,
                  render: (branch: any) => <span className="font-medium text-sm text-slate-800">{branch.name}</span>,
                },
                {
                  key: 'staff',
                  header: 'Staff',
                  className: 'text-right',
                  render: (branch: any) => <span className="text-sm text-slate-500">{branch.staff || 0}</span>,
                },
                {
                  key: 'achievement',
                  header: 'Achievement',
                  className: 'text-right',
                  render: (branch: any) => {
                    const ach = branch.achievement || 0;
                    return (
                      <div className="flex items-center gap-2 justify-end">
                        <Progress value={ach} className="w-20 h-1.5" />
                        <span className="text-sm font-semibold text-slate-700">{ach}%</span>
                      </div>
                    );
                  },
                },
                {
                  key: 'status',
                  header: 'Status',
                  className: 'text-center',
                  render: (branch: any) => {
                    const ach = branch.achievement || 0;
                    const status = getStatus(ach);
                    return <Badge variant="outline" className={`${status.color} text-xs`}>{status.label}</Badge>;
                  },
                },
              ]}
              data={branches}
              rowKey={(branch: any) => branch.id || branch.name}
              emptyMessage="No branches assigned to your area"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
