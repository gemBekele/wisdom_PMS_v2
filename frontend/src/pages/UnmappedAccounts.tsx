import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ResponsiveTable from '@/components/ui/responsive-table';
import { Users, Banknote, Search, RefreshCw } from 'lucide-react';
import { getToken } from '@/lib/api';

function formatBirr(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function UnmappedAccounts() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchData = (p = page) => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (branchFilter) params.set('branch_code', branchFilter);
    params.set('page', String(p));
    params.set('limit', '100');

    fetch(`/api/mapped-accounts/unmapped?${params}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setAccounts(res.data || []);
          setPagination(res.pagination);
        } else {
          setError(res.message || 'Failed to load');
        }
      })
      .catch(() => setError('Failed to load unmapped accounts'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [page]);

  const totalBalance = accounts.reduce((s, a) => s + (a.currentBalance || 0), 0);
  const totalJune = accounts.reduce((s, a) => s + (a.juneBalance || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" />
    </div>
  );

  if (error) return <div className="p-6 text-red-600 bg-red-50 rounded-md">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Unmapped Accounts</h1>
          <p className="text-sm text-slate-500 mt-1">
            Accounts not yet assigned to any staff member
            {pagination && <span className="ml-2 text-xs text-slate-400">({pagination.total} total)</span>}
          </p>
        </div>
        <button
          onClick={() => fetchData()}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50"><Users className="h-5 w-5 text-blue-600" /></div>
            <div><p className="text-xs text-slate-500">Unmapped Accounts</p><p className="text-xl font-bold text-slate-800">{pagination?.total || 0}</p></div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-50"><Banknote className="h-5 w-5 text-indigo-600" /></div>
            <div><p className="text-xs text-slate-500">Total Balance</p><p className="text-xl font-bold text-slate-800">{formatBirr(totalBalance)}</p></div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50"><Banknote className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-xs text-slate-500">June Balance</p><p className="text-xl font-bold text-slate-800">{formatBirr(totalJune)}</p></div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50"><Banknote className="h-5 w-5 text-emerald-600" /></div>
            <div><p className="text-xs text-slate-500">Balance Diff</p><p className={`text-xl font-bold ${totalBalance - totalJune >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {totalBalance - totalJune >= 0 ? '+' : ''}{formatBirr(totalBalance - totalJune)}
            </p></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Filter by branch code..."
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value.toUpperCase())}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => { setPage(1); fetchData(1); }}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Search
        </button>
      </div>

      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-800">
            Unmapped Accounts List
            <span className="ml-2 text-sm font-normal text-slate-400">({accounts.length} shown)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="table-scroll px-3 sm:px-0">
            <ResponsiveTable
              columns={[
                {
                  key: 'accountNumber',
                  header: 'Account #',
                  primary: true,
                  render: (acct: any) => (
                    <code className="font-mono text-xs font-bold text-blue-600">{acct.accountNumber}</code>
                  ),
                },
                {
                  key: 'customerName',
                  header: 'Customer Name',
                  render: (acct: any) => <span className="font-medium text-slate-800">{acct.customerName}</span>,
                },
                {
                  key: 'product',
                  header: 'Product',
                  render: (acct: any) => <span className="text-xs text-slate-500">{acct.product || '-'}</span>,
                },
                {
                  key: 'branch',
                  header: 'Branch',
                  render: (acct: any) => <span className="text-xs text-slate-500">{acct.branch?.code || acct.branch?.name || '-'}</span>,
                },
                {
                  key: 'currentBalance',
                  header: 'Current Balance',
                  className: 'text-right',
                  render: (acct: any) => <span className="font-mono text-sm">{formatBirr(acct.currentBalance || 0)}</span>,
                },
                {
                  key: 'juneBalance',
                  header: 'June Balance',
                  className: 'text-right',
                  render: (acct: any) => <span className="font-mono text-sm text-slate-600">{formatBirr(acct.juneBalance || 0)}</span>,
                },
                {
                  key: 'difference',
                  header: 'Difference',
                  className: 'text-right',
                  render: (acct: any) => {
                    const diff = acct.difference || 0;
                    return (
                      <span className={`font-mono text-sm ${diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        {diff > 0 ? '+' : ''}{formatBirr(diff)}
                      </span>
                    );
                  },
                },
                {
                  key: 'status',
                  header: 'Status',
                  className: 'text-center',
                  render: (acct: any) => (
                    <Badge variant={acct.activeStatus ? 'default' : 'secondary'} className="text-xs">
                      {acct.activeStatus ? 'Active' : 'Inactive'}
                    </Badge>
                  ),
                },
              ]}
              data={accounts}
              rowKey={(acct: any) => acct.id}
              emptyMessage="All accounts are mapped. No unmapped accounts found."
            />
          </div>
        </CardContent>
      </Card>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            disabled={page >= pagination.pages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
