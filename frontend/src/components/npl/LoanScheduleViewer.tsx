import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { nplAPI } from '@/lib/api';
import { Calendar, RefreshCw, CheckCircle } from 'lucide-react';

interface Props {
  accountId: string;
}

export function LoanScheduleViewer({ accountId }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { loadSchedule(); }, [accountId]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const res = await nplAPI.getSchedule(accountId);
      if (res.success) setData(res.data);
    } catch (e) {
      console.error('Failed to load schedule', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      await nplAPI.generateSchedule(accountId);
      await loadSchedule();
    } catch (e) {
      console.error('Failed to generate', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkPaid = async (scheduleId: string) => {
    try {
      await nplAPI.markPaid(scheduleId, {});
      await loadSchedule();
    } catch (e) {
      console.error('Failed to mark paid', e);
    }
  };

  if (loading) return <div className="text-sm text-slate-400">Loading schedule...</div>;
  if (!data) return <div className="text-sm text-red-400">Failed to load schedule</div>;

  const { schedules, account } = data;

  return (
    <div className="space-y-3">
      {/* Loan Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-400">Principal</p>
          <p className="font-mono font-semibold">{(account?.loan_principal || 0).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Frequency</p>
          <p className="font-semibold">{account?.payment_frequency || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Interest Rate</p>
          <p className="font-semibold">{account?.interest_rate || 0}%</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Current Balance</p>
          <p className="font-mono font-semibold">{(account?.current_balance || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-slate-600">
          <span className="font-semibold">{data.pendingCount}</span> pending /
          <span className="font-semibold text-emerald-600"> {data.totalPaid?.toLocaleString()} paid</span>
          {data.missedCount > 0 && (
            <span className="font-semibold text-red-600"> / {data.missedCount} missed</span>
          )}
        </span>
        {schedules?.length === 0 && account?.payment_frequency && (
          <Button variant="outline" size="sm" className="text-xs" onClick={handleGenerate} disabled={generating}>
            <RefreshCw className={`h-3 w-3 mr-1 ${generating ? 'animate-spin' : ''}`} />
            Generate Schedule
          </Button>
        )}
      </div>

      {/* Installments Table */}
      {schedules?.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="text-left px-3 py-2 font-medium text-slate-600">Due Date</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Expected</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Paid</th>
                <th className="text-right px-3 py-2 font-medium text-slate-600">Remaining</th>
                <th className="text-center px-3 py-2 font-medium text-slate-600">Status</th>
                <th className="text-center px-3 py-2 font-medium text-slate-600"></th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s: any) => {
                const remaining = s.expectedAmount - s.paidAmount;
                const isOverdue = s.status === 'Pending' && new Date(s.expectedDate) < new Date();
                return (
                  <tr key={s.id} className={`border-b hover:bg-slate-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                          {new Date(s.expectedDate).toLocaleDateString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{s.expectedAmount?.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-600">{s.paidAmount?.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-mono text-red-600">{Math.max(0, remaining)?.toLocaleString()}</td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant={
                        s.status === 'Paid' ? 'default' :
                        s.status === 'Partial' ? 'warning' :
                        s.status === 'Missed' ? 'destructive' : 'secondary'
                      } className="text-xs">
                        {s.status}
                      </Badge>
                      {s.daysPastDue > 0 && (
                        <span className="text-xs text-red-500 ml-1">{s.daysPastDue}d</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {(s.status === 'Pending' || s.status === 'Partial') && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleMarkPaid(s.id)}>
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
