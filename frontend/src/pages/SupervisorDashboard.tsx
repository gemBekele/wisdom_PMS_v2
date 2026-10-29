import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FileText, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { dashboardAPI, tasksAPI } from '@/lib/api';

export function SupervisorDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalMembers: 0, totalMappedAccounts: 0, averageKpiAchievement: 0 });
  const [pendingApprovals, setPendingApprovals] = useState(0);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const [dashboardRes, tasksRes] = await Promise.all([
        dashboardAPI.getSupervisor(),
        tasksAPI.getAll({ approvalStatus: 'Pending', limit: 10 }),
      ]);
      if (dashboardRes.success && dashboardRes.data) {
        setStats(dashboardRes.data.teamStats || { totalMembers: 0, totalMappedAccounts: 0, averageKpiAchievement: 0 });
      }
      if (tasksRes.success && Array.isArray(tasksRes.data)) {
        setPendingApprovals(tasksRes.data.length);
      }
    } catch (_) {}
    setLoading(false);
  };

  const statCards = [
    { title: 'Team Members', value: stats.totalMembers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Mapped Accounts', value: stats.totalMappedAccounts, icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Avg KPI Achievement', value: `${stats.averageKpiAchievement.toFixed(1)}%`, icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Pending Approvals', value: pendingApprovals, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Supervisor Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Quick overview of your team</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => window.location.href = '/team-hub'} className="bg-orange-600 hover:bg-orange-700 text-white">
            View Team Hub <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/tasks/new'}>
            Log Daily Task
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-500">{stat.title}</p>
                <p className="text-xl font-bold text-slate-800">{loading ? '...' : stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
