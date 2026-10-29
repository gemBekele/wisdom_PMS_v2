import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ResponsiveTable from '@/components/ui/responsive-table';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cbsAPI } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';

export function CBSValidation() {
  const { user } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [validationDate, setValidationDate] = useState(new Date().toISOString().split('T')[0]);
  const [branch_code, setBranchCode] = useState(user?.branch_code || '');
  const [loading, setLoading] = useState(false);
  const [validations, setValidations] = useState<any[]>([]);

  useEffect(() => {
    loadValidations();
  }, []);

  const loadValidations = async () => {
    try {
      const response = await cbsAPI.getAll();
      if (response.success) {
        setValidations(response.data || []);
      }
    } catch (error) {
      console.error('Error loading validations:', error);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file');
      return;
    }

    if (!branch_code) {
      alert('Please enter branch code');
      return;
    }

    try {
      setLoading(true);
      const response = await cbsAPI.upload(file, branch_code, validationDate);
      if (response.success) {
        alert('CBS file uploaded and validated successfully!');
        setFile(null);
        loadValidations();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to upload CBS file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">CBS Validation Center</h1>
        <p className="text-slate-600 mt-1">Upload and validate CBS files for all branches</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload CBS File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch_code">Branch Code *</Label>
              <Input
                id="branch_code"
                value={branch_code}
                onChange={(e) => setBranchCode(e.target.value)}
                placeholder="e.g., WOLAYTA_SODO"
                required
                disabled={loading || !!user?.branch_code}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="validationDate">Validation Date *</Label>
              <Input
                id="validationDate"
                type="date"
                value={validationDate}
                onChange={(e) => setValidationDate(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cbsFile">Select CBS File</Label>
            <div className="flex items-center gap-4">
              <Input
                id="cbsFile"
                type="file"
                accept=".csv,.xlsx"
                className="flex-1"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={loading}
              />
              <Button onClick={handleUpload} disabled={loading || !file}>
                <Upload className="h-4 w-4 mr-2" />
                {loading ? 'Uploading...' : 'Upload & Validate'}
              </Button>
            </div>
            <p className="text-sm text-slate-500">
              Upload daily CBS files to validate against PMS task entries. System will update account balances and auto-map new accounts ≥ 500 ETB.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Validation Results</CardTitle>
        </CardHeader>
        <CardContent>
          {validations.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No validations found</div>
          ) : (
            <div className="table-scroll px-3 sm:px-0">
              <ResponsiveTable
                columns={[
                  {
                    key: 'branch',
                    header: 'Branch',
                    primary: true,
                    render: (validation: any) => (
                      <span className="font-medium text-slate-800">{validation.branchId?.name || validation.branchId?.code || 'N/A'}</span>
                    ),
                  },
                  {
                    key: 'date',
                    header: 'Date',
                    render: (validation: any) => <span>{new Date(validation.validationDate).toLocaleDateString()}</span>,
                  },
                  {
                    key: 'totalRecords',
                    header: 'Records',
                    className: 'text-right',
                    render: (validation: any) => <span className="font-mono text-xs">{validation.totalRecords?.toLocaleString() || 0}</span>,
                  },
                  {
                    key: 'matchedRecords',
                    header: 'Matched',
                    className: 'text-right',
                    render: (validation: any) => <span className="font-mono text-xs text-emerald-600">{validation.matchedRecords || 0}</span>,
                  },
                  {
                    key: 'discrepancyCount',
                    header: 'Discrepancies',
                    className: 'text-right',
                    render: (validation: any) => (
                      validation.discrepancyCount > 0 ? (
                        <span className="font-mono text-xs text-red-600 font-semibold">{validation.discrepancyCount}</span>
                      ) : (
                        <span className="font-mono text-xs text-emerald-600">0</span>
                      )
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    className: 'text-center',
                    render: (validation: any) =>
                      validation.status === 'Completed' ? (
                        <Badge variant="default" className="flex items-center gap-1 w-fit">
                          <CheckCircle2 className="h-3 w-3" />
                          Completed
                        </Badge>
                      ) : validation.status === 'Partial' ? (
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          <AlertTriangle className="h-3 w-3" />
                          Partial
                        </Badge>
                      ) : (
                        <Badge variant="outline">Processing</Badge>
                      ),
                  },
                  {
                    key: 'action',
                    header: 'Action',
                    className: 'text-center',
                    render: () => <Button variant="ghost" size="sm">View Details</Button>,
                  },
                ]}
                data={validations}
                rowKey={(validation: any) => validation._id}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
