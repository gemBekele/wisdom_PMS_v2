import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ResponsiveTable from '@/components/ui/responsive-table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Eye, UserPlus, RefreshCw } from 'lucide-react';
import { mappingsAPI, branchesAPI, usersAPI } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';

export function MappingManagement() {
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [mappings, setMappings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [supervisedStaff, setSupervisedStaff] = useState<any[]>([]);
  const [staffFilter, setStaffFilter] = useState<string>('all');

  useEffect(() => {
    if (user?.role === 'admin') {
      loadBranches();
    }
    if (user?.role === 'supervisor') {
      loadSupervisedStaff();
    }
  }, []);

  const loadBranches = async () => {
    try {
      const res = await branchesAPI.getAll();
      if (res.success) {
        setBranches(res.data || []);
      }
    } catch (e) {
      console.error('Failed to load branches:', e);
    }
  };

  const loadSupervisedStaff = async () => {
    try {
      const res = await usersAPI.getAll({ supervisorId: user?.id });
      if (res.success) {
        setSupervisedStaff(res.data || []);
      }
    } catch (e) {
      console.error('Failed to load supervised staff:', e);
    }
  };

  useEffect(() => {
    loadMappings();
  }, [statusFilter, staffFilter]);

  const loadMappings = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (staffFilter !== 'all') {
        params.mappedTo = staffFilter;
      }
      const response = await mappingsAPI.getAll(params);
      if (response.success) {
        setMappings(response.data || []);
      }
    } catch (error) {
      console.error('Error loading mappings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoBalance = async () => {
    try {
      const branchId = user?.role === 'admin' ? selectedBranchId : user?.branchId;
      if (!branchId) {
        alert('Please select a branch first');
        return;
      }
      const response = await mappingsAPI.autoBalance(branchId);
      if (response.success) {
        alert(response.message || 'Auto-balance completed');
        loadMappings();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to auto-balance');
    }
  };

  const filteredMappings = mappings.filter((mapping) => {
    const matchesSearch =
      mapping.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mapping.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Mapping Management</h1>
        <p className="text-slate-600 mt-1">Manage account mappings and assignments</p>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by account number or customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Mapped</SelectItem>
                <SelectItem value="Inactive">Unmapped</SelectItem>
              </SelectContent>
            </Select>
            {user?.role === 'supervisor' && (
              <Select value={staffFilter} onValueChange={setStaffFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Filter by staff..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Team Members</SelectItem>
                  {user?.id && <SelectItem value={user.id}>{user.name} (Me)</SelectItem>}
                  {supervisedStaff.map((s: any) => (
                    <SelectItem key={s._id || s.id} value={s._id || s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {user?.role === 'admin' && (
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select branch..." />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b._id || b.id} value={b._id || b.id}>{b.name} ({b.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {(user?.role === 'branchManager' || user?.role === 'admin') && (
              <Button onClick={handleAutoBalance} disabled={user?.role === 'admin' && !selectedBranchId}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Auto-Balance Mapping
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Mapping Table */}
      <Card>
        <CardHeader>
          <CardTitle>Account Mapping</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="table-scroll px-3 sm:px-0">
              <ResponsiveTable
                columns={[
                  {
                    key: 'accountNumber',
                    header: 'Account #',
                    primary: true,
                    render: (mapping: any) => (
                      <code className="font-mono text-xs font-bold text-blue-600">{mapping.accountNumber}</code>
                    ),
                  },
                  {
                    key: 'customerName',
                    header: 'Customer Name',
                    render: (mapping: any) => <span className="font-medium">{mapping.customerName}</span>,
                  },
                  {
                    key: 'accountType',
                    header: 'Type',
                    render: (mapping: any) => <span className="text-xs text-slate-500">{mapping.accountType}</span>,
                  },
                  {
                    key: 'june_balance',
                    header: 'June 30 Balance',
                    className: 'text-right',
                    render: (mapping: any) => <span className="font-mono text-xs">{mapping.june_balance?.toLocaleString() || '0'}</span>,
                  },
                  {
                    key: 'current_balance',
                    header: 'Current Balance',
                    className: 'text-right',
                    render: (mapping: any) => <span className="font-mono text-sm font-bold">{mapping.current_balance?.toLocaleString() || '0'}</span>,
                  },
                  {
                    key: 'mappedTo',
                    header: 'Mapped To',
                    render: (mapping: any) =>
                      mapping.mappedTo?.name || <span className="text-slate-400">Not assigned</span>,
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (mapping: any) => (
                      <Badge variant={mapping.status === 'Active' ? 'success' : 'destructive'}>
                        {mapping.status}
                      </Badge>
                    ),
                  },
                  {
                    key: 'action',
                    header: 'Action',
                    className: 'text-center',
                    render: (mapping: any) => (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {mapping.status === 'Inactive' && (user?.role === 'branchManager' || user?.role === 'admin') && (
                          <Button variant="outline" size="sm">
                            <UserPlus className="h-4 w-4 mr-1" />
                            Assign
                          </Button>
                        )}
                      </div>
                    ),
                  },
                ]}
                data={filteredMappings}
                rowKey={(mapping: any) => mapping._id}
                emptyMessage="No accounts found"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
