import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ResponsiveTable from '@/components/ui/responsive-table';
import { Badge } from '@/components/ui/badge';
import { Edit2, X, Check } from 'lucide-react';
import { getToken } from '@/lib/api';

const DEFAULT_KPI_DATA = [
  { id: 'Account_Productivity', kpiId: 'Account_Productivity', name: 'Account Productivity', weight: 30, minBalance: 1000 },
  { id: 'Deposit_Mobilization', kpiId: 'Deposit_Mobilization', name: 'Deposit Mobilization', weight: 24, minBalance: 1000 },
  { id: 'Internal_Operations', kpiId: 'Internal_Operations', name: 'Internal Operations', weight: 12, minBalance: 0 },
  { id: 'Share_Capital_Growth', kpiId: 'Share_Capital_Growth', name: 'Share Capital Growth', weight: 9, minBalance: 0 },
  { id: 'New_Member_Registration', kpiId: 'New_Member_Registration', name: 'New Member Registration', weight: 6, minBalance: 0 },
  { id: 'New_Account_Opening', kpiId: 'New_Account_Opening', name: 'New Account Opening', weight: 6, minBalance: 0 },
  { id: 'Mobile_Banking_Users', kpiId: 'Mobile_Banking_Users', name: 'Mobile Banking Users', weight: 5, minBalance: 0 },
  { id: 'Billers_Recruitment', kpiId: 'Billers_Recruitment', name: 'Billers Recruitment', weight: 5, minBalance: 0 },
  { id: 'Merchant_POS_Growth', kpiId: 'Merchant_POS_Growth', name: 'Merchant POS Growth', weight: 3, minBalance: 0 },
  { id: 'Collection_Rate', kpiId: 'Collection_Rate', name: 'Collection Rate', weight: 0, minBalance: 0 },
  { id: 'Portfolio_Quality', kpiId: 'Portfolio_Quality', name: 'Portfolio Quality', weight: 0, minBalance: 0 },
];

const thresholds = [
  { label: 'Outstanding', min: 120, max: 100, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Exceeds Expectations', min: 100, max: 119, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Meets Expectations', min: 90, max: 99, color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: 'Needs Improvement', min: 80, max: 89, color: 'text-orange-600', bg: 'bg-orange-50' },
  { label: 'Unsatisfactory', min: 0, max: 79, color: 'text-red-600', bg: 'bg-red-50' },
];

export function KPIFramework() {
  const [kpiCategories, setKpiCategories] = useState(DEFAULT_KPI_DATA);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeights, setEditWeights] = useState<Record<string, number>>({});

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/kpi-config', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setKpiCategories(data.data.map((c: any) => ({
          id: c.id || c.kpiId,
          kpiId: c.kpiId,
          name: c.name,
          weight: c.weight,
          minBalance: c.minBalance,
        })));
      }
    } catch (_) {}
  };

  const startEdit = (id: string, weight: number) => {
    setEditingId(id);
    setEditWeights((prev) => ({ ...prev, [id]: weight }));
  };

  const saveWeight = async (id: string, weight: number) => {
    try {
      const token = getToken();
      await fetch(`/api/kpi-config/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ weight }),
      });
      setEditingId(null);
      loadConfig();
    } catch (_) {}
  };

  const saveEdit = async (id: string) => {
    const newWeight = editWeights[id];
    if (newWeight && newWeight > 0 && newWeight <= 100) {
      await saveWeight(id, newWeight);
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const totalWeight = kpiCategories.reduce((sum, kpi) => sum + kpi.weight, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">KPI Framework</h1>
        <p className="text-slate-600 mt-1">Define KPI categories, weights, and scoring logic</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>KPI Categories & Weights</CardTitle>
            <div className="text-sm">
              <span className="text-slate-600">Total Weight: </span>
              <span className={totalWeight === 100 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                {totalWeight}%
              </span>
              {totalWeight !== 100 && (
                <span className="text-red-500 text-xs ml-2">Must equal 100%</span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="table-scroll px-3 sm:px-0">
            <ResponsiveTable
              columns={[
                {
                  key: 'name',
                  header: 'KPI Category',
                  primary: true,
                  render: (kpi: any) => <span className="font-medium text-slate-800">{kpi.name}</span>,
                },
                {
                  key: 'weight',
                  header: 'Weight (%)',
                  className: 'text-center',
                  render: (kpi: any) =>
                    editingId === kpi.id ? (
                      <Input
                        type="number"
                        className="w-20 h-8"
                        value={editWeights[kpi.id] ?? kpi.weight}
                        onChange={(e) => setEditWeights({ ...editWeights, [kpi.id]: parseInt(e.target.value) || 0 })}
                        min={0}
                        max={100}
                      />
                    ) : (
                      <Badge variant="outline">{kpi.weight}%</Badge>
                    ),
                },
                {
                  key: 'minBalance',
                  header: 'Min Balance (ETB)',
                  className: 'text-right',
                  render: (kpi: any) => <span className="font-mono text-xs">{(kpi.minBalance ?? 0).toLocaleString()}</span>,
                },
                {
                  key: 'action',
                  header: 'Action',
                  className: 'text-center',
                  render: (kpi: any) =>
                    editingId === kpi.id ? (
                      <div className="flex gap-1 justify-center">
                        <Button variant="ghost" size="sm" onClick={() => saveEdit(kpi.id)}>
                          <Check className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={cancelEdit}>
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => startEdit(kpi.id, kpi.weight)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    ),
                },
              ]}
              data={kpiCategories}
              rowKey={(kpi: any) => kpi.id}
              mobileActions={(kpi: any) =>
                editingId === kpi.id ? (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => saveEdit(kpi.id)}>
                      <Check className="h-4 w-4 mr-1 text-emerald-600" /> Save
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={cancelEdit}>
                      <X className="h-4 w-4 mr-1 text-red-600" /> Cancel
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => startEdit(kpi.id, kpi.weight)}>
                    <Edit2 className="h-4 w-4 mr-1" /> Edit Weight
                  </Button>
                )
              }
            />
          </div>
          {editingId && (
            <div className="mt-4 p-3 bg-blue-50 text-blue-700 text-sm rounded-md">
              Edit the weight percentage and click ✓ to save or ✗ to cancel.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Threshold Reference Card */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Rating Thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {thresholds.map((t) => (
              <div key={t.label} className={`p-3 rounded-lg border ${t.bg}`}>
                <span className={`text-xs font-bold ${t.color}`}>{t.label}</span>
                <p className="text-lg font-bold text-slate-800 mt-1">&ge; {t.min}%</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
