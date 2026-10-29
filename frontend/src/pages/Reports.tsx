import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle2, BarChart3 } from 'lucide-react';

export function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Reports</h1>
        <p className="text-slate-600 mt-1">Access performance reports and analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/reports/scorecard">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-500" />
                <CardTitle>Monthly Scorecard</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                View your monthly performance scorecard with detailed KPI breakdown and behavioral evaluation. Export as CSV.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/cbs-validation">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <CardTitle>CBS Validation Report</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                View CBS validation status, reconciliation reports, and discrepancy tracking for your branch.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/kpi">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-purple-500" />
                <CardTitle>KPI Dashboard</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                View real-time KPI performance, track progress against targets, and monitor achievements.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
