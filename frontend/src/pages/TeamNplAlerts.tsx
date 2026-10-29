import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { nplAPI } from '@/lib/api';
import { Users, User } from 'lucide-react';

export function TeamNplAlerts() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await nplAPI.getTeamAlerts();
      if (res.success) setData(res.data);
    } catch (e) {
      console.error('Failed to load team alerts', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading team alerts...</div>;
  if (!data) return <div className="text-center py-8 text-red-500">Failed to load alerts</div>;

  const { teamAlerts, totalHighPriority, totalAlerts } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Team Collection Alerts</h1>
          <p className="text-slate-600 mt-1">Missed payment alerts across your team</p>
        </div>
        <button onClick={loadData} className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-md">
          Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Team Members with Alerts</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamAlerts?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Total Missed Payments</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalAlerts || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">High Priority</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalHighPriority || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Per-staff alerts */}
      {teamAlerts?.length === 0 && (
        <Card>
          <CardContent className="text-center py-8 text-slate-400">
            <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            No collection alerts. All payments are up to date!
          </CardContent>
        </Card>
      )}

      {teamAlerts?.map((member: any) => (
        <Card key={member.staffId}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-slate-400" />
              {member.staffName}
              {member.highPriorityCount > 0 && (
                <Badge variant="destructive" className="text-xs">{member.highPriorityCount} urgent</Badge>
              )}
              <span className="text-sm font-normal text-slate-400">
                ({member.alerts.length} alerts)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {member.alerts.slice(0, 15).map((alert: any) => (
                <div key={alert.scheduleId}
                  className={`flex items-center justify-between p-3 rounded-lg border text-sm
                    ${alert.severity === 'high' ? 'bg-red-50 border-red-200' :
                      alert.severity === 'medium' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0
                      ${alert.severity === 'high' ? 'bg-red-500' :
                        alert.severity === 'medium' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-slate-500">{alert.accountNumber}</div>
                      <div className="font-medium text-slate-800 truncate">{alert.customerName}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold text-red-600">
                        {alert.remaining?.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400">
                        due {new Date(alert.expectedDate).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant={alert.severity === 'high' ? 'destructive' : 'warning'} className="text-xs">
                      {alert.dpd}d overdue
                    </Badge>
                  </div>
                </div>
              ))}
              {member.alerts.length > 15 && (
                <p className="text-xs text-slate-400 text-center pt-1">+{member.alerts.length - 15} more</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
