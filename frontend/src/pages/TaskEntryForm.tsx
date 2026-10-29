import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import ResponsiveTable from '@/components/ui/responsive-table';
import { CheckCircle2, AlertTriangle, XCircle, Search, User, ArrowLeft } from 'lucide-react';
import { tasksAPI, mappingsAPI, productMappingAPI } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';
import { useConfig } from '@/contexts/ConfigContext';

const FALLBACK_PRODUCTS: Record<string, string[]> = {
  'Deposit Mobilization': [
    'LOAN SAVING RESERVE ACCOUNT', 'Michu Current Account', 'GIHON REGULAR SAVING',
    'MOTHERS SAVING ACCOUNT', 'YOUNG WOMEN SAVING', 'ELDERS SAVING ACCOUNT',
    'CHILDREN SAVING ACCOUNT', 'FIXED TIME DEPOSIT', 'Premium Saving Deposit',
    'SPECIAL SAVING ACCOUNT', 'Segment Deposit', 'WADIAH SAVING ACCOUNT',
    'REPAYMENT ACCOUNT', 'School',
  ],
};

export function TaskEntryForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const { taskTypes: configTaskTypes, taskTypeToKpiMap: configTaskTypeToKpiMap } = useConfig();

  const preselectedAccount = searchParams.get('accountNumber') || '';

  const DEPOSIT_PRODUCT_TASK_TYPES = [
    'Loan Saving Deposit', 'Michu Current Saving', 'Gihon Regular Saving',
    'Mothers Saving', 'Young Womens Saving', 'Elders Saving',
    'Children Saving', 'Fixed Time Deposit', 'Premium Saving Deposit',
    'Special Saving', 'Segment Deposit', 'Wadiah IFB Deposit',
  ];

  const taskTypes = configTaskTypes.length > 0
    ? configTaskTypes.map(t => t.label || t.value)
    : [...DEPOSIT_PRODUCT_TASK_TYPES];

  const taskTypeToKpiCategory: Record<string, string> = Object.keys(configTaskTypeToKpiMap).length > 0
    ? Object.fromEntries(
        Object.entries(configTaskTypeToKpiMap).map(([k, v]) => {
          const taskLabel = taskTypes.find(t => t.replace(/\s/g, '_') === k || t === k) || k.replace(/_/g, ' ');
          const kpiLabel = v.replace(/_/g, ' ');
          return [taskLabel, kpiLabel];
        })
      )
    : {
        'Loan Saving Deposit': 'Deposit Mobilization',
        'Michu Current Saving': 'Deposit Mobilization',
        'Gihon Regular Saving': 'Deposit Mobilization',
        'Mothers Saving': 'Deposit Mobilization',
        'Young Womens Saving': 'Deposit Mobilization',
        'Elders Saving': 'Deposit Mobilization',
        'Children Saving': 'Deposit Mobilization',
        'Fixed Time Deposit': 'Deposit Mobilization',
        'Premium Saving Deposit': 'Deposit Mobilization',
        'Special Saving': 'Deposit Mobilization',
        'Segment Deposit': 'Deposit Mobilization',
        'Wadiah IFB Deposit': 'Deposit Mobilization',
      };

  const [taskType, setTaskType] = useState('');
  const [productType, setProductType] = useState('');
  const [accountNumber, setAccountNumber] = useState(preselectedAccount);
  const [customerName, setCustomerName] = useState('');
  const [accountType, setAccountType] = useState('Savings');
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [taskDate, setTaskDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [mappingStatus, setMappingStatus] = useState<string | null>(null);
  const [submittedTask, setSubmittedTask] = useState<any>(null);
  const [mappingInfo, setMappingInfo] = useState<any>(null);
  const [mappings, setMappings] = useState<any[]>([]);
  const [accountSearch, setAccountSearch] = useState('');
  const [dynamicProducts, setDynamicProducts] = useState<Record<string, string[]> | null>(null);

  useEffect(() => { loadMappings(); loadProducts(); }, []);

  const loadProducts = async () => {
    try {
      const res = await productMappingAPI.getAll({ status: 'active' });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const grouped: Record<string, string[]> = {};
        for (const mapping of res.data) {
          const kpiDisplay = mapping.kpi_category?.replace(/_/g, ' ');
          if (!grouped[kpiDisplay]) grouped[kpiDisplay] = [];
          if (!grouped[kpiDisplay].includes(mapping.cbs_product_name)) {
            grouped[kpiDisplay].push(mapping.cbs_product_name);
          }
        }
        setDynamicProducts(grouped);
      }
    } catch (_) {}
  };

  const loadMappings = async () => {
    try {
      const response = await mappingsAPI.getAll({ mappedTo: user?._id });
      if (response.success) setMappings(response.data || []);
    } catch (_) {}
  };

  const productTypes = dynamicProducts || FALLBACK_PRODUCTS;
  const selectedMapping = mappings.find(m => m.accountNumber === accountNumber);
  const isNewAccount = !selectedMapping && accountNumber.length > 0;
  const kpiKey = taskTypeToKpiCategory[taskType] || taskType;
  const products = productTypes[kpiKey];
  const hasBasicFields = taskType && accountNumber;

  const filteredMappings = mappings.filter(m =>
    !accountSearch || m.accountNumber.includes(accountSearch) ||
    m.customerName.toLowerCase().includes(accountSearch.toLowerCase()) ||
    m.productType?.toLowerCase().includes(accountSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const taskData = {
        taskType, productType, accountNumber,
        customerName: isNewAccount ? customerName : undefined,
        accountType: isNewAccount ? accountType : undefined,
        amount: amount ? parseFloat(amount) : 0, remarks, taskDate,
      };
      const response = await tasksAPI.create(taskData);
      if (response.success) {
        setSubmittedTask(response.data);
        setMappingStatus(response.mappingInfo?.status || response.data.mappingStatus);
        setMappingInfo(response.mappingInfo);
        setTimeout(() => navigate('/tasks'), 2000);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to submit task');
    } finally { setLoading(false); }
  };

  const getMappingBadge = () => {
    if (!mappingStatus) return null;
    switch (mappingStatus) {
      case 'Mapped to You':
        return <Badge variant="success" className="flex items-center gap-1.5 text-xs"><CheckCircle2 className="h-3 w-3" />Mapped to You</Badge>;
      case 'Mapped to Another Staff':
        return <Badge variant="warning" className="flex items-center gap-1.5 text-xs"><AlertTriangle className="h-3 w-3" />Mapped to Another</Badge>;
      case 'Unmapped':
        return <Badge variant="destructive" className="flex items-center gap-1.5 text-xs"><XCircle className="h-3 w-3" />Unmapped – BM Approval</Badge>;
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/tasks')} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Daily Task Entry</h1>
          <p className="text-slate-500 text-sm mt-0.5">Submit your daily tasks and activities</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base">Task Details</CardTitle>
            <div className="flex gap-2 shrink-0">
              <Button type="submit" disabled={loading || !hasBasicFields || !accountNumber} className="h-9 px-5 text-sm">
                {loading ? 'Submitting...' : 'Submit Task'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/tasks')} disabled={loading} className="h-9 px-4 text-sm">
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Task Type *</Label>
                <Select value={taskType} onValueChange={(v) => { setTaskType(v); setProductType(''); }}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {taskTypes.filter((t, i, a) => a.indexOf(t) === i).map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {products && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Product Type</Label>
                  <Select value={productType} onValueChange={setProductType} disabled={!taskType}>
                    <SelectTrigger className="h-10"><SelectValue placeholder={taskType ? "Select (optional)" : "Pick task type"} /></SelectTrigger>
                    <SelectContent>
                      {products?.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500 flex items-center gap-1">Amount (ETB)</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" disabled={loading} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Task Date *</Label>
                <Input type="date" value={taskDate} onChange={e => setTaskDate(e.target.value)} required disabled={loading} className="h-10" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Account Number *</Label>
                <Input value={accountNumber}
                  onChange={e => { setAccountNumber(e.target.value); setMappingStatus(null); setMappingInfo(null); }}
                  placeholder="Enter account number..."
                  required disabled={loading}
                  className={`h-10 ${selectedMapping ? 'border-green-400 bg-green-50/40' : ''}`}
                />
              </div>
              {isNewAccount && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-blue-600">Customer Name (new account) *</Label>
                  <Input value={customerName} onChange={e => setCustomerName(e.target.value)}
                    placeholder="Full name" required={isNewAccount}
                    className="h-10 border-blue-300 bg-blue-50/20"
                  />
                </div>
              )}
              {selectedMapping && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-emerald-600">Matched Customer</Label>
                  <div className="flex items-center gap-2 h-10 px-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-sm font-semibold text-emerald-900">{selectedMapping.customerName}</span>
                    <span className="text-xs text-emerald-600 ml-auto">{selectedMapping.balance?.toLocaleString()} ETB</span>
                  </div>
                </div>
              )}
            </div>

            {isNewAccount && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-blue-600">Account Type (new account) *</Label>
                <Select value={accountType} onValueChange={setAccountType}>
                  <SelectTrigger className="h-10 border-blue-300 bg-blue-50/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Savings">Savings</SelectItem>
                    <SelectItem value="Current">Current</SelectItem>
                    <SelectItem value="Fixed_Deposit">Fixed Deposit</SelectItem>
                    <SelectItem value="Recurring_Deposit">Recurring Deposit</SelectItem>
                    <SelectItem value="Loan">Loan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {isNewAccount && (
              <p className="text-xs text-blue-600 italic flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                New unmapped account — will be submitted for BM approval
              </p>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Remarks</Label>
              <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional notes..." rows={2} disabled={loading} className="text-sm resize-none" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-slate-400" />
              Select Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by account number, customer name, or product..."
                value={accountSearch}
                onChange={e => setAccountSearch(e.target.value)}
                className="pl-10 h-10"
              />
            </div>

            <div className="table-scroll px-3 sm:px-0">
              <ResponsiveTable
                columns={[
                  {
                    key: 'select',
                    header: 'Select',
                    hideOnMobile: true,
                    render: (m: any) => (
                      <input
                        type="radio"
                        className="h-3.5 w-3.5 text-blue-600"
                        checked={accountNumber === m.accountNumber}
                        readOnly
                      />
                    ),
                  },
                  {
                    key: 'accountNumber',
                    header: 'Account #',
                    primary: true,
                    render: (m: any) => <span className="font-mono font-bold text-blue-600 text-xs">{m.accountNumber}</span>,
                  },
                  {
                    key: 'customerName',
                    header: 'Customer Name',
                    render: (m: any) => <span className="font-medium text-slate-800">{m.customerName}</span>,
                  },
                  {
                    key: 'productType',
                    header: 'Product',
                    render: (m: any) => <span className="text-slate-500 text-xs">{m.productType || '-'}</span>,
                  },
                  {
                    key: 'balance',
                    header: 'Balance',
                    className: 'text-right',
                    render: (m: any) => <span className="font-semibold text-slate-700 text-xs">{m.balance?.toLocaleString()} ETB</span>,
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    className: 'text-center',
                    render: () => (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Mapped
                      </span>
                    ),
                  },
                ]}
                data={filteredMappings}
                rowKey={(m: any) => m.id}
                onRowClick={(m: any) => { setAccountNumber(m.accountNumber); setMappingStatus(null); setMappingInfo(null); }}
                emptyMessage={
                  accountSearch ? 'No accounts match your search' : 'No accounts mapped to you yet'
                }
                mobileActions={(m: any) => (
                  <Button
                    type="button"
                    variant={accountNumber === m.accountNumber ? 'default' : 'outline'}
                    size="sm"
                    className="w-full"
                    onClick={(e) => { e.stopPropagation(); setAccountNumber(m.accountNumber); setMappingStatus(null); setMappingInfo(null); }}
                  >
                    {accountNumber === m.accountNumber ? 'Selected' : 'Select Account'}
                  </Button>
                )}
              />
            </div>

            {selectedMapping && getMappingBadge()}
          </CardContent>
        </Card>

        {mappingStatus && (
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
            <span className="text-xs font-medium text-slate-500">Mapping Status:</span>
            {getMappingBadge()}
            {mappingInfo?.canCountForKPI === false && (
              <span className="text-xs text-red-500">Won't count toward KPI until resolved</span>
            )}
          </div>
        )}

        {submittedTask && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Task submitted successfully</p>
              <p className="text-xs text-emerald-600">Redirecting to task list...</p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
