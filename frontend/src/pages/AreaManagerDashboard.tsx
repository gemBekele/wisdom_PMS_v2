import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { dashboardAPI } from '@/lib/api';
import { RegionalGaugeCard } from '@/components/dashboard/RegionalGaugeCard';
import { BranchIncrementalTable } from '@/components/dashboard/BranchIncrementalTable';
import { TopBranchesBarChart } from '@/components/dashboard/TopBranchesBarChart';
import { ChevronDown, Home } from 'lucide-react';

const KPI_OPTIONS = [
  'Digital Channel Growth',
  'Deposit Mobilization',
  'New Member Registration',
  'Share Capital Growth',
  'Account Productivity',
];

export function AreaManagerDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedKPI, setSelectedKPI] = useState('Digital Channel Growth');

  useEffect(() => {
    loadDashboardData(selectedKPI);
  }, [selectedKPI]);

  const loadDashboardData = async (kpiCategory?: string) => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getArea(kpiCategory || selectedKPI);
      if (response.success) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error('Error loading Area dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 font-medium">Loading Area Dashboard...</div>
      </div>
    );
  }

  const data = dashboardData || {};
  const analytical = data.analyticalData || {
    yesterdayTotal: 0, todayTotal: 0, difference: 0,
    activeYesterday: 0, activeToday: 0, activeDifference: 0,
    breakdown: [], topPerformers: [],
  };

  const getStatusBadge = (achievement: number) => {
    if (achievement >= 80) return { label: 'Excellent', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (achievement >= 60) return { label: 'On Track', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (achievement > 0) return { label: 'Needs Attention', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { label: 'No Data', color: 'bg-slate-100 text-slate-500 border-slate-200' };
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between bg-white px-4 py-2.5 border border-slate-200 rounded-lg shadow-sm">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Home className="w-3.5 h-3.5 text-slate-400" />
          <span>Home / Area Regional View</span>
        </div>
        <div className="text-xs text-slate-400">
          Updated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ChevronDown className="w-4 h-4 text-slate-400" />
          <h2 className="text-base font-semibold text-slate-800">{selectedKPI}</h2>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {KPI_OPTIONS.map((kpi) => (
            <button
              key={kpi}
              onClick={() => setSelectedKPI(kpi)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedKPI === kpi
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {kpi}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-4">
          <RegionalGaugeCard
            label={`Total ${selectedKPI} Subscribers as a Region`}
            yesterday={analytical.yesterdayTotal}
            today={analytical.todayTotal}
            difference={analytical.difference}
            activeLabel={`Active ${selectedKPI} Subscribers as a Region`}
            activeYesterday={analytical.activeYesterday}
            activeToday={analytical.activeToday}
            activeDifference={analytical.activeDifference}
          />
        </div>
        <div className="lg:col-span-4 h-full">
          <BranchIncrementalTable
            title={`Total ${selectedKPI} of Branches under the Region`}
            nameHeader="Branch_name"
            rows={analytical.breakdown}
          />
        </div>
        <div className="lg:col-span-4 h-full">
          <TopBranchesBarChart
            title={`Top 10 Branches by active ${selectedKPI} as a Region`}
            data={analytical.topPerformers}
            barColor="#f97316"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">Branches Under Area</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{data.branchCount || 0}</div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">Avg. Branch Achievement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{data.avgBranchAchievement || 0}%</div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Area Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {data.branches?.reduce((sum: number, b: any) => sum + (b.staff || 0), 0) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-800">Mapping Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              {data.mappingData && data.mappingData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.mappingData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {data.mappingData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color || '#8884d8'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-slate-400 py-8 text-sm">No mapping data</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-800">Branch Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {data.branches && data.branches.length > 0 ? (
              <div className="space-y-2">
                {data.branches.map((branch: any) => {
                  const status = getStatusBadge(branch.achievement);
                  return (
                    <div key={branch.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div>
                        <div className="font-medium text-slate-800 text-sm">{branch.name}</div>
                        <div className="text-xs text-slate-400">{branch.staff || 0} staff</div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Progress value={branch.achievement || 0} className="w-16 h-1.5" />
                          <span className="font-semibold text-slate-700 text-xs">{branch.achievement || 0}%</span>
                        </div>
                        <Badge variant="outline" className={`${status.color} mt-1 text-[11px]`}>{status.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-slate-400 py-8 text-sm">No branch status available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
