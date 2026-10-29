import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ResponsiveTable from '@/components/ui/responsive-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { plansAPI, staffPlansAPI } from '@/lib/api';

const kpiCategories = [
  'Deposit Mobilization',
  'Collection Rate',
  'Portfolio Quality',
];

export const productCategories = [
  'Loan Saving Deposit', 'Michu Current Saving', 'Gihon Regular Saving',
  'Mothers Saving', 'Young Womens Saving', 'Elders Saving',
  'Children Saving', 'Fixed Time Deposit', 'Premium Saving Deposit',
  'Special Saving', 'Segment Deposit', 'Wadiah IFB Deposit',
];

const periods = ['FY-2026-27'];

export function PlanCascade() {
  const [activeTab, setActiveTab] = useState('manual');
  const [plans, setPlans] = useState<any[]>([]);
  const [staffPlans, setStaffPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [staffPlansLoading, setStaffPlansLoading] = useState(false);
  const [staffPlansFilter, setStaffPlansFilter] = useState({ branch_code: 'WOLAYTA_SODO', period: 'FY-2026-27' });
  const [formData, setFormData] = useState({
    branch_code: '',
    kpi_category: '',
    product_category: '',
    period: '',
    target_value: '',
    target_count: '',
    target_type: 'incremental',
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    loadPlans();
    if (activeTab === 'staff-plans') {
      loadStaffPlans();
    }
    if (activeTab === 'product-plans' && plans.length === 0) {
      loadPlans();
    }
  }, [activeTab]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await plansAPI.getAll();
      if (response.success) {
        setPlans(response.data || []);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStaffPlans = async () => {
    try {
      setStaffPlansLoading(true);
      const params: any = {};
      if (staffPlansFilter.branch_code) params.branch_code = staffPlansFilter.branch_code;
      if (staffPlansFilter.period) params.period = staffPlansFilter.period;
      const response = await staffPlansAPI.getAll(params);
      if (response.success) {
        setStaffPlans(response.data || []);
      }
    } catch (error) {
      console.error('Error loading staff plans:', error);
    } finally {
      setStaffPlansLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload: any = {
        ...formData,
        target_value: parseFloat(formData.target_value),
      };
      if (!payload.product_category) delete payload.product_category;
      if (!payload.target_count) delete payload.target_count;
      const response = await plansAPI.create(payload);
      if (response.success) {
        alert('Plan created and cascaded successfully!');
        setFormData({
          branch_code: '',
          kpi_category: '',
          product_category: '',
          period: '',
          target_value: '',
          target_count: '',
          target_type: 'incremental',
        });
        loadPlans();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to create plan');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      alert('Please select a file');
      return;
    }

    try {
      setLoading(true);
      const response = await plansAPI.upload(file);
      if (response.success) {
        const { created, errors, processed } = response.data || {};
        let message = `Successfully created ${created || 0} plans!`;
        if (processed !== undefined) {
          message += `\nProcessed ${processed} rows.`;
        }
        if (errors && errors.length > 0) {
          message += `\n\nErrors (${errors.length}):\n${errors.slice(0, 10).join('\n')}`;
          if (errors.length > 10) {
            message += `\n... and ${errors.length - 10} more errors.`;
          }
        }
        alert(message);
        setFile(null);
        loadPlans();
      } else {
        alert(response.message || 'Upload failed');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to upload plan file';
      alert(errorMessage);
      console.error('Plan upload error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Plan Management</h1>
        <p className="text-slate-600 mt-1">Create and manage branch-level plans</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="upload">Upload Excel</TabsTrigger>
          <TabsTrigger value="plans">View Plans</TabsTrigger>
          <TabsTrigger value="product-plans">Product Plans</TabsTrigger>
          <TabsTrigger value="staff-plans">Staff Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Plan Manually</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="branch_code">Branch Code *</Label>
                    <Input
                      id="branch_code"
                      value={formData.branch_code}
                      onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
                      placeholder="e.g., WOLAYTA_SODO"
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kpi_category">KPI Category *</Label>
                    <Select
                      value={formData.kpi_category}
                      onValueChange={(value) => setFormData({ ...formData, kpi_category: value })}
                    >
                      <SelectTrigger id="kpi_category">
                        <SelectValue placeholder="Select KPI category" />
                      </SelectTrigger>
                      <SelectContent>
                        {kpiCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="period">Period *</Label>
                    <Select
                      value={formData.period}
                      onValueChange={(value) => setFormData({ ...formData, period: value })}
                    >
                      <SelectTrigger id="period">
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        {periods.map((period) => (
                          <SelectItem key={period} value={period}>
                            {period}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target_value">Target Value *</Label>
                    <Input
                      id="target_value"
                      type="number"
                      value={formData.target_value}
                      onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                      placeholder="Enter target value"
                      required
                      disabled={loading}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                  <div className="space-y-2">
                    <Label htmlFor="product_category">Product Category (optional)</Label>
                    <Select
                      value={formData.product_category}
                      onValueChange={(value) => setFormData({ ...formData, product_category: value })}
                    >
                      <SelectTrigger id="product_category">
                        <SelectValue placeholder="None (KPI-based plan)" />
                      </SelectTrigger>
                      <SelectContent>
                        {productCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target_count">Target Count (optional)</Label>
                    <Input
                      id="target_count"
                      type="number"
                      value={formData.target_count}
                      onChange={(e) => setFormData({ ...formData, target_count: e.target.value })}
                      placeholder="Account/number target"
                      disabled={loading}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="target_type">Target Type</Label>
                    <Input
                      id="target_type"
                      value={formData.target_type}
                      disabled
                      className="bg-slate-50"
                    />
                    <p className="text-xs text-slate-500">Only incremental targets are supported</p>
                  </div>
                  <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Plan
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormData({
                      branch_code: '',
                      kpi_category: '',
                      product_category: '',
                      period: '',
                      target_value: '',
                      target_count: '',
                      target_type: 'incremental',
                    })}
                    disabled={loading}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Plan File</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="planFile">Select Plan File (.xlsx or .csv)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="planFile"
                    type="file"
                    accept=".xlsx,.csv"
                    className="flex-1"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    disabled={loading}
                  />
                  <Button onClick={handleFileUpload} disabled={loading || !file}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
                <p className="text-sm text-slate-500">
                  Excel file must contain columns: branch_code, kpi_category, period, target_value, target_type
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="product-plans" className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="space-y-6">
              {productCategories.map((product) => {
                const productPlans = plans.filter(p => p.product_category === product);
                if (productPlans.length === 0) return null;
                const totalAmount = productPlans.reduce((s, p) => s + (p.target_value || 0), 0);
                const totalCount = productPlans.reduce((s, p) => s + (p.target_count || 0), 0);
                const monthlyPlan = productPlans[0]?.monthly_plan;
                return (
                  <Card key={product}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{product}</span>
                        <span className="text-sm font-normal text-slate-500">
                          {totalAmount.toLocaleString()} ETB | {totalCount.toLocaleString()} accounts
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {monthlyPlan && monthlyPlan.length > 0 ? (
                        <div className="table-scroll px-3 sm:px-0">
                          <ResponsiveTable
                            columns={[
                              {
                                key: 'month',
                                header: 'Month',
                                primary: true,
                                render: (m: any) => <span className="font-medium text-slate-800">{m.month}</span>,
                              },
                              {
                                key: 'amount',
                                header: 'Amount Target',
                                className: 'text-right',
                                render: (m: any) => <span className="font-mono text-xs">{(m.amount || 0).toLocaleString()}</span>,
                              },
                              {
                                key: 'count',
                                header: 'Account Target',
                                className: 'text-right',
                                render: (m: any) => <span className="font-mono text-xs">{(m.count || 0).toLocaleString()}</span>,
                              },
                            ]}
                            data={monthlyPlan}
                            rowKey={(m: any) => m.month}
                          />
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500">No monthly breakdown available</div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="staff-plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Plans (Cascaded Plans)</CardTitle>
              <p className="text-sm text-slate-600 mt-1">View individual plans assigned to staff members</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="filter_branch">Branch Code</Label>
                  <Input
                    id="filter_branch"
                    value={staffPlansFilter.branch_code}
                    onChange={(e) => setStaffPlansFilter({ ...staffPlansFilter, branch_code: e.target.value })}
                    placeholder="e.g., WOLAYTA_SODO"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter_period">Period</Label>
                  <Select
                    value={staffPlansFilter.period}
                    onValueChange={(value) => setStaffPlansFilter({ ...staffPlansFilter, period: value })}
                  >
                    <SelectTrigger id="filter_period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {periods.map((period) => (
                        <SelectItem key={period} value={period}>
                          {period}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={loadStaffPlans} disabled={staffPlansLoading}>
                {staffPlansLoading ? 'Loading...' : 'Load Staff Plans'}
              </Button>

              {staffPlansLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="table-scroll px-3 sm:px-0">
                  <ResponsiveTable
                    columns={[
                      {
                        key: 'name',
                        header: 'Staff Name',
                        primary: true,
                        render: (sp: any) => (
                          <span className="font-medium text-slate-800">
                            {sp.userId?.name || 'N/A'} <span className="text-xs text-slate-400">({sp.userId?.employeeId || 'N/A'})</span>
                          </span>
                        ),
                      },
                      {
                        key: 'position',
                        header: 'Position',
                        render: (sp: any) => <span>{sp.position}</span>,
                      },
                      {
                        key: 'kpi_category',
                        header: 'KPI Category',
                        render: (sp: any) => <span className="text-xs text-slate-500">{sp.kpi_category}</span>,
                      },
                      {
                        key: 'individual_target',
                        header: 'Individual Target',
                        className: 'text-right',
                        render: (sp: any) => <span className="font-mono text-xs">{sp.individual_target?.toLocaleString()}</span>,
                      },
                      {
                        key: 'plan_share_percent',
                        header: 'Plan Share %',
                        className: 'text-right',
                        render: (sp: any) => <span className="font-mono text-xs">{sp.plan_share_percent?.toFixed(2)}%</span>,
                      },
                      {
                        key: 'daily_target',
                        header: 'Daily Target',
                        className: 'text-right',
                        render: (sp: any) => <span className="font-mono text-xs">{sp.daily_target?.toLocaleString()}</span>,
                      },
                      {
                        key: 'status',
                        header: 'Status',
                        className: 'text-center',
                        render: (sp: any) => (
                          <Badge variant={sp.status === 'Active' ? 'default' : 'outline'}>
                            {sp.status}
                          </Badge>
                        ),
                      },
                    ]}
                    data={staffPlans}
                    rowKey={(sp: any) => sp._id}
                    emptyMessage="No staff plans found. Make sure plans are cascaded and filters are correct."
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Plans</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <div className="table-scroll px-3 sm:px-0">
                  <ResponsiveTable
                    columns={[
                      {
                        key: 'branch_code',
                        header: 'Branch Code',
                        primary: true,
                        render: (plan: any) => <code className="font-mono text-xs font-bold text-blue-600">{plan.branch_code}</code>,
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
                        key: 'target_count',
                        header: 'Target Count',
                        className: 'text-right',
                        render: (plan: any) => <span className="font-mono text-xs">{(plan.target_count ?? 0).toLocaleString()}</span>,
                      },
                      {
                        key: 'period',
                        header: 'Period',
                        render: (plan: any) => <span className="text-xs text-slate-500">{plan.period}</span>,
                      },
                      {
                        key: 'status',
                        header: 'Status',
                        className: 'text-center',
                        render: (plan: any) => (
                          <Badge variant={plan.status === 'Active' ? 'default' : 'outline'}>
                            {plan.status}
                          </Badge>
                        ),
                      },
                      {
                        key: 'createdAt',
                        header: 'Created',
                        render: (plan: any) => <span className="text-xs text-slate-500">{new Date(plan.createdAt).toLocaleDateString()}</span>,
                      },
                    ]}
                    data={plans}
                    rowKey={(plan: any) => plan._id}
                    emptyMessage="No plans found"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
