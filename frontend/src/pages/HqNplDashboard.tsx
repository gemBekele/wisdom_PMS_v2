import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ResponsiveTable from '@/components/ui/responsive-table';
import { nplAPI } from '@/lib/api';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, DollarSign, Building2 } from 'lucide-react';

const parColor = (val: number) => {
  if (val < 5) return 'text-emerald-600 bg-emerald-50';
  if (val < 10) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
};

const parBadge = (val: number) => {
  if (val < 5) return 'default';
  if (val < 10) return 'warning';
  return 'destructive';
};

export function HqNplDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await nplAPI.getHq();
      if (res.success) setData(res.data);
    } catch (e) {
      console.error('Failed to load HQ NPL data', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading NPL data...</div>;
  if (!data) return <div className="text-center py-8 text-red-500">Failed to load NPL data</div>;

  const { companySummary, branches, areaSummary, trendData } = data;

  const trendIcon = (val: number) => {
    if (val > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (val < 0) return <TrendingDown className="h-4 w-4 text-emerald-500" />;
    return <Minus className="h-4 w-4 text-slate-400" />;
  };

  const formatBirr = (v: number) => (v || 0).toLocaleString('en-US', { minimumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Portfolio at Risk — Company Overview</h1>
          <p className="text-slate-600 mt-1">Regulatory NPL monitoring across all branches</p>
        </div>
        <button onClick={loadData} className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-md">
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Total Loan Portfolio</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-slate-400" />
              <span className="text-2xl font-bold">{formatBirr(companySummary?.totalPortfolio)}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Birr</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">PAR 90 (NPL Ratio)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className={`text-2xl font-bold ${parColor(companySummary?.par90Ratio).split(' ')[0]}`}>
                {companySummary?.par90Ratio?.toFixed(2)}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{companySummary?.par90Count || 0} loans in default</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">PAR 30</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span className={`text-2xl font-bold ${parColor(companySummary?.par30Ratio).split(' ')[0]}`}>
                {companySummary?.par30Ratio?.toFixed(2)}%
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">PAR 1</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span className={`text-2xl font-bold ${parColor(companySummary?.par1Ratio).split(' ')[0]}`}>
                {companySummary?.par1Ratio?.toFixed(2)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branch NPL Ranking */}
      <Card>
        <CardHeader>
          <CardTitle>Branch NPL Ranking</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="table-scroll px-3 sm:px-0">
            <ResponsiveTable
              columns={[
                {
                  key: 'branch',
                  header: 'Branch',
                  primary: true,
                  render: (b: any) => (
                    <span className="font-medium text-slate-800">
                      {b._rank}. {b.branchName}
                    </span>
                  ),
                },
                {
                  key: 'area',
                  header: 'Area',
                  render: (b: any) => <span className="text-slate-600">{b.area}</span>,
                },
                {
                  key: 'totalPortfolio',
                  header: 'Portfolio',
                  className: 'text-right',
                  render: (b: any) => <span className="font-mono text-xs">{formatBirr(b.totalPortfolio)}</span>,
                },
                {
                  key: 'par1Ratio',
                  header: 'PAR 1',
                  className: 'text-right',
                  render: (b: any) => <span className={`font-mono text-xs ${parColor(b.par1Ratio)}`}>{b.par1Ratio?.toFixed(1)}%</span>,
                },
                {
                  key: 'par30Ratio',
                  header: 'PAR 30',
                  className: 'text-right',
                  render: (b: any) => <span className={`font-mono text-xs ${parColor(b.par30Ratio)}`}>{b.par30Ratio?.toFixed(1)}%</span>,
                },
                {
                  key: 'par90Ratio',
                  header: 'PAR 90',
                  className: 'text-right',
                  render: (b: any) => <span className={`font-mono text-xs ${parColor(b.par90Ratio)}`}>{b.par90Ratio?.toFixed(1)}%</span>,
                },
                {
                  key: 'status',
                  header: 'Status',
                  className: 'text-center',
                  render: (b: any) => (
                    <Badge variant={parBadge(b.par90Ratio)} className="text-xs">
                      {b.par90Ratio < 5 ? 'Good' : b.par90Ratio < 10 ? 'Watch' : 'Critical'}
                    </Badge>
                  ),
                },
              ]}
              data={branches?.map((b: any, i: number) => ({ ...b, _rank: i + 1 })) || []}
              rowKey={(b: any) => b.branchId}
            />
          </div>
        </CardContent>
      </Card>

      {/* Area Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {areaSummary?.map((a: any) => (
          <Card key={a.area}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-slate-400" />
                {a.area}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Portfolio</p>
                  <p className="text-lg font-bold">{formatBirr(a.totalPortfolio)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">PAR 90</p>
                  <p className={`text-lg font-bold ${parColor(a.par90Ratio)}`}>{a.par90Ratio?.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Branches</p>
                  <p className="text-lg font-bold">{a.branches}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Defaulted Loans</p>
                  <p className="text-lg font-bold">{a.par90Count || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trend Data */}
      {trendData?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>NPL Trend (90 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="table-scroll px-3 sm:px-0">
              <ResponsiveTable
                columns={[
                  {
                    key: 'date',
                    header: 'Date',
                    primary: true,
                    render: (d: any) => <span className="text-slate-800">{new Date(d.date).toLocaleDateString()}</span>,
                  },
                  {
                    key: 'par1Ratio',
                    header: 'PAR 1',
                    className: 'text-right',
                    render: (d: any) => <span className="font-mono text-xs">{d.par1Ratio?.toFixed(1)}%</span>,
                  },
                  {
                    key: 'par30Ratio',
                    header: 'PAR 30',
                    className: 'text-right',
                    render: (d: any) => <span className="font-mono text-xs">{d.par30Ratio?.toFixed(1)}%</span>,
                  },
                  {
                    key: 'par90Ratio',
                    header: 'PAR 90',
                    className: 'text-right',
                    render: (d: any) => <span className="font-mono text-xs">{d.par90Ratio?.toFixed(1)}%</span>,
                  },
                  {
                    key: 'trend',
                    header: 'Trend',
                    className: 'text-center',
                    render: (d: any) => {
                      const change = d._change;
                      return (
                        <div className="flex items-center justify-center gap-1">
                          {trendIcon(change)}
                          <span className={`text-xs ${change > 0 ? 'text-red-600' : change < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {change > 0 ? '+' : ''}{change?.toFixed(2)}%
                          </span>
                        </div>
                      );
                    },
                  },
                ]}
                data={trendData.slice(-30).map((d: any, i: number) => {
                  const prev = trendData[Math.max(0, i - 1)];
                  return { ...d, _change: prev ? d.par90Ratio - prev.par90Ratio : 0 };
                })}
                rowKey={(d: any) => d.date}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
