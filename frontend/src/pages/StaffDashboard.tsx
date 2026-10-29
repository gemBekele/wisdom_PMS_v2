import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { Phone, TrendingUp, TrendingDown, Minus, Save, X, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { dashboardAPI, mappedAccountsAPI, nplAPI } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';

export function StaffDashboard() {
  const { user } = useUser();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPhone, setEditingPhone] = useState<string | null>(null);
  const [phoneValue, setPhoneValue] = useState('');
  const [nplData, setNplData] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
    loadNplData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, mappingRes] = await Promise.all([
        dashboardAPI.getStaff(),
        mappedAccountsAPI.getDashboard(user?.id),
      ]);

      if (dashboardRes.success) {
        setDashboardData(dashboardRes.data);
        if (dashboardRes.data?.accounts) {
          setAccounts(dashboardRes.data.accounts);
        }
      }
      if (mappingRes.success && mappingRes.data?.accounts && !dashboardRes.data?.accounts) {
        setAccounts(mappingRes.data.accounts);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNplData = async () => {
    try {
      const res = await nplAPI.getStaff();
      if (res.success) setNplData(res.data);
    } catch (e) {
      // NPL data is optional
    }
  };

  const savePhoneNumber = async (accountNumber: string) => {
    try {
      await mappedAccountsAPI.update(accountNumber, { phoneNumber: phoneValue });
      setEditingPhone(null);
      loadDashboardData();
    } catch (error) {
      console.error('Error saving phone:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const performanceScore = dashboardData?.performanceScore;
  const kpiScores = performanceScore?.kpiScores || dashboardData?.kpiBreakdown || {};
  const comparative = dashboardData?.comparative || {};
  const dayChange = comparative.dayChange || {};
  const monthChange = comparative.monthChange || {};

  const allProducts = Object.values(kpiScores).flatMap((kpi: any) => kpi.products || [])
    .filter((p: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.product_category === p.product_category) === i);

  const totalDepositTarget = allProducts.reduce((s: number, p: any) => s + (p.target || 0), 0);
  const totalDepositActual = allProducts.reduce((s: number, p: any) => s + (p.actual || 0), 0);
  const totalDepositPct = totalDepositTarget > 0 ? Math.round((totalDepositActual / totalDepositTarget) * 100) : 0;

  const trendIcon = (val: number) => {
    if (val > 0) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (val < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-slate-400" />;
  };

  const trendColor = (val: number) => val > 0 ? 'text-emerald-600' : val < 0 ? 'text-red-600' : 'text-slate-500';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">My Performance Dashboard</h1>
        <p className="text-slate-600 mt-1">Track your personal targets and daily tasks</p>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Deposit Target</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{totalDepositTarget.toLocaleString()}</div>
            <p className="text-xs text-slate-500">Birr</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Achieved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{totalDepositActual.toLocaleString()}</div>
            <p className="text-xs text-emerald-600">Birr ({totalDepositPct}%)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Incremental Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{dashboardData?.depositGrowth?.toLocaleString() || '0'}</div>
            <p className="text-xs text-slate-500">From June 30 baseline</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Active Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{dashboardData?.mappedAccounts || 0}</div>
            <p className="text-xs text-slate-500">Balance ≥1,000 ETB</p>
          </CardContent>
        </Card>
      </div>

      {/* Today vs Yesterday */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Today <span className="text-xs text-slate-400 ml-1">vs Yesterday</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-4">
              <div>
                <div className="text-2xl font-bold text-slate-800">{comparative.today?.tasks || 0}</div>
                <p className="text-xs text-slate-500">Tasks completed</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-800">{(comparative.today?.amount || 0).toLocaleString()}</div>
                <p className="text-xs text-slate-500">Birr amount</p>
              </div>
              <div className="flex items-center gap-1 text-sm">
                {trendIcon(dayChange.tasks)}
                <span className={trendColor(dayChange.tasks)}>
                  {dayChange.tasks >= 0 ? '+' : ''}{dayChange.tasks} tasks
                </span>
                <span className={trendColor(dayChange.amount)}>
                  ({dayChange.amount >= 0 ? '+' : ''}{dayChange.amountPercent}% amt)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              This Month <span className="text-xs text-slate-400 ml-1">vs Last Month</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-4">
              <div>
                <div className="text-2xl font-bold text-slate-800">{comparative.thisMonth?.tasks || 0}</div>
                <p className="text-xs text-slate-500">This month tasks</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-500">{comparative.lastMonth?.tasks || 0}</div>
                <p className="text-xs text-slate-500">Last month</p>
              </div>
              <div className="flex items-center gap-1 text-sm">
                {trendIcon(monthChange.tasks)}
                <span className={trendColor(monthChange.tasks)}>
                  {monthChange.tasks >= 0 ? '+' : ''}{monthChange.tasks} ({monthChange.tasksPercent}%)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Collection Alerts */}
      {nplData?.alerts?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className={`h-5 w-5 ${nplData.alertCount > 0 ? 'text-red-500' : 'text-emerald-500'}`} />
              Collection Alerts
              <span className="ml-2 text-sm font-normal text-slate-400">
                ({nplData.totalAlerts} pending)
              </span>
              {nplData.alertCount > 0 && (
                <Badge variant="destructive" className="text-xs ml-1">{nplData.alertCount} high priority</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {nplData.alerts.slice(0, 10).map((alert: any) => (
                <div key={alert.scheduleId}
                  className={`flex items-center justify-between p-3 rounded-lg border text-sm
                    ${alert.severity === 'high' ? 'bg-red-50 border-red-200' :
                      alert.severity === 'medium' ? 'bg-amber-50 border-amber-200' :
                      'bg-slate-50 border-slate-200'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0
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
                      <div className="font-mono text-sm font-semibold text-red-600">{alert.remaining?.toLocaleString()}</div>
                      <div className="text-xs text-slate-400">due {new Date(alert.expectedDate).toLocaleDateString()}</div>
                    </div>
                    <Badge variant={alert.severity === 'high' ? 'destructive' : 'warning'} className="text-xs">
                      {alert.dpd}d overdue
                    </Badge>
                  </div>
                </div>
              ))}
              {nplData.alerts.length > 10 && (
                <p className="text-xs text-slate-400 text-center pt-2">
                  +{nplData.alerts.length - 10} more alerts
                </p>
              )}
            </div>
            {nplData.collectionRate && nplData.collectionRate.expected > 0 && (
              <div className="mt-4 pt-3 border-t flex items-center justify-between text-sm">
                <span className="text-slate-600">Today's Collection Rate</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500">
                    {nplData.collectionRate.paid?.toLocaleString()} / {nplData.collectionRate.expected?.toLocaleString()} Birr
                  </span>
                  <span className={`font-bold text-lg ${
                    nplData.collectionRate.percent >= 90 ? 'text-emerald-600' :
                    nplData.collectionRate.percent >= 60 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {nplData.collectionRate.percent?.toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Compact Product Progress */}
      {allProducts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Product Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              {allProducts.map((prod: any) => {
                const pct = prod.percent || 0;
                const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';
                return (
                  <div key={prod.product_category} className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 w-32 truncate shrink-0">{prod.product_category.replace(/_/g, ' ')}</span>
                    <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 w-28 text-right shrink-0">
                      {prod.actual?.toLocaleString() || 0} / {prod.target?.toLocaleString() || 0}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Mapped Accounts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Accounts Mapped to You
            <span className="ml-2 text-sm font-normal text-slate-400">({accounts.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <div className="table-scroll px-3 sm:px-0">
            <ResponsiveTable
              columns={[
                { key: 'accountNumber', header: 'Account #', primary: true, render: (a: any) => <span className="font-mono text-xs font-bold text-blue-600">{a.accountNumber}</span> },
                { key: 'customerName', header: 'Customer', render: (a: any) => <span className="font-medium text-slate-800">{a.customerName}</span> },
                {
                  key: 'phone', header: 'Phone',
                  render: (a: any) => editingPhone === a.accountNumber ? (
                    <div className="flex items-center gap-1">
                      <Input value={phoneValue} onChange={(e) => setPhoneValue(e.target.value)} className="h-7 text-xs w-28" placeholder="+251..." />
                      <button onClick={() => savePhoneNumber(a.accountNumber)} className="p-1 hover:bg-green-50 rounded"><Save className="h-3 w-3 text-green-600" /></button>
                      <button onClick={() => setEditingPhone(null)} className="p-1 hover:bg-red-50 rounded"><X className="h-3 w-3 text-red-500" /></button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingPhone(a.accountNumber); setPhoneValue(a.phoneNumber || ''); }} className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
                      {a.phoneNumber ? <><Phone className="h-3 w-3" /><span>{a.phoneNumber}</span></> : <span className="text-slate-400 italic text-xs">+ Add</span>}
                    </button>
                  ),
                },
                { key: 'juneBalance', header: 'June Balance', className: 'text-right', render: (a: any) => <span className="font-mono text-sm">{(a.juneBalance || a.june_balance || 0).toLocaleString()}</span> },
                { key: 'currentBalance', header: 'Current Balance', className: 'text-right', render: (a: any) => <span className="font-mono text-sm">{(a.currentBalance || a.current_balance || 0).toLocaleString()}</span> },
                {
                  key: 'diff', header: 'vs June',
                  render: (a: any) => {
                    const diff = (a.currentBalance || a.current_balance || 0) - (a.juneBalance || a.june_balance || 0);
                    return (
                      <span className={`inline-flex items-center gap-0.5 font-mono text-sm ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        {diff > 0 ? <TrendingUp className="h-3 w-3" /> : diff < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                        {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                      </span>
                    );
                  },
                },
                { key: 'activeStatus', header: 'Status', render: (a: any) => <Badge variant={a.activeStatus || a.active_status ? 'default' : 'secondary'} className="text-xs">{a.activeStatus || a.active_status ? 'Active' : 'Inactive'}</Badge> },
                { key: 'isProductive', header: 'Productivity', render: (a: any) => <Badge variant={a.isProductive ? 'default' : 'outline'} className={`text-xs ${a.isProductive ? 'bg-emerald-100 text-emerald-800' : ''}`}>{a.isProductive ? 'Productive' : 'Non-Productive'}</Badge> },
              ]}
              data={accounts}
              rowKey={(a) => a.id || a.accountNumber}
              emptyMessage="No accounts mapped to you yet"
              mobileActions={(a) => (
                <Link to={`/tasks/new?accountNumber=${a.accountNumber}`} className="block w-full">
                  <Button variant="outline" size="sm" className="w-full text-xs">Add Task</Button>
                </Link>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}