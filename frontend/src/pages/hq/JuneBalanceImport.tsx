import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, CheckCircle2, AlertCircle, RefreshCw, Calendar } from 'lucide-react';
import { juneBalanceAPI } from '@/lib/api';

export function JuneBalanceImport() {
  const [file, setFile] = useState<File | null>(null);
  const [baseline_period, setBaselinePeriod] = useState<string>('2025');
  const [baseline_date, setBaselineDate] = useState<string>('2025-06-30');
  const [make_active, setMakeActive] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [periods, setPeriods] = useState<any[]>([]);

  useEffect(() => {
    loadPeriods();
  }, []);

  const loadPeriods = async () => {
    try {
      setLoadingPeriods(true);
      const response = await juneBalanceAPI.getPeriods();
      if (response.success) {
        setPeriods(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load baseline periods:', error);
    } finally {
      setLoadingPeriods(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file');
      return;
    }

    if (!baseline_period || !baseline_date) {
      alert('Please enter baseline period and date');
      return;
    }

    try {
      setLoading(true);
      const response = await juneBalanceAPI.import(file, baseline_period, baseline_date, make_active);
      if (response.success) {
        setResult(response.data);
        setFile(null);
        await loadPeriods(); // Refresh periods list
        alert(`Successfully imported ${response.data.imported} new and updated ${response.data.updated} account balances for ${baseline_period} baseline!`);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to import baseline balance file');
    } finally {
      setLoading(false);
    }
  };

  const handleActivatePeriod = async (period: string) => {
    if (!confirm(`Activate ${period} baseline period? This will deactivate all other baselines.`)) {
      return;
    }

    try {
      const response = await juneBalanceAPI.activatePeriod(period);
      if (response.success) {
        await loadPeriods();
        alert(`Successfully activated ${period} baseline period!`);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to activate baseline period');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Baseline Balance Upload</h1>
        <p className="text-slate-600 mt-1">Upload baseline balance snapshots for different periods (e.g., 2025, 2026)</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Baseline Balance Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseline_period">Baseline Period (e.g., 2025, 2026)</Label>
              <Input
                id="baseline_period"
                type="text"
                placeholder="2025"
                value={baseline_period}
                onChange={(e) => setBaselinePeriod(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-slate-500">Year or period identifier</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseline_date">Baseline Date</Label>
              <Input
                id="baseline_date"
                type="date"
                value={baseline_date}
                onChange={(e) => setBaselineDate(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-slate-500">Date of the balance snapshot (e.g., 2025-06-30)</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="make_active" className="flex items-center gap-2">
              <Input
                id="make_active"
                type="checkbox"
                checked={make_active}
                onChange={(e) => setMakeActive(e.target.checked)}
                disabled={loading}
                className="w-4 h-4"
              />
              <span>Make this the active baseline (will deactivate other baselines)</span>
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="juneBalanceFile">Select File (.xlsx or .csv)</Label>
            <div className="flex items-center gap-4">
              <Input
                id="juneBalanceFile"
                type="file"
                accept=".xlsx,.csv"
                className="flex-1"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={loading}
              />
              <Button onClick={handleUpload} disabled={loading || !file}>
                <Upload className="h-4 w-4 mr-2" />
                {loading ? 'Importing...' : 'Import'}
              </Button>
            </div>
            <p className="text-sm text-slate-500">
              File must contain columns: account_id, june_balance (and optionally accountNumber, branch_code)
            </p>
          </div>

          {result && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-2">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">Import Complete</span>
              </div>
              <div className="text-sm text-slate-600 space-y-1">
                <p>Imported: {result.imported} accounts</p>
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">Errors: {result.errors.length}</span>
                    </div>
                    <ul className="list-disc list-inside mt-1 text-xs">
                      {result.errors.slice(0, 5).map((error: string, idx: number) => (
                        <li key={`err-${idx}`}>{error}</li>
                      ))}
                      {result.errors.length > 5 && (
                        <li>... and {result.errors.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 pt-4">
            <h3 className="font-semibold text-slate-800 mb-2">Important Notes</h3>
            <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
              <li>Upload baseline balance snapshots for different periods (e.g., 2025, 2026)</li>
              <li>All KPI calculations use incremental growth from the <strong>active</strong> baseline</li>
              <li>Only one baseline can be active at a time</li>
              <li>Ensure account_id matches the account numbers used in CBS files</li>
              <li>Only accounts with baseline balance will be used in calculations</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Existing Baselines */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Existing Baseline Periods</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={loadPeriods}
              disabled={loadingPeriods}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingPeriods ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingPeriods ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : periods.length === 0 ? (
            <p className="text-sm text-slate-500">No baseline periods found. Upload your first baseline above.</p>
          ) : (
            <div className="space-y-3">
              {periods.map((period: any) => (
                <div
                  key={period.baseline_period}
                  className={`p-4 border rounded-lg ${
                    period.is_active ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-800">
                          {period.baseline_period} Baseline
                        </h4>
                        {period.is_active && (
                          <span className="px-2 py-1 text-xs font-semibold bg-emerald-500 text-white rounded">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-slate-600 space-y-1">
                        <p>
                          <Calendar className="h-3 w-3 inline mr-1" />
                          Date: {period.baseline_date ? new Date(period.baseline_date).toLocaleDateString() : 'N/A'}
                        </p>
                        <p>Accounts: {period.account_count}</p>
                        {period.importedAt && (
                          <p className="text-xs text-slate-500">
                            Imported: {new Date(period.importedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    {!period.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleActivatePeriod(period.baseline_period)}
                      >
                        Activate
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

