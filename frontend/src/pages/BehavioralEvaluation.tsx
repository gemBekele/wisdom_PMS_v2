import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ResponsiveTable from '@/components/ui/responsive-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, XCircle, Eye } from 'lucide-react';
import { behavioralAPI } from '@/lib/api';

export function BehavioralEvaluation() {
  const [evaluations, setEvaluations] = useState<any[]>([]);

  useEffect(() => {
    loadEvaluations();
  }, []);

  const loadEvaluations = async () => {
    try {
      const response = await behavioralAPI.getAll();
      if (response.success) {
        setEvaluations(response.data || []);
      }
    } catch (error) {
      console.error('Error loading evaluations:', error);
      setEvaluations([]);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'Pending':
        return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'Rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await behavioralAPI.approve(id, 'Approved');
      loadEvaluations();
    } catch (error) {
      console.error('Error approving evaluation:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Behavioral Evaluation</h1>
        <p className="text-slate-600 mt-2">Review and approve behavioral evaluations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">Total Evaluations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{evaluations.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {evaluations.filter((e: any) => e.status === 'Pending').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {evaluations.filter((e: any) => e.status === 'Approved').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evaluation List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="table-scroll px-3 sm:px-0">
            <ResponsiveTable
              columns={[
                {
                  key: 'employeeName',
                  header: 'Employee',
                  primary: true,
                  render: (evaluation: any) => <span className="font-medium text-slate-800">{evaluation.employeeName}</span>,
                },
                {
                  key: 'period',
                  header: 'Period',
                  render: (evaluation: any) => <span className="text-slate-600">{evaluation.period}</span>,
                },
                {
                  key: 'score',
                  header: 'Score',
                  className: 'text-center',
                  render: (evaluation: any) => (
                    <Badge variant={(evaluation.overallScore || 0) >= 80 ? 'success' : (evaluation.overallScore || 0) >= 60 ? 'warning' : 'destructive'}>
                      {evaluation.overallScore || 0}/100
                    </Badge>
                  ),
                },
                {
                  key: 'submittedBy',
                  header: 'Submitted By',
                  render: (evaluation: any) => <span>{evaluation.submittedBy}</span>,
                },
                {
                  key: 'date',
                  header: 'Date',
                  render: (evaluation: any) => <span className="text-slate-500">{new Date(evaluation.submittedAt).toLocaleDateString()}</span>,
                },
                {
                  key: 'status',
                  header: 'Status',
                  className: 'text-center',
                  render: (evaluation: any) => getStatusBadge(evaluation.status),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  className: 'text-center',
                  render: (evaluation: any) => (
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {evaluation.status === 'Pending' && (
                        <Button size="sm" onClick={() => handleApprove(evaluation._id)}>
                          Approve
                        </Button>
                      )}
                    </div>
                  ),
                },
              ]}
              data={evaluations}
              rowKey={(evaluation: any) => evaluation._id}
              emptyMessage="No evaluations found"
              mobileActions={(evaluation: any) => (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  {evaluation.status === 'Pending' && (
                    <Button size="sm" className="flex-1" onClick={() => handleApprove(evaluation._id)}>
                      Approve
                    </Button>
                  )}
                </div>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

