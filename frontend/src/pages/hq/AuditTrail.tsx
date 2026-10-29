import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ResponsiveTable from '@/components/ui/responsive-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { auditAPI } from '@/lib/api';

export function AuditTrail() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');

  useEffect(() => {
    loadAuditLogs();
  }, [filterAction]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterAction !== 'all') {
        params.action = filterAction;
      }
      const response = await auditAPI.getAll(params);
      if (response.success) {
        setAuditLogs(response.data || []);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        log.user?.toLowerCase().includes(searchLower) ||
        log.action?.toLowerCase().includes(searchLower) ||
        log.entity?.toLowerCase().includes(searchLower) ||
        log.details?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Audit Trail</h1>
        <p className="text-slate-600 mt-1">View all system logs and activity history</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search logs..." 
                className="pl-10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="plan">Plan Changes</SelectItem>
                <SelectItem value="mapping">Mapping Edits</SelectItem>
                <SelectItem value="approval">Approvals</SelectItem>
                <SelectItem value="user">User Management</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading audit logs...</div>
          ) : (
            <div className="table-scroll px-3 sm:px-0">
              <ResponsiveTable
                columns={[
                  {
                    key: 'timestamp',
                    header: 'Timestamp',
                    primary: true,
                    render: (log: any) => (
                      <span className="text-sm text-slate-800">
                        {log.timestamp || log.createdAt ? new Date(log.timestamp || log.createdAt).toLocaleString() : 'N/A'}
                      </span>
                    ),
                  },
                  {
                    key: 'user',
                    header: 'User',
                    render: (log: any) => <span className="font-medium">{log.user || log.userName || 'N/A'}</span>,
                  },
                  {
                    key: 'action',
                    header: 'Action',
                    render: (log: any) => <Badge variant="outline">{log.action || 'N/A'}</Badge>,
                  },
                  {
                    key: 'entity',
                    header: 'Entity',
                    render: (log: any) => <span className="text-sm">{log.entity || log.entityName || 'N/A'}</span>,
                  },
                  {
                    key: 'details',
                    header: 'Details',
                    render: (log: any) => <span className="text-sm text-slate-600 break-words">{log.details || log.description || 'N/A'}</span>,
                  },
                ]}
                data={filteredLogs}
                rowKey={(log: any) => log._id || log.id}
                emptyMessage="No audit logs found"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

