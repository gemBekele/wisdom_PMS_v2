import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { nplAPI } from '@/lib/api';
import { AlertTriangle } from 'lucide-react';

const parColor = (val: number) => {
  if (val < 5) return 'text-emerald-600';
  if (val < 10) return 'text-amber-600';
  return 'text-red-600';
};

export function StaffNplDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await nplAPI.getStaff();
      if (res.success) setData(res.data);
    } catch (e) {
      console.error('Failed to load staff NPL', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading collection data...</div>;
  if (!data) return <div className="text-center py-8 text-red-500">Failed to load collection data</div>;

  const { alerts, collectionRate, parMetrics, alertCount, totalAlerts } = data;

  const formatBirr = (v: number) => (v || 0).toLocaleString('en-US', { minimumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">My Collection Overview</h1>
          <p className="text-slate-600 mt-1">Track your loan collections and overdue accounts</p>
        </div>
        <button onClick={loadData} className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-md">
          Refresh
        </button>
      </div>

      {parMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">PAR 1 (Watch)</CardTitle></CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${parColor(parMetrics.par1Ratio)}`}>
                {parMetrics.par1Ratio?.toFixed(2)}%
              </div>
              <p className="text-xs text-slate-500 mt-1">{formatBirr(parMetrics.par1Amount)} — {parMetrics.par1Count} accounts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">PAR 30 (Substandard)</CardTitle></CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${parColor(parMetrics.par30Ratio)}`}>
                {parMetrics.par30Ratio?.toFixed(2)}%
              </div>
              <p className="text-xs text-slate-500 mt-1">{formatBirr(parMetrics.par30Amount)} — {parMetrics.par30Count} accounts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">PAR 90 (NPL — Doubtful)</CardTitle></CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${parColor(parMetrics.par90Ratio)}`}>
                {parMetrics.par90Ratio?.toFixed(2)}%
              </div>
              <p className="text-xs text-slate-500 mt-1">{formatBirr(parMetrics.par90Amount)} — {parMetrics.par90Count} accounts</p>
            </CardContent>
          </Card>
        </div>
      )}

      {collectionRate && collectionRate.expected > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              Collection Rate
              <span className="text-sm font-normal text-slate-400">({collectionRate.count} installments)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-3">
              <div className="text-3xl font-bold" style={{ color: collectionRate.percent >= 90 ? '#059669' : collectionRate.percent >= 60 ? '#d97706' : '#dc2626' }}>
                {collectionRate.percent?.toFixed(0)}%
              </div>
              <div className="text-right text-sm text-slate-500">
                <div>{formatBirr(collectionRate.paid)} collected</div>
                <div>of {formatBirr(collectionRate.expected)} expected</div>
              </div>
            </div>
            <Progress
              value={Math.min(collectionRate.percent, 100)}
              className={`h-2.5 ${collectionRate.percent >= 90 ? 'bg-emerald-100' : collectionRate.percent >= 60 ? 'bg-amber-100' : 'bg-red-100'}`}
            />
          </CardContent>
        </Card>
      )}

      {alerts?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className={`h-5 w-5 ${alertCount > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
              Overdue Collection Alerts
              <span className="ml-2 text-sm font-normal text-slate-400">({totalAlerts} total)</span>
              {alertCount > 0 && (
                <Badge variant="destructive" className="text-xs ml-1">{alertCount} high priority</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert: any) => (
                <div key={alert.scheduleId}
                  className={`flex items-center justify-between p-4 rounded-lg border text-sm
                    ${alert.severity === 'high' ? 'bg-red-50 border-red-200' :
                      alert.severity === 'medium' ? 'bg-amber-50 border-amber-200' :
                      'bg-slate-50 border-slate-200'}`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0
                      ${alert.severity === 'high' ? 'bg-red-500' :
                        alert.severity === 'medium' ? 'bg-amber-500' : 'bg-slate-400'}`}
                    />
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-slate-500">{alert.accountNumber}</div>
                      <div className="font-medium text-slate-800 truncate">{alert.customerName}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold text-red-600">{formatBirr(alert.remaining)}</div>
                      <div className="text-xs text-slate-400">due {new Date(alert.expectedDate).toLocaleDateString()}</div>
                    </div>
                    <Badge variant={alert.severity === 'high' ? 'destructive' : 'warning'} className="text-xs whitespace-nowrap">
                      {alert.dpd}d overdue
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(!alerts || alerts.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-6xl mb-4">&#10003;</div>
            <h3 className="text-lg font-semibold text-slate-700">All Clear</h3>
            <p className="text-slate-500 mt-1">No overdue collection alerts</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
