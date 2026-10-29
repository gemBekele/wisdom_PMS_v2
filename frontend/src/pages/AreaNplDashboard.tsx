import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { nplAPI } from '@/lib/api';
import { Building2, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const parColor = (val: number) => {
  if (val < 5) return 'text-emerald-600';
  if (val < 10) return 'text-amber-600';
  return 'text-red-600';
};

const parBadge = (val: number) => {
  if (val < 5) return 'default';
  if (val < 10) return 'warning';
  return 'destructive';
};

export function AreaNplDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await nplAPI.getArea();
      if (res.success) setData(res.data);
    } catch (e) {
      console.error('Failed to load area NPL', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading area NPL data...</div>;
  if (!data) return <div className="text-center py-8 text-red-500">Failed to load NPL data</div>;

  const { branches, areaSummary, trendData } = data;
  const maxPar90 = Math.max(...branches.map((b: any) => b.par90Ratio), 1);

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
          <h1 className="text-3xl font-bold text-slate-800">Area Portfolio at Risk</h1>
          <p className="text-slate-600 mt-1">NPL comparison across branches in your area</p>
        </div>
        <button onClick={loadData} className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-md">
          Refresh
        </button>
      </div>

      {/* Area Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Total Portfolio</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBirr(areaSummary?.totalPortfolio)}</div>
            <p className="text-xs text-slate-500 mt-1">Across {branches?.length} branches</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Area PAR 90</CardTitle></CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${parColor(areaSummary?.par90Ratio)}`}>
              {areaSummary?.par90Ratio?.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-600">Total PAR 90 Amount</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatBirr(areaSummary?.par90Amount)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Branch Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Branch NPL Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {branches?.sort((a: any, b: any) => b.par90Ratio - a.par90Ratio).map((b: any) => (
              <div key={b.branchId} className="space-y-2 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold text-slate-800">{b.branchName}</span>
                  </div>
                  <Badge variant={parBadge(b.par90Ratio)} className="text-xs">
                    PAR 90: {b.par90Ratio?.toFixed(1)}%
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Portfolio</p>
                    <p className="font-mono font-semibold">{formatBirr(b.totalPortfolio)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">PAR 1</p>
                    <p className={`font-mono font-semibold ${parColor(b.par1Ratio)}`}>{b.par1Ratio?.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Defaulted Loans</p>
                    <p className="font-mono font-semibold">{b.par90Count || 0}</p>
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="text-slate-400">PAR 1: {b.par1Ratio?.toFixed(1)}%</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-400">PAR 30: {b.par30Ratio?.toFixed(1)}%</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-400">Total Loans: {b.totalLoans}</span>
                </div>
                <Progress value={maxPar90 > 0 ? (b.par90Ratio / maxPar90) * 100 : 0}
                  className={`h-1.5 ${b.par90Ratio >= 10 ? 'bg-red-100' : b.par90Ratio >= 5 ? 'bg-amber-100' : 'bg-emerald-100'}`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trend */}
      {trendData?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>PAR 90 Trend (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trendData.slice(-20).map((d: any, i: number) => {
                const prev = trendData[Math.max(0, i - 1)];
                const change = prev ? d.par90Ratio - prev.par90Ratio : 0;
                return (
                  <div key={d.date} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                    <span className="text-slate-600">{new Date(d.date).toLocaleDateString()}</span>
                    <div className="flex items-center gap-3">
                      <span className={`font-mono font-semibold ${parColor(d.par90Ratio)}`}>
                        {d.par90Ratio?.toFixed(2)}%
                      </span>
                      <div className="flex items-center gap-1 w-20">
                        {trendIcon(change)}
                        <span className={`text-xs ${change > 0 ? 'text-red-600' : change < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {change > 0 ? '+' : ''}{change?.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
