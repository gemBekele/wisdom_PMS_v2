import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ResponsiveTable from '@/components/ui/responsive-table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { dashboardAPI } from '@/lib/api';
import { RegionalGaugeCard } from '@/components/dashboard/RegionalGaugeCard';
import { BranchIncrementalTable } from '@/components/dashboard/BranchIncrementalTable';
import { TopBranchesBarChart } from '@/components/dashboard/TopBranchesBarChart';
import { ChevronDown, Home } from 'lucide-react';

const getHeatColor = (value: number) => {
  if (value >= 100) return '#059669';
  if (value >= 80) return '#2563eb';
  if (value >= 60) return '#d97706';
  return '#dc2626';
};

const KPI_OPTIONS = [
  'Deposit Mobilization',
  'Digital Channel Growth',
  'New Member Registration',
  'Share Capital Growth',
  'Account Productivity',
];

export function CEODashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedKPI, setSelectedKPI] = useState('Deposit Mobilization');

  useEffect(() => {
    loadDashboardData(selectedKPI);
  }, [selectedKPI]);

  const loadDashboardData = async (kpiCategory?: string) => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getHQ(kpiCategory || selectedKPI);
      if (response.success) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error('Error loading CEO dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 font-medium">Loading CEO Dashboard...</div>
      </div>
    );
  }

  const hqData = dashboardData || {};
  const analytical = hqData.analyticalData || {
    yesterdayTotal: 0, todayTotal: 0, difference: 0,
    activeYesterday: 0, activeToday: 0, activeDifference: 0,
    breakdown: [], topPerformers: [],
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between bg-white px-4 py-2.5 border border-slate-200 rounded-lg shadow-sm">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Home className="w-3.5 h-3.5 text-slate-400" />
          <span>Home / National SACCOS Performance / CEO HQ View</span>
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
            title={`Total ${selectedKPI} of Branches under HQ`}
            nameHeader="BranchName"
            rows={analytical.breakdown}
          />
        </div>
        <div className="lg:col-span-4 h-full">
          <TopBranchesBarChart
            title={`Top 10 Branches by Total ${selectedKPI}`}
            data={analytical.topPerformers}
            barColor="#f97316"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Active Branches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{hqData.totalBranches || 0}</div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Staff Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{hqData.totalStaff?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">Avg. Plan Achievement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {hqData.avgPlanAchievement != null ? `${(hqData.avgPlanAchievement).toFixed(0)}%` : '0%'}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">CBS Validation Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{hqData.cbsValidationRate ?? 0}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-800">Branch KPI Achievement Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            {hqData.branchKPIHeatmap && hqData.branchKPIHeatmap.length > 0 ? (
              <div className="table-scroll px-3 sm:px-0">
                <ResponsiveTable
                  columns={[
                    {
                      key: 'branch',
                      header: 'Branch',
                      primary: true,
                      render: (branch: any) => <span className="font-medium text-slate-700">{branch.branch}</span>,
                    },
                    {
                      key: 'deposit',
                      header: 'Deposit %',
                      className: 'text-center',
                      render: (branch: any) => {
                        const val = branch.deposit ?? 0;
                        return (
                          <span className="inline-block text-center py-1 px-2 font-semibold text-white rounded" style={{ backgroundColor: getHeatColor(val) }}>
                            {val}%
                          </span>
                        );
                      },
                    },
                    {
                      key: 'digital',
                      header: 'Digital %',
                      className: 'text-center',
                      render: (branch: any) => {
                        const val = branch.digital ?? 0;
                        return (
                          <span className="inline-block text-center py-1 px-2 font-semibold text-white rounded" style={{ backgroundColor: getHeatColor(val) }}>
                            {val}%
                          </span>
                        );
                      },
                    },
                    {
                      key: 'loan',
                      header: 'Loan %',
                      className: 'text-center',
                      render: (branch: any) => {
                        const val = branch.loan ?? 0;
                        return (
                          <span className="inline-block text-center py-1 px-2 font-semibold text-white rounded" style={{ backgroundColor: getHeatColor(val) }}>
                            {val}%
                          </span>
                        );
                      },
                    },
                    {
                      key: 'customer',
                      header: 'Customer %',
                      className: 'text-center',
                      render: (branch: any) => {
                        const val = branch.customer ?? 0;
                        return (
                          <span className="inline-block text-center py-1 px-2 font-semibold text-white rounded" style={{ backgroundColor: getHeatColor(val) }}>
                            {val}%
                          </span>
                        );
                      },
                    },
                  ]}
                  data={hqData.branchKPIHeatmap}
                  rowKey={(branch: any) => branch.branchId}
                  emptyMessage="No branch heatmap available"
                />
              </div>
            ) : (
              <div className="text-center text-slate-400 py-8 text-sm">No branch heatmap available</div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-800">Performance Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {hqData.performanceDistribution && hqData.performanceDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={hqData.performanceDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis dataKey="rating" type="category" width={110} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="#2563eb">
                    {hqData.performanceDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={getHeatColor(entry.count * 20)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 py-8 text-sm">No distribution data</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-800">Top 5 Branches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="table-scroll px-3 sm:px-0">
              <ResponsiveTable
                columns={[
                  {
                    key: 'branch',
                    header: 'Branch',
                    primary: true,
                    render: (b: any) => <span className="font-medium text-xs text-slate-800">{b.branch || b.name}</span>,
                  },
                  {
                    key: 'target',
                    header: 'Target',
                    className: 'text-right',
                    render: (b: any) => <span className="text-xs text-slate-500">{b.depositTarget?.toLocaleString() || b.target?.toLocaleString() || '0'}</span>,
                  },
                  {
                    key: 'actual',
                    header: 'Actual',
                    className: 'text-right',
                    render: (b: any) => <span className="text-xs text-slate-700">{b.actual?.toLocaleString() || '0'}</span>,
                  },
                  {
                    key: 'percent',
                    header: '%',
                    className: 'text-center',
                    render: (b: any) => (
                      <Badge className={(b.percent ?? 0) >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
                        {b.percent ?? 0}%
                      </Badge>
                    ),
                  },
                  {
                    key: 'rating',
                    header: 'Rating',
                    className: 'text-center',
                    render: (b: any) => <span className="text-xs font-medium text-slate-600">{b.rating || 'N/A'}</span>,
                  },
                ]}
                data={hqData.topBranches || []}
                rowKey={(b: any) => b.branch || b.id}
                emptyMessage="No top branch data available"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-800">Bottom 5 Branches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="table-scroll px-3 sm:px-0">
              <ResponsiveTable
                columns={[
                  {
                    key: 'branch',
                    header: 'Branch',
                    primary: true,
                    render: (b: any) => <span className="font-medium text-xs text-slate-800">{b.branch || b.name}</span>,
                  },
                  {
                    key: 'target',
                    header: 'Target',
                    className: 'text-right',
                    render: (b: any) => <span className="text-xs text-slate-500">{b.depositTarget?.toLocaleString() || b.target?.toLocaleString() || '0'}</span>,
                  },
                  {
                    key: 'actual',
                    header: 'Actual',
                    className: 'text-right',
                    render: (b: any) => <span className="text-xs text-slate-700">{b.actual?.toLocaleString() || '0'}</span>,
                  },
                  {
                    key: 'percent',
                    header: '%',
                    className: 'text-center',
                    render: (b: any) => (
                      <Badge className={(b.percent ?? 0) < 60 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
                        {b.percent ?? 0}%
                      </Badge>
                    ),
                  },
                  {
                    key: 'rating',
                    header: 'Rating',
                    className: 'text-center',
                    render: (b: any) => <span className="text-xs font-medium text-slate-600">{b.rating || 'N/A'}</span>,
                  },
                ]}
                data={hqData.bottomBranches || []}
                rowKey={(b: any) => b.branch || b.id}
                emptyMessage="No bottom branch data available"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
