import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, CheckCircle2, AlertCircle, FileSpreadsheet, Download, RefreshCw } from 'lucide-react';
import { mappingsAPI } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';
import ResponsiveTable from '@/components/ui/responsive-table';

export function BulkMappingUpload() {
  const { user } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file');
      return;
    }

    if (!user?.branchId) {
      alert('Branch ID not found. Please ensure you are assigned to a branch.');
      return;
    }

    try {
      setLoading(true);
      const response = await mappingsAPI.bulkUpload(file, user.branchId);
      
      if (response.success) {
        setResult(response.data);
        setFile(null);
        // Scroll to results
        setTimeout(() => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to upload mapping file');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    // Create template data
    const templateData = [
      {
        'Account Number': 'ACC001',
        'Customer Name': 'John Doe',
        'Balance': 10000,
        'June Balance': 5000,
        'Staff ID': '0001',
        'Phone Number': '+251911234567',
        'Account Type': 'Savings',
        'Product': 'GIHON REGULAR SAVING',
        'Payment Frequency': '',
        'Loan Principal': '',
        'Maturity Date': '',
      },
      {
        'Account Number': 'ACC002',
        'Customer Name': 'Jane Smith',
        'Balance': 87500,
        'June Balance': 86000,
        'Staff ID': '0001',
        'Phone Number': '+251922345678',
        'Account Type': 'Loan',
        'Product': 'LOAN SAVING RESERVE ACCOUNT',
        'Payment Frequency': 'Monthly',
        'Loan Principal': 87500,
        'Maturity Date': '2029-07-21',
      },
    ];

    // Convert to CSV
    const headers = ['Account Number', 'Customer Name', 'Balance', 'June Balance', 'Staff ID', 'Phone Number', 'Account Type', 'Product', 'Payment Frequency', 'Loan Principal', 'Maturity Date'];
    const csvContent = [
      headers.join(','),
      ...templateData.map(row => 
        headers.map(header => `"${row[header as keyof typeof row] || ''}"`).join(',')
      ),
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'account_mapping_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Bulk Account Mapping Upload</h1>
        <p className="text-slate-600 mt-1">Upload Excel file to map customer accounts to staff members</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Mapping File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">File Format Requirements:</h3>
            <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
              <li>File must be Excel (.xlsx) or CSV format</li>
              <li>Required columns: <strong>Account Number</strong>, <strong>Customer Name</strong>, <strong>Balance</strong>, <strong>June Balance</strong>, <strong>Staff ID</strong></li>
              <li>Optional columns: <strong>Phone Number</strong>, <strong>Account Type</strong> (Savings/Loan), <strong>Product</strong>, <strong>Payment Frequency</strong> (Daily/Weekly/Monthly), <strong>Loan Principal</strong>, <strong>Maturity Date</strong></li>
              <li>Account Type defaults to <strong>Savings</strong> if not specified</li>
              <li>Staff ID must match the employeeId of staff members in your branch</li>
            </ul>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mappingFile">Select File (.xlsx or .csv)</Label>
            <div className="flex items-center gap-4">
              <Input
                id="mappingFile"
                type="file"
                accept=".xlsx,.csv"
                className="flex-1"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={loading}
              />
              <Button onClick={handleUpload} disabled={loading || !file}>
                <Upload className="h-4 w-4 mr-2" />
                {loading ? 'Uploading...' : 'Upload & Process'}
              </Button>
            </div>
            {file && (
              <p className="text-sm text-slate-600 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Selected: {file.name}
              </p>
            )}
          </div>

          {result && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Created</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900 mt-2">{result.created}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-800">
                    <RefreshCw className="h-5 w-5" />
                    <span className="font-semibold">Updated</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 mt-2">{result.updated}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-semibold">Errors</span>
                  </div>
                  <p className="text-2xl font-bold text-red-900 mt-2">{result.errors?.length || 0}</p>
                </div>
              </div>

              {/* Successfully Mapped Accounts */}
              {result.successful && result.successful.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-800 flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Successfully Mapped Accounts ({result.successful.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-96 overflow-y-auto">
                      <div className="table-scroll px-3 sm:px-0">
                        <ResponsiveTable
                          columns={[
                            {
                              key: 'row',
                              header: 'Row',
                              className: 'text-left',
                              render: (item: any) => <span className="text-xs text-slate-400">{item.row}</span>,
                            },
                            {
                              key: 'accountNumber',
                              header: 'Account Number',
                              primary: true,
                              render: (item: any) => (
                                <code className="font-mono text-xs font-bold text-blue-600">{item.accountNumber}</code>
                              ),
                            },
                            {
                              key: 'customerName',
                              header: 'Customer Name',
                              render: (item: any) => <span className="font-medium">{item.customerName}</span>,
                            },
                            {
                              key: 'staffID',
                              header: 'Staff ID',
                              render: (item: any) => <span className="font-mono text-xs">{item.staffID}</span>,
                            },
                            {
                              key: 'staffName',
                              header: 'Staff Name',
                              render: (item: any) => <span>{item.staffName}</span>,
                            },
                            {
                              key: 'status',
                              header: 'Status',
                              className: 'text-center',
                              render: (item: any) => (
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  item.status === 'Created' ? 'bg-green-200 text-green-800' : 'bg-blue-200 text-blue-800'
                                }`}>
                                  {item.status}
                                </span>
                              ),
                            },
                          ]}
                          data={result.successful}
                          rowKey={(item: any) => item.accountNumber || item.row}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Failed Mappings */}
              {result.errors && result.errors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-800 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Failed Mappings ({result.errors.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-96 overflow-y-auto">
                      <div className="table-scroll px-3 sm:px-0">
                        <ResponsiveTable
                          columns={[
                            {
                              key: 'row',
                              header: 'Row',
                              className: 'text-left',
                              render: (error: any) => <span className="text-xs text-slate-400">{error.row}</span>,
                            },
                            {
                              key: 'accountNumber',
                              header: 'Account Number',
                              primary: true,
                              render: (error: any) => (
                                <code className="font-mono text-xs font-bold text-blue-600">{error.accountNumber || 'N/A'}</code>
                              ),
                            },
                            {
                              key: 'customerName',
                              header: 'Customer Name',
                              render: (error: any) => <span className="font-medium">{error.customerName || 'N/A'}</span>,
                            },
                            {
                              key: 'staffID',
                              header: 'Staff ID',
                              render: (error: any) => <span className="font-mono text-xs">{error.staffID || 'N/A'}</span>,
                            },
                            {
                              key: 'error',
                              header: 'Error Reason',
                              render: (error: any) => <span className="text-red-600 font-medium">{error.error}</span>,
                            },
                          ]}
                          data={result.errors}
                          rowKey={(error: any) => error.accountNumber || error.row}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

