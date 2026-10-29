import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ResponsiveTable from '@/components/ui/responsive-table';
import { TrendingUp, TrendingDown, Pencil, CheckCircle2, XCircle, Users } from 'lucide-react';
import { dashboardAPI, tasksAPI } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';

interface TeamMember {
  id: string;
  name: string;
  position: string;
  email: string;
  mappedAccounts: number;
  kpiAchievement: number;
}

export function TeamHub() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamKpi, setTeamKpi] = useState<Record<string, any>>({});
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [editRequests, setEditRequests] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const branchId = typeof user?.branchId === 'string' ? user.branchId : (user as any)?.branchId?._id || (user as any)?.branchId;
      const [dashboardRes, editRes] = await Promise.all([
        dashboardAPI.getSupervisor(),
        tasksAPI.getAll({ hasEditRequest: 'true' }),
      ]);

      if (dashboardRes.success && dashboardRes.data) {
        setTeamMembers(dashboardRes.data.teamMembers || []);
        setTeamKpi(dashboardRes.data.teamKpi || {});
      }
      if (editRes.success && Array.isArray(editRes.data)) {
        setEditRequests(editRes.data);
      }

      const memberIds = (dashboardRes.data?.teamMembers || []).map((m: any) => m.id);
      if (memberIds.length > 0 && branchId) {
        const tasksRes = await tasksAPI.getAll({ branchId, limit: 20 });
        if (tasksRes.success && Array.isArray(tasksRes.data)) {
          const memberIdSet = new Set(memberIds);
          setRecentTasks(tasksRes.data.filter((t: any) => memberIdSet.has(t.submittedById)));
        }
      }
    } catch (_) {}
    setLoading(false);
  };

  const handleReviewEdit = async (taskId: string, action: 'approve' | 'reject') => {
    try {
      setActionLoading(taskId);
      await tasksAPI.reviewEdit(taskId, action);
      fetchData();
    } catch (error) {
      console.error('Error reviewing edit:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="p-6 text-center text-slate-500">Loading Team Hub...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-orange-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Team Hub</h1>
          <p className="text-xs text-slate-500 mt-0.5">Full view of your team's performance, tasks, and activity</p>
        </div>
      </div>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="table-scroll px-3 sm:px-0">
            <ResponsiveTable
              columns={[
                {
                  key: 'name',
                  header: 'Name',
                  primary: true,
                  render: (member: any) => <span className="font-medium text-slate-800">{member.name}</span>,
                },
                {
                  key: 'position',
                  header: 'Position',
                  render: (member: any) => <span className="text-slate-600">{member.position || '—'}</span>,
                },
                {
                  key: 'mappedAccounts',
                  header: 'Mapped Accounts',
                  className: 'text-center',
                  render: (member: any) => <span>{member.mappedAccounts}</span>,
                },
                {
                  key: 'kpiAchievement',
                  header: 'KPI Achievement',
                  className: 'text-center',
                  render: (member: any) => <span className="font-medium">{member.kpiAchievement.toFixed(1)}%</span>,
                },
                {
                  key: 'status',
                  header: 'Status',
                  className: 'text-center',
                  render: (member: any) => {
                    const pct = member.kpiAchievement;
                    const statusLabel = pct >= 80 ? 'On Track' : pct >= 60 ? 'Needs Focus' : 'At Risk';
                    const statusColor = pct >= 80 ? 'bg-emerald-100 text-emerald-700' : pct >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
                    return (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>{statusLabel}</span>
                    );
                  },
                },
              ]}
              data={teamMembers}
              rowKey={(member: any) => member.id}
              emptyMessage="No team members assigned"
            />
          </div>
        </CardContent>
      </Card>

      {/* Team KPI Breakdown */}
      {Object.keys(teamKpi).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(teamKpi).map(([cat, data]: [string, any]) => {
            const pct = data.percent || 0;
            const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
            const statusLabel = pct >= 80 ? 'On Track' : pct >= 60 ? 'Needs Focus' : 'At Risk';
            const statusColor = pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600';
            return (
              <div key={cat} className="rounded-lg border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">{cat.replace(/_/g, ' ')}</span>
                  <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold text-slate-800">{pct}%</span>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    {data.actual?.toLocaleString() || 0} / {data.target?.toLocaleString() || 0}
                    {pct >= 80 ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Team Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Team Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="table-scroll px-3 sm:px-0">
            <ResponsiveTable
              columns={[
                {
                  key: 'staff',
                  header: 'Staff',
                  primary: true,
                  render: (task: any) => <span className="font-medium text-slate-800">{task.submittedBy?.name || '—'}</span>,
                },
                {
                  key: 'taskType',
                  header: 'Task Type',
                  render: (task: any) => <span className="text-slate-600">{(task.taskType || '').replace(/_/g, ' ')}</span>,
                },
                {
                  key: 'accountNumber',
                  header: 'Account',
                  render: (task: any) => <code className="font-mono text-xs">{task.accountNumber || '—'}</code>,
                },
                {
                  key: 'amount',
                  header: 'Amount',
                  className: 'text-right',
                  render: (task: any) => <span>{task.amount ? `${task.amount.toLocaleString()}` : '—'}</span>,
                },
                {
                  key: 'date',
                  header: 'Date',
                  render: (task: any) => <span className="text-slate-500">{task.taskDate ? new Date(task.taskDate).toLocaleDateString() : '—'}</span>,
                },
                {
                  key: 'status',
                  header: 'Status',
                  className: 'text-center',
                  render: (task: any) => (
                    <Badge variant="outline" className={
                      task.approvalStatus === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      task.approvalStatus === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                      'bg-amber-50 text-amber-700 border-amber-200'
                    }>
                      {task.approvalStatus || 'Pending'}
                    </Badge>
                  ),
                },
              ]}
              data={recentTasks.slice(0, 10)}
              rowKey={(task: any) => task._id || task.id}
              emptyMessage="No recent tasks from team members"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pending Edit Requests */}
      {editRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Pencil className="h-5 w-5 text-amber-500" />
              Pending Edit Requests
              <Badge className="bg-amber-100 text-amber-800 ml-2">{editRequests.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="table-scroll px-3 sm:px-0">
              <ResponsiveTable
                columns={[
                  {
                    key: 'staff',
                    header: 'Staff',
                    primary: true,
                    render: (task: any) => <span className="font-medium text-slate-800">{task.submittedBy?.name || 'N/A'}</span>,
                  },
                  {
                    key: 'taskType',
                    header: 'Task Type',
                    render: (task: any) => <span className="text-slate-600">{task.taskType}</span>,
                  },
                  {
                    key: 'accountNumber',
                    header: 'Account',
                    render: (task: any) => <code className="font-mono text-xs">{task.accountNumber}</code>,
                  },
                  {
                    key: 'changes',
                    header: 'Proposed Changes',
                    render: (task: any) => {
                      const editData = task.requestedEditData || {};
                      const changes = Object.entries(editData)
                        .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1')}: ${v}`)
                        .join(', ');
                      return <span className="text-xs text-amber-700 break-words">{changes}</span>;
                    },
                  },
                  {
                    key: 'action',
                    header: 'Action',
                    className: 'text-center',
                    render: (task: any) => (
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                          onClick={() => handleReviewEdit(task._id, 'approve')} disabled={actionLoading === task._id}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                          onClick={() => handleReviewEdit(task._id, 'reject')} disabled={actionLoading === task._id}>
                          <XCircle className="h-3 w-3 mr-1" /> Reject
                        </Button>
                      </div>
                    ),
                  },
                ]}
                data={editRequests}
                rowKey={(task: any) => task._id}
                mobileActions={(task: any) => {
                  const editData = task.requestedEditData || {};
                  const changes = Object.entries(editData)
                    .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1')}: ${v}`)
                    .join(', ');
                  return (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-700 break-words flex-1">Changes: {changes}</span>
                      <Button variant="outline" size="sm" className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => handleReviewEdit(task._id, 'approve')} disabled={actionLoading === task._id}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                        onClick={() => handleReviewEdit(task._id, 'reject')} disabled={actionLoading === task._id}>
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  );
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
