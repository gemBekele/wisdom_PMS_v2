import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ResponsiveTable from '@/components/ui/responsive-table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, ChevronDown, Home } from 'lucide-react';
import { dashboardAPI, tasksAPI } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';
import { RegionalGaugeCard } from '@/components/dashboard/RegionalGaugeCard';
import { BranchIncrementalTable } from '@/components/dashboard/BranchIncrementalTable';
import { TopBranchesBarChart } from '@/components/dashboard/TopBranchesBarChart';

const KPI_OPTIONS = [
  'Deposit Mobilization',
  'Digital Channel Growth',
  'New Member Registration',
  'Share Capital Growth',
  'Account Productivity',
];

export function BranchManagerDashboard() {
  const { user } = useUser();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKPI, setSelectedKPI] = useState('Deposit Mobilization');

  useEffect(() => {
    loadDashboardData(selectedKPI);
  }, [selectedKPI]);

  const loadDashboardData = async (kpiCategory?: string) => {
    try {
      setLoading(true);
      const [dashboardRes, tasksRes] = await Promise.all([
        dashboardAPI.getBranch(kpiCategory || selectedKPI),
        tasksAPI.getAll({ approvalStatus: 'Pending', limit: 10 }),
      ]);

      if (dashboardRes.success) {
        setDashboardData(dashboardRes.data);
      }
      if (tasksRes.success) {
        setPendingTasks(tasksRes.data || []);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 font-medium">Loading Branch Manager Dashboard...</div>
      </div>
    );
  }

  const data = dashboardData || {};
  const analytical = data.analyticalData || {
    yesterdayTotal: 0, todayTotal: 0, difference: 0,
    activeYesterday: 0, activeToday: 0, activeDifference: 0,
    breakdown: [], topPerformers: [],
  };

  const dashboardTitle = 'Branch Manager Dashboard';
  const dashboardSubtitle = `${user?.branchId?.name || user?.branch_code || 'Branch'} Overview & Staff Analytical Breakdown`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between bg-white px-4 py-2.5 border border-slate-200 rounded-lg shadow-sm">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Home className="w-3.5 h-3.5 text-slate-400" />
          <span>Home / Branch Management / {user?.branch_code || 'Branch'}</span>
        </div>
        <div className="text-xs text-slate-400">
          Updated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-800">{dashboardTitle}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{dashboardSubtitle}</p>
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
            label={`Total Branch ${selectedKPI} Progress`}
            yesterday={analytical.yesterdayTotal}
            today={analytical.todayTotal}
            difference={analytical.difference}
            activeLabel={`Active Branch Staff Achievement`}
            activeYesterday={analytical.activeYesterday}
            activeToday={analytical.activeToday}
            activeDifference={analytical.activeDifference}
          />
        </div>
        <div className="lg:col-span-4 h-full">
          <BranchIncrementalTable
            title={`Total ${selectedKPI} of Staff Members in Branch`}
            nameHeader="Staff_Name"
            rows={analytical.breakdown}
          />
        </div>
        <div className="lg:col-span-4 h-full">
          <TopBranchesBarChart
            title={`Top Staff Members by ${selectedKPI}`}
            data={analytical.topPerformers}
            barColor="#f97316"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{data.totalStaff || 0}</div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">Mapped Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{(data.mappedAccounts || 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">Daily Deposit Target</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{(data.dailyDepositTarget || 0).toLocaleString()}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Birr</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">Today's Achievement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{(data.todayAchievement || 0).toLocaleString()}</div>
            <p className="text-[11px] text-slate-400 mt-0.5">Birr ({data.todayAchievementPercent || data.achievementPercent || 0}%)</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold text-slate-800">Pending Approvals</CardTitle>
          {pendingTasks.length > 0 && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{pendingTasks.length} Pending</Badge>
          )}
        </CardHeader>
        <CardContent>
          {pendingTasks.length > 0 ? (
            <div className="table-scroll px-3 sm:px-0">
              <ResponsiveTable
                columns={[
                  {
                    key: 'staff',
                    header: 'Staff Member',
                    primary: true,
                    render: (task: any) => <span className="font-medium text-xs text-slate-800">{task.submittedBy?.name || 'Staff'}</span>,
                  },
                  {
                    key: 'taskType',
                    header: 'Task Type',
                    render: (task: any) => <span className="text-xs text-slate-500">{task.taskType?.replace(/_/g, ' ')}</span>,
                  },
                  {
                    key: 'accountNumber',
                    header: 'Account No.',
                    render: (task: any) => <code className="text-xs font-mono text-slate-500">{task.accountNumber || 'N/A'}</code>,
                  },
                  {
                    key: 'amount',
                    header: 'Amount',
                    className: 'text-right',
                    render: (task: any) => <span className="text-xs text-slate-700">{task.amount ? `${task.amount.toLocaleString()} ETB` : '-'}</span>,
                  },
                  {
                    key: 'date',
                    header: 'Date',
                    render: (task: any) => <span className="text-xs text-slate-500">{new Date(task.taskDate).toLocaleDateString()}</span>,
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    className: 'text-center',
                    render: () => (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[11px]">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    ),
                  },
                ]}
                data={pendingTasks}
                rowKey={(task: any) => task.id}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
              <p className="font-medium text-slate-600 text-sm">No pending approvals</p>
              <p className="text-xs">All submitted tasks have been processed.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
