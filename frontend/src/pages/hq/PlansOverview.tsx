import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ResponsiveTable from '@/components/ui/responsive-table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { plansAPI, staffPlansAPI } from '@/lib/api';
import { useConfig } from '@/contexts/ConfigContext';
import { Target, Users, TrendingUp, Building2 } from 'lucide-react';

const KPI_COLORS: Record<string, string> = {
  'Account Productivity': '#10b981',
  'Deposit Mobilization': '#3b82f6',
  'New Member Registration': '#8b5cf6',
  'New Account Opening': '#06b6d4',
  'Share Capital Growth': '#f59e0b',
  'Mobile Banking Users': '#6366f1',
  'Merchant POS Growth': '#ef4444',
  'Billers Recruitment': '#f97316',
  'Internal Operations': '#6b7280',
  'Loan Saving Deposit': '#059669',
  'Michu Current Saving': '#2563eb',
  'Gihon Regular Saving': '#7c3aed',
  'Mothers Saving': '#db2777',
  'Young Womens Saving': '#d946ef',
  'Elders Saving': '#ea580c',
  'Children Saving': '#0d9488',
  'Fixed Time Deposit': '#ca8a04',
  'Premium Saving Deposit': '#dc2626',
  'Special Saving': '#4f46e5',
  'Segment Deposit': '#0891b2',
  'Wadiah IFB Deposit': '#65a30d',
};

export function PlansOverview() {
  const config = useConfig();
  const [plans, setPlans] = useState<any[]>([]);
  const [staffPlans, setStaffPlans] = useState<any[]>([]);
  const [achievementPlans, setAchievementPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(config.periodOptions?.[0] || 'FY-2026-27');

  useEffect(() => {
    loadData();
  }, [selectedPeriod]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansRes, staffRes, achievementRes] = await Promise.all([
        plansAPI.getAll({ period: selectedPeriod }),
        staffPlansAPI.getAll({ period: selectedPeriod }),
        plansAPI.getAchievement({ period: selectedPeriod }),
      ]);
      if (plansRes.success) setPlans(plansRes.data || []);
      if (staffRes.success) setStaffPlans(staffRes.data || []);
      if (achievementRes.success) setAchievementPlans(achievementRes.data || []);
    } catch (error) {
      console.error('Error loading plan data:', error);
    } finally {
      setLoading(false);
    }
  };

  const achievementMap = new Map<string, any>();
  for (const ap of achievementPlans) {
    achievementMap.set(`${ap.branch_code}-${ap.kpi_category}-${ap.product_category || ''}`, ap);
  }

  const totalTarget = plans.reduce((s, p) => s + p.target_value, 0);
  const totalTargetCount = plans.reduce((s, p) => s + (p.target_count || 0), 0);
  const activePlans = plans.filter(p => p.status === 'Active').length;
  const totalStaffPlans = staffPlans.length;
  const totalStaffTarget = staffPlans.reduce((s, p) => s + p.individual_target, 0);

  const targetByBranch = plans.reduce((acc: any[], plan) => {
    const existing = acc.find(a => a.name === plan.branch_code);
    if (existing) {
      existing.value += plan.target_value;
    } else {
      acc.push({ name: plan.branch_code, value: plan.target_value, fill: '#3b82f6' });
    }
    return acc;
  }, []);

  const targetByKPI = plans.reduce((acc: any[], plan) => {
    const label = plan.kpi_category?.replace(/_/g, ' ');
    const existing = acc.find(a => a.name === label);
    if (existing) {
      existing.value += plan.target_value;
      existing.count += plan.target_count || 0;
    } else {
      acc.push({ name: label, value: plan.target_value, count: plan.target_count || 0, fill: KPI_COLORS[label] || '#6b7280' });
    }
    return acc;
  }, []);

  const targetByProduct = plans
    .filter(p => p.product_category)
    .reduce((acc: any[], plan) => {
      const label = plan.product_category;
      const existing = acc.find(a => a.name === label);
      if (existing) {
        existing.amount += plan.target_value;
        existing.count += plan.target_count || 0;
      } else {
        acc.push({ name: label, amount: plan.target_value, count: plan.target_count || 0, fill: KPI_COLORS[label] || '#6b7280' });
      }
      return acc;
    }, []);

  const staffPlanByUser = staffPlans.reduce((acc: any[], sp) => {
    const existing = acc.find(a => a.name === sp.user?.name);
    if (existing) {
      existing.target += sp.individual_target;
      existing.plans += 1;
    } else {
      acc.push({
        name: sp.user?.name || 'Unknown',
        role: sp.position?.replace(/_/g, ' '),
        branch: sp.branch_code,
        target: sp.individual_target,
        plans: 1,
      });
    }
    return acc;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading plan data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Plans Overview</h1>
        <select
          value={selectedPeriod}
          onChange={e => setSelectedPeriod(e.target.value)}
          className="border rounded-md px-3 py-1.5 text-sm"
        >
          {config.periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Plans</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{plans.length}</div>
            <p className="text-xs text-slate-500 mt-1">{activePlans} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Target Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{totalTarget.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">Birr</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Target Accounts</CardTitle>
            <Users className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{totalTargetCount.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">Across all plans</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Staff Plans</CardTitle>
            <Users className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{totalStaffPlans}</div>
            <p className="text-xs text-slate-500 mt-1">Across {staffPlanByUser.length} staff</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Staff Target Total</CardTitle>
            <Building2 className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{totalStaffTarget.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-1">Birr</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Target by Branch</CardTitle>
          </CardHeader>
          <CardContent>
            {targetByBranch.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={targetByBranch} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Bar dataKey="value" name="Target Value" radius={[4, 4, 0, 0]}>
                    {targetByBranch.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill || '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 py-8">No branch data for {selectedPeriod}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Target by Product</CardTitle>
          </CardHeader>
          <CardContent>
            {targetByProduct.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={targetByProduct} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Bar dataKey="amount" name="Target Amount" radius={[4, 4, 0, 0]}>
                    {targetByProduct.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill || '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 py-8">No product data for {selectedPeriod}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Target by KPI Category</CardTitle>
          </CardHeader>
          <CardContent>
            {targetByKPI.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={targetByKPI} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  <Bar dataKey="value" name="Target Value" radius={[4, 4, 0, 0]}>
                    {targetByKPI.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill || '#6b7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 py-8">No KPI data for {selectedPeriod}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Branch Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Branch Plans</CardTitle>
        </CardHeader>
        <CardContent>
          {plans.length > 0 ? (
            <div className="table-scroll px-3 sm:px-0">
              <ResponsiveTable
                columns={[
                  {
                    key: 'branch_code',
                    header: 'Branch',
                    primary: true,
                    render: (plan: any) => <span className="font-medium text-slate-800">{plan.branch_code}</span>,
                  },
                  {
                    key: 'kpi_category',
                    header: 'KPI Category',
                    render: (plan: any) => <span>{plan.kpi_category?.replace(/_/g, ' ')}</span>,
                  },
                  {
                    key: 'product_category',
                    header: 'Product',
                    render: (plan: any) => <span className="text-xs text-slate-500">{plan.product_category || '-'}</span>,
                  },
                  {
                    key: 'target_value',
                    header: 'Target Amount',
                    className: 'text-right',
                    render: (plan: any) => <span className="font-mono text-xs">{plan.target_value?.toLocaleString()}</span>,
                  },
                  {
                    key: 'actual',
                    header: 'Actual',
                    className: 'text-right',
                    render: (plan: any) => {
                      const ach = achievementMap.get(`${plan.branch_code}-${plan.kpi_category}-${plan.product_category || ''}`);
                      return <span className="font-mono text-xs">{(ach?.actual ?? 0).toLocaleString()}</span>;
                    },
                  },
                  {
                    key: 'achievement',
                    header: 'Achievement',
                    className: 'text-right',
                    render: (plan: any) => {
                      const ach = achievementMap.get(`${plan.branch_code}-${plan.kpi_category}-${plan.product_category || ''}`);
                      const pct = ach?.achievementPercent ?? 0;
                      return (
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-full max-w-[100px] bg-slate-100 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {pct}%
                          </span>
                        </div>
                      );
                    },
                  },
                  {
                    key: 'target_count',
                    header: 'Target Count',
                    className: 'text-right',
                    render: (plan: any) => <span className="font-mono text-xs">{(plan.target_count ?? 0).toLocaleString()}</span>,
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    className: 'text-center',
                    render: (plan: any) => (
                      <Badge variant={plan.status === 'Active' ? 'success' : plan.status === 'Draft' ? 'warning' : 'secondary'}>
                        {plan.status}
                      </Badge>
                    ),
                  },
                  {
                    key: 'createdBy',
                    header: 'Created By',
                    render: (plan: any) => <span>{plan.createdBy?.name || 'N/A'}</span>,
                  },
                  {
                    key: 'createdAt',
                    header: 'Created',
                    render: (plan: any) => <span className="text-sm text-slate-500">{new Date(plan.createdAt).toLocaleDateString()}</span>,
                  },
                ]}
                data={plans}
                rowKey={(plan: any) => plan._id || plan.id}
                emptyMessage={`No plans found for ${selectedPeriod}`}
              />
            </div>
          ) : (
            <div className="text-center text-slate-400 py-8">No plans found for {selectedPeriod}</div>
          )}
        </CardContent>
      </Card>

      {/* Staff Plans Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Staff Plan Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {staffPlanByUser.length > 0 ? (
            <div className="table-scroll px-3 sm:px-0">
              <ResponsiveTable
                columns={[
                  {
                    key: 'name',
                    header: 'Staff Name',
                    primary: true,
                    render: (sp: any) => <span className="font-medium text-slate-800">{sp.name}</span>,
                  },
                  {
                    key: 'role',
                    header: 'Role',
                    render: (sp: any) => <span>{sp.role}</span>,
                  },
                  {
                    key: 'branch',
                    header: 'Branch',
                    render: (sp: any) => <span className="text-xs text-slate-500">{sp.branch}</span>,
                  },
                  {
                    key: 'plans',
                    header: 'Plans',
                    className: 'text-center',
                    render: (sp: any) => <span className="font-mono">{sp.plans}</span>,
                  },
                  {
                    key: 'target',
                    header: 'Total Individual Target',
                    className: 'text-right',
                    render: (sp: any) => <span className="font-mono text-sm">{(sp.target ?? 0).toLocaleString()}</span>,
                  },
                ]}
                data={staffPlanByUser}
                rowKey={(sp: any) => sp.name}
                emptyMessage={`No staff plans for ${selectedPeriod}`}
              />
            </div>
          ) : (
            <div className="text-center text-slate-400 py-8">No staff plans for {selectedPeriod}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
