import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { dashboardAPI } from '@/lib/api';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, CalendarDays, CheckCircle2, ChevronDown, ChevronUp, Clock,
  Filter, Printer, RefreshCw, Target, TrendingDown, TrendingUp, Users, Wallet, X,
} from 'lucide-react';

const DEFAULT_KPI_GROUPS = [
  { key: 'Deposit_Mobilization', name: 'Deposit Mobilization' },
  { key: 'New_Account_Opening', name: 'New Account Opening' },
  { key: 'New_Member_Registration', name: 'New Member Registration' },
  { key: 'Share_Capital_Growth', name: 'Share Capital Growth' },
  { key: 'Account_Productivity', name: 'Account Productivity' },
  { key: 'Mobile_Banking_Users', name: 'Mobile Banking Users' },
  { key: 'Merchant_POS_Growth', name: 'Merchant POS Growth' },
  { key: 'Billers_Recruitment', name: 'Billers Recruitment' },
  { key: 'Collection_Rate', name: 'Collection Rate' },
  { key: 'Portfolio_Quality', name: 'Portfolio Quality' },
];

const localToday = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const parseList = (value: string | null) => (value ? value.split(',').map(v => v.trim()).filter(Boolean) : []);

type Filters = {
  asOfDate: string;
  period: string;
  kpiGroups: string[];
  comparison: string;
  trendDays: number;
  branchIds: string[];
  staffIds: string[];
  products: string[];
  search: string;
};

const DEFAULT_FILTERS: Filters = {
  asOfDate: localToday(),
  period: 'FY-2026-27',
  kpiGroups: [],
  comparison: 'yesterday',
  trendDays: 14,
  branchIds: [],
  staffIds: [],
  products: [],
  search: '',
};

const filtersFromParams = (params: URLSearchParams): Filters => ({
  asOfDate: params.get('asOfDate') || DEFAULT_FILTERS.asOfDate,
  period: params.get('period') || DEFAULT_FILTERS.period,
  kpiGroups: parseList(params.get('kpiGroups')),
  comparison: params.get('comparison') || DEFAULT_FILTERS.comparison,
  trendDays: Number(params.get('trendDays')) || DEFAULT_FILTERS.trendDays,
  branchIds: parseList(params.get('branchIds')),
  staffIds: parseList(params.get('staffIds')),
  products: parseList(params.get('products')),
  search: params.get('search') || '',
});

const fmtMoney = (value: number | null | undefined) =>
  value === null || value === undefined ? '—' : `ETB ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtCount = (value: number | null | undefined) =>
  value === null || value === undefined ? '—' : Number(value).toLocaleString();
const fmtPct = (value: number | null | undefined) =>
  value === null || value === undefined ? '—' : `${Number(value).toFixed(1)}%`;
const fmtDelta = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  return `${n > 0 ? '+' : ''}${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};
const statusClass = (status: string) => {
  if (status === 'Ahead') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'On Track') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (status === 'Behind') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'No Plan') return 'bg-slate-100 text-slate-500 border-slate-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
};
const statusColor = (status: string) => {
  if (status === 'Ahead') return '#059669';
  if (status === 'On Track') return '#171a6b';
  if (status === 'Behind') return '#d97706';
  return '#94a3b8';
};

function Section({ title, subtitle, defaultOpen = true, right, children }: {
  title: string; subtitle?: string; defaultOpen?: boolean; right?: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="border border-line shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
        <button className="flex items-center gap-2 text-left min-w-0" onClick={() => setOpen(v => !v)}>
          {open ? <ChevronUp className="h-4 w-4 text-stone shrink-0" /> : <ChevronDown className="h-4 w-4 text-stone shrink-0" />}
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-800">{title}</span>
            {subtitle && <span className="block text-[11px] text-stone truncate">{subtitle}</span>}
          </span>
        </button>
        {right}
      </div>
      {open && <CardContent className="p-4">{children}</CardContent>}
    </Card>
  );
}

function RadialGauge({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value || 0));
  const radius = 54;
  const circumference = Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[150px] h-[85px] flex items-end justify-center">
        <svg viewBox="0 0 140 80" className="w-full h-full">
          <path d="M 15 75 A 55 55 0 0 1 125 75" fill="none" stroke="#eef0ff" strokeWidth="13" strokeLinecap="round" />
          <path d="M 15 75 A 55 55 0 0 1 125 75" fill="none" stroke="#ed8722" strokeWidth="13" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-700" />
        </svg>
        <div className="absolute bottom-0 text-center">
          <span className="text-2xl font-extrabold text-primary-900">{pct.toFixed(0)}%</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone">of plan</span>
    </div>
  );
}

function SummaryCard({ label, value, sub, icon: Icon, tone = 'navy', progress }: {
  label: string; value: string; sub?: React.ReactNode; icon: React.ElementType; tone?: 'navy' | 'orange' | 'green' | 'red'; progress?: number;
}) {
  const toneClass = tone === 'orange' ? 'text-accent-600 bg-accent-50' : tone === 'green' ? 'text-emerald-600 bg-emerald-50' : tone === 'red' ? 'text-rose-600 bg-rose-50' : 'text-primary-800 bg-primary-50';
  const barClass = tone === 'orange' ? 'bg-accent' : tone === 'green' ? 'bg-emerald-500' : tone === 'red' ? 'bg-rose-500' : 'bg-primary-800';
  return (
    <Card className="border border-line shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-stone">{label}</p>
            <p className="mt-1 text-xl font-extrabold text-slate-900 leading-tight break-words">{value}</p>
            {sub && <p className="mt-1 text-[11px] text-stone">{sub}</p>}
          </div>
          <span className={`p-2 rounded-md shrink-0 ${toneClass}`}><Icon className="h-4 w-4" /></span>
        </div>
        {progress !== undefined && (
          <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${barClass}`} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CheckboxList({ options, selected, onToggle, empty }: {
  options: { id: string; name: string }[]; selected: string[]; onToggle: (id: string) => void; empty: string;
}) {
  if (!options.length) return <p className="text-xs text-stone">{empty}</p>;
  return (
    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
      {options.map(option => (
        <label key={option.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input type="checkbox" checked={selected.includes(option.id)} onChange={() => onToggle(option.id)} className="accent-primary-800" />
          <span className="truncate">{option.name}</span>
        </label>
      ))}
    </div>
  );
}

export function DailyStandingDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() => filtersFromParams(searchParams));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const filtersRef = useRef(filters);
  const requestIdRef = useRef(0);

  useEffect(() => { filtersRef.current = filters; }, [filters]);

  const fetchData = useCallback(async (silent = false) => {
    const requestId = ++requestIdRef.current;
    if (!silent) {
      if (data) setRefreshing(true);
      else setLoading(true);
    }
    setError('');
    try {
      const response = await dashboardAPI.getDailyStanding(filtersRef.current);
      if (requestId !== requestIdRef.current) return;
      if (response.success) {
        setData(response.data);
        setLastUpdated(new Date());
      }
    } catch (err: any) {
      if (requestId !== requestIdRef.current) return;
      setError(err.message || 'Could not load the daily standing');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [data]);

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), 300);
    return () => clearTimeout(timer);
  }, [filters, fetchData]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) fetchData(true);
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams();
      if (filters.asOfDate !== DEFAULT_FILTERS.asOfDate) next.set('asOfDate', filters.asOfDate);
      if (filters.period !== DEFAULT_FILTERS.period) next.set('period', filters.period);
      if (filters.kpiGroups.length) next.set('kpiGroups', filters.kpiGroups.join(','));
      if (filters.comparison !== DEFAULT_FILTERS.comparison) next.set('comparison', filters.comparison);
      if (filters.trendDays !== DEFAULT_FILTERS.trendDays) next.set('trendDays', String(filters.trendDays));
      if (filters.branchIds.length) next.set('branchIds', filters.branchIds.join(','));
      if (filters.staffIds.length) next.set('staffIds', filters.staffIds.join(','));
      if (filters.products.length) next.set('products', filters.products.join(','));
      if (filters.search) next.set('search', filters.search);
      setSearchParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, setSearchParams]);

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters(prev => ({ ...prev, [key]: value }));

  const toggleArray = (key: 'branchIds' | 'staffIds' | 'products', id: string) => {
    setFilters(prev => {
      const current = prev[key];
      return { ...prev, [key]: current.includes(id) ? current.filter(v => v !== id) : [...current, id] };
    });
  };

  const allKpiSelected = filters.kpiGroups.length === 0;
  const kpiOptions = data?.filterOptions?.kpiGroups?.length ? data.filterOptions.kpiGroups : DEFAULT_KPI_GROUPS;
  const toggleKpi = (key: string) => {
    if (allKpiSelected) {
      updateFilter('kpiGroups', [key]);
      return;
    }
    const next = filters.kpiGroups.includes(key)
      ? filters.kpiGroups.filter(k => k !== key)
      : [...filters.kpiGroups, key];
    updateFilter('kpiGroups', next.length ? next : []);
  };

  const branches = data?.filterOptions?.branches || [];
  const staff = data?.filterOptions?.staff || [];
  const products = data?.filterOptions?.products || [];
  const periods = data?.filterOptions?.periods?.length ? data.filterOptions.periods : [filters.period];

  const groups = data?.groups || [];
  const summary = data?.summary || {};
  const deposit = summary.deposit || {};
  const newAccounts = summary.newAccounts || {};
  const activeStaff = summary.activeStaff || { submitted: 0, total: 0 };
  const pipeline = summary.pipeline || {};
  const freshness = data?.freshness || {};
  const trend = data?.trend || [];
  const rankings = data?.rankings || [];
  const recentTasks = data?.recentTasks || [];

  const activeGroups = useMemo(() => groups.filter((g: any) => g.planTarget > 0 || g.current > 0 || g.newAccountsToday > 0), [groups]);
  const achievementData = useMemo(() =>
    activeGroups.filter((g: any) => g.planTarget > 0).map((g: any) => ({ name: g.name, pct: Math.min(100, g.planPct || 0), status: g.status })), [activeGroups]);
  const trendData = useMemo(() => trend.map((t: any) => ({ ...t, label: t.date?.slice(5) })), [trend]);
  const rankingData = useMemo(() => rankings.slice(0, 8).map((r: any) => ({ name: r.name, pct: Math.min(100, r.planPct || 0), growth: r.growth || 0 })), [rankings]);
  const pipelineItems = [
    { label: 'Draft', value: pipeline.Draft || 0, color: 'bg-slate-400' },
    { label: 'Pending', value: pipeline.Pending || 0, color: 'bg-amber-500' },
    { label: 'Approved', value: pipeline.Approved || 0, color: 'bg-emerald-500' },
    { label: 'CBS validated', value: pipeline.CBSValidated || 0, color: 'bg-primary-800' },
    { label: 'Rejected', value: pipeline.Rejected || 0, color: 'bg-rose-500' },
  ];

  const activeFilterCount = filters.branchIds.length + filters.staffIds.length + filters.products.length + (filters.search ? 1 : 0);
  const updatedLabel = lastUpdated
    ? `Updated ${Math.max(0, Math.floor((now - lastUpdated.getTime()) / 60000))}m ago`
    : 'Not updated yet';

  const clearAdvanced = () => setFilters(prev => ({ ...prev, branchIds: [], staffIds: [], products: [], search: '' }));
  const resetAll = () => setFilters({ ...DEFAULT_FILTERS, asOfDate: localToday() });

  if (loading && !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-b-2 border-primary-900" />
          <p className="text-sm font-medium text-stone">Loading daily standing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-primary-900">Daily Cycle Standing</h1>
          <p className="text-xs text-stone mt-1">
            {data?.period || filters.period} · Day {data?.cycleDay || 1} of {data?.cycleDays || 365} · As of {filters.asOfDate}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-stone">{updatedLabel}</span>
          <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={refreshing}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border border-line shadow-sm">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-stone">
              <span className="block mb-1">As of</span>
              <input type="date" value={filters.asOfDate} max={localToday()} onChange={e => updateFilter('asOfDate', e.target.value)}
                className="border border-line bg-white px-2 py-1.5 text-xs text-slate-800 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20" />
            </label>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-stone">
              <span className="block mb-1">Period</span>
              <select value={filters.period} onChange={e => updateFilter('period', e.target.value)}
                className="border border-line bg-white px-2 py-1.5 text-xs text-slate-800 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20">
                {periods.map((p: string) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-stone">
              <span className="block mb-1">Compare</span>
              <select value={filters.comparison} onChange={e => updateFilter('comparison', e.target.value)}
                className="border border-line bg-white px-2 py-1.5 text-xs text-slate-800 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20">
                <option value="yesterday">Yesterday</option>
                <option value="previous_week">Same day last week</option>
                <option value="month_start">Month start</option>
              </select>
            </label>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-stone">
              <span className="block mb-1">Trend</span>
              <select value={filters.trendDays} onChange={e => updateFilter('trendDays', Number(e.target.value))}
                className="border border-line bg-white px-2 py-1.5 text-xs text-slate-800 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20">
                {[7, 14, 30, 90].map(d => <option key={d} value={d}>{d} days</option>)}
              </select>
            </label>
            <Button variant={advancedOpen ? 'default' : 'outline'} size="sm" onClick={() => setAdvancedOpen(v => !v)}>
              <Filter className="h-3.5 w-3.5 mr-1.5" /> Filters {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </Button>
            <Button variant="ghost" size="sm" onClick={resetAll}>Reset</Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => updateFilter('kpiGroups', [])}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-sm border ${allKpiSelected ? 'bg-primary-900 text-white border-primary-900' : 'bg-white text-stone border-line hover:bg-ivory'}`}>
              All KPI groups
            </button>
            {kpiOptions.map((k: any) => {
              const active = allKpiSelected || filters.kpiGroups.includes(k.key);
              return (
                <button key={k.key} type="button" onClick={() => toggleKpi(k.key)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-sm border ${active ? 'bg-accent text-white border-accent' : 'bg-white text-stone border-line hover:bg-ivory'}`}>
                  {k.name}
                </button>
              );
            })}
          </div>

          {advancedOpen && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-line pt-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-stone mb-2">Branches</p>
                <CheckboxList options={branches.map((b: any) => ({ id: b.id, name: `${b.name} (${b.code})` }))} selected={filters.branchIds} onToggle={id => toggleArray('branchIds', id)} empty="No branches available" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-stone mb-2">Staff</p>
                <CheckboxList options={staff.map((s: any) => ({ id: s.id, name: s.name }))} selected={filters.staffIds} onToggle={id => toggleArray('staffIds', id)} empty="No staff available" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-stone mb-2">Products</p>
                <CheckboxList options={products.map((p: string) => ({ id: p, name: p }))} selected={filters.products} onToggle={id => toggleArray('products', id)} empty="No product data" />
                <label className="block mt-3 text-[10px] font-semibold uppercase tracking-wider text-stone">
                  Search branch or staff
                  <input value={filters.search} onChange={e => updateFilter('search', e.target.value)} placeholder="Type a name..."
                    className="mt-1 w-full border border-line bg-white px-2 py-1.5 text-xs text-slate-800 rounded-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20" />
                </label>
              </div>
              {activeFilterCount > 0 && (
                <div className="md:col-span-3 flex flex-wrap items-center gap-1.5">
                  {filters.branchIds.map(id => {
                    const b = branches.find((x: any) => x.id === id);
                    return <span key={id} className="inline-flex items-center gap-1 bg-primary-50 text-primary-800 border border-primary-100 px-2 py-1 text-[11px]">{b?.name || id}<button onClick={() => toggleArray('branchIds', id)}><X className="h-3 w-3" /></button></span>;
                  })}
                  {filters.staffIds.map(id => {
                    const s = staff.find((x: any) => x.id === id);
                    return <span key={id} className="inline-flex items-center gap-1 bg-primary-50 text-primary-800 border border-primary-100 px-2 py-1 text-[11px]">{s?.name || id}<button onClick={() => toggleArray('staffIds', id)}><X className="h-3 w-3" /></button></span>;
                  })}
                  {filters.products.map(id => (
                    <span key={id} className="inline-flex items-center gap-1 bg-primary-50 text-primary-800 border border-primary-100 px-2 py-1 text-[11px]">{id}<button onClick={() => toggleArray('products', id)}><X className="h-3 w-3" /></button></span>
                  ))}
                  {filters.search && <span className="inline-flex items-center gap-1 bg-primary-50 text-primary-800 border border-primary-100 px-2 py-1 text-[11px]">“{filters.search}”<button onClick={() => updateFilter('search', '')}><X className="h-3 w-3" /></button></span>}
                  <button onClick={clearAdvanced} className="text-[11px] font-semibold text-accent-700 underline ml-1">Clear advanced</button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-center gap-2 border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
        {!freshness.yesterdaySnapshotAvailable && (
          <div className="flex items-start gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <Clock className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Yesterday snapshot pending. The comparison will appear after the first nightly snapshot.</span>
          </div>
        )}
        {pipeline.Pending > 0 && (
          <div className="flex items-start gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{pipeline.Pending} task(s) pending approval.</span>
          </div>
        )}
        {activeStaff.total > activeStaff.submitted && (
          <div className="flex items-start gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <Users className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{activeStaff.total - activeStaff.submitted} staff member(s) have not submitted today.</span>
          </div>
        )}
        {freshness.lastCbsUpload && (
          <div className="flex items-start gap-2 border border-line bg-white px-3 py-2 text-xs text-stone">
            <CalendarDays className="h-4 w-4 shrink-0 mt-0.5 text-primary-800" />
            <span>Last CBS upload: {new Date(freshness.lastCbsUpload).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <SummaryCard label="Deposit balance" value={fmtMoney(deposit.current)} sub={`June ${fmtMoney(deposit.june)}`} icon={Wallet} progress={deposit.planPct} />
        <SummaryCard label="Growth vs June" value={fmtMoney(deposit.growth)} sub={`${fmtPct(deposit.planPct)} of plan`} icon={TrendingUp} tone="green" />
        <SummaryCard label="Plan achieved" value={`${Math.min(100, Number(deposit.planPct) || 0).toFixed(0)}%`} sub={`${fmtPct(deposit.planPct)} of target · ${data?.cycleDay || 1}/${data?.cycleDays || 365} days`} icon={Target} progress={deposit.planPct} />
        <SummaryCard label={filters.comparison === 'yesterday' ? 'Yesterday → today' : 'Comparison change'} value={deposit.dayChange === null || deposit.dayChange === undefined ? 'Pending' : fmtDelta(deposit.dayChange)} sub={deposit.yesterday === null ? 'No snapshot yet' : `From ${fmtMoney(deposit.yesterday)}`} icon={(deposit.dayChange || 0) < 0 ? TrendingDown : TrendingUp} tone={(deposit.dayChange || 0) < 0 ? 'red' : 'green'} />
        <SummaryCard label="New accounts today" value={fmtCount(newAccounts.today)} sub={`Yesterday ${fmtCount(newAccounts.yesterday)} · Target ${fmtCount(newAccounts.dailyTarget)}`} icon={Users} tone="orange" />
        <SummaryCard label="Active staff" value={`${fmtCount(activeStaff.submitted)} / ${fmtCount(activeStaff.total)}`} sub="Submitted today" icon={CheckCircle2} progress={activeStaff.total ? (activeStaff.submitted / activeStaff.total) * 100 : 0} />
      </div>

      {/* Plan + gauge */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Section title="Plan achievement by KPI group" subtitle="Cycle-to-date progress against plan" right={<Badge variant="outline">{achievementData.length} groups</Badge>}>
          {achievementData.length ? (
            <div className="space-y-3 py-1">
              {achievementData.slice(0, 7).map((entry: any) => (
                <div key={entry.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700 truncate pr-2">{entry.name}</span>
                    <span className="font-bold text-slate-900 shrink-0">{entry.pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${entry.pct}%`, backgroundColor: statusColor(entry.status) }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-stone">No plan targets match the current filters.</p>}
        </Section>

        <Section title="Cycle progress" subtitle="Deposit plan achievement">
          <div className="flex flex-col items-center justify-center h-[280px] gap-4">
            <RadialGauge value={deposit.planPct || 0} />
            <div className="grid grid-cols-2 gap-3 w-full text-center">
              <div className="bg-ivory p-2">
                <p className="text-[10px] uppercase tracking-wider text-stone">Days left</p>
                <p className="text-lg font-extrabold text-primary-900">{Math.max(0, (data?.cycleDays || 365) - (data?.cycleDay || 1))}</p>
              </div>
              <div className="bg-ivory p-2">
                <p className="text-[10px] uppercase tracking-wider text-stone">Growth</p>
                <p className="text-lg font-extrabold text-primary-900">{fmtMoney(deposit.growth)}</p>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Approval pipeline" subtitle="Daily task workflow">
          <div className="space-y-3 py-2">
            {pipelineItems.map(item => {
              const total = pipelineItems.reduce((s, i) => s + i.value, 0) || 1;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-700">{item.label}</span>
                    <span className="font-bold text-slate-900">{item.value}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color}`} style={{ width: `${(item.value / total) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      {/* Comparison table */}
      <Section title="KPI group standing" subtitle="Plan · June baseline · Yesterday · Today" right={<Badge variant="outline">{groups.length} groups</Badge>} defaultOpen>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-primary-900 text-white">
                <th className="text-left px-3 py-2 font-semibold">KPI group</th>
                <th className="text-right px-3 py-2 font-semibold">June</th>
                <th className="text-right px-3 py-2 font-semibold">Yesterday</th>
                <th className="text-right px-3 py-2 font-semibold">Today / current</th>
                <th className="text-right px-3 py-2 font-semibold">Day Δ</th>
                <th className="text-right px-3 py-2 font-semibold">Growth</th>
                <th className="text-right px-3 py-2 font-semibold">Plan</th>
                <th className="text-right px-3 py-2 font-semibold">% achieved</th>
                <th className="text-right px-3 py-2 font-semibold">Today %</th>
                <th className="text-right px-3 py-2 font-semibold">New accounts</th>
                <th className="text-center px-3 py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groups.map((g: any) => (
                <tr key={g.key} className="hover:bg-ivory/60">
                  <td className="px-3 py-2 font-medium text-slate-800">{g.name}</td>
                  <td className="px-3 py-2 text-right text-stone">{g.june === null ? '—' : fmtMoney(g.june)}</td>
                  <td className="px-3 py-2 text-right text-stone">{g.yesterday === null ? 'Pending' : (g.unit === 'ETB' ? fmtMoney(g.yesterday) : fmtCount(g.yesterday))}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">{g.unit === 'ETB' ? fmtMoney(g.current) : fmtCount(g.current)}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${g.dayChange === null ? 'text-stone' : g.dayChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{g.dayChange === null ? '—' : (g.unit === 'ETB' ? fmtDelta(g.dayChange) : fmtDelta(g.dayChange))}</td>
                  <td className="px-3 py-2 text-right text-stone">{g.unit === 'ETB' ? fmtMoney(g.growth) : fmtCount(g.growth)}</td>
                  <td className="px-3 py-2 text-right text-stone">{g.unit === 'ETB' ? fmtMoney(g.planTarget) : fmtCount(g.planTarget)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-primary-900">{fmtPct(g.planPct)}</td>
                  <td className="px-3 py-2 text-right text-stone">{fmtPct(g.todayPct)}</td>
                  <td className="px-3 py-2 text-right text-stone">{g.newAccountsToday === null ? '—' : fmtCount(g.newAccountsToday)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`inline-block border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${statusClass(g.status)}`}>{g.status}</span>
                  </td>
                </tr>
              ))}
              {!groups.length && <tr><td colSpan={11} className="px-3 py-8 text-center text-stone">No KPI groups match the filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Trend */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Section title="Deposit trend" subtitle={`Last ${filters.trendDays} days`}>
          {trendData.some((t: any) => t.deposit !== null) ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="depositFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#171a6b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#171a6b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0ff" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#7a7a74' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#7a7a74' }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} width={46} />
                  <Tooltip formatter={(v: any) => [fmtMoney(v), 'Deposit']} />
                  <Area type="monotone" dataKey="deposit" stroke="#171a6b" strokeWidth={2} fill="url(#depositFill)" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-stone">No snapshot history yet. The trend will appear after the first nightly snapshot.</p>}
        </Section>

        <Section title="New account openings" subtitle={`Last ${filters.trendDays} days`}>
          {trendData.some((t: any) => t.newAccounts !== null) ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0ff" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#7a7a74' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#7a7a74' }} width={32} />
                  <Tooltip formatter={(v: any) => [fmtCount(v), 'New accounts']} />
                  <Bar dataKey="newAccounts" fill="#ed8722" radius={[3, 3, 0, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-stone">No new-account snapshot data yet.</p>}
        </Section>
      </div>

      {/* Ranking + recent */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Section title={data?.scope === 'hq' || data?.scope === 'area' ? 'Branch ranking' : 'Staff ranking'} subtitle="Deposit growth vs plan">
          {rankingData.length ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankingData} layout="vertical" margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef0ff" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#7a7a74' }} unit="%" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: '#565656' }} />
                  <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'Plan achieved']} />
                  <Bar dataKey="pct" fill="#171a6b" radius={[0, 3, 3, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-stone">No ranking data for the current filters.</p>}
        </Section>

        <Section title="Recent activity" subtitle="Latest daily tasks">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-stone border-b border-line">
                  <th className="py-2 pr-3">Staff</th>
                  <th className="py-2 pr-3">Branch</th>
                  <th className="py-2 pr-3">Task</th>
                  <th className="py-2 pr-3 text-right">Amount</th>
                  <th className="py-2 pr-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTasks.map((task: any) => (
                  <tr key={task.id}>
                    <td className="py-2 pr-3 font-medium text-slate-800 truncate max-w-[140px]">{task.staff}</td>
                    <td className="py-2 pr-3 text-stone">{task.branch}</td>
                    <td className="py-2 pr-3 text-stone">{String(task.taskType).replace(/_/g, ' ')}</td>
                    <td className="py-2 pr-3 text-right text-slate-800">{fmtMoney(task.amount)}</td>
                    <td className="py-2 pr-3 text-center">
                      <span className={`inline-block border px-2 py-0.5 text-[10px] font-semibold ${task.approvalStatus === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : task.approvalStatus === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {task.approvalStatus}
                      </span>
                    </td>
                  </tr>
                ))}
                {!recentTasks.length && <tr><td colSpan={5} className="py-6 text-center text-stone">No recent activity.</td></tr>}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <p className="text-[10px] text-stone text-center pb-2">
        Auto-refreshes every 5 minutes · Snapshot {freshness.lastSnapshot ? new Date(freshness.lastSnapshot).toLocaleDateString() : 'pending'} · CBS {freshness.lastCbsUpload ? new Date(freshness.lastCbsUpload).toLocaleString() : 'no upload yet'}
      </p>
    </div>
  );
}
