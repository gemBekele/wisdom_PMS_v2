import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ResponsiveTable from '@/components/ui/responsive-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Key, Trash2, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usersAPI } from '@/lib/api';

export function UserManagement() {
  const [showForm, setShowForm] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    email: '',
    password: '',
    role: '',
    position: '',
    branch_code: '',
    supervisorId: '',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll();
      if (response.success) {
        setUsers(response.data || []);
        setSupervisors((response.data || []).filter((u: any) => u.role === 'supervisor'));
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingId(null);
    setFormData({ employeeId: '', name: '', email: '', password: '', role: '', position: '', branch_code: '', supervisorId: '' });
    setShowForm(true);
  };

  const openEditForm = (user: any) => {
    setEditingId(user._id);
    setFormData({
      employeeId: user.employeeId || '',
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || '',
      position: user.position || '',
      branch_code: user.branch_code || '',
      supervisorId: user.supervisorId || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = { ...formData };
      if (!payload.password && editingId) delete (payload as any).password;
      if (!payload.supervisorId) delete (payload as any).supervisorId;

      if (editingId) {
        await usersAPI.update(editingId, payload);
      } else {
        await usersAPI.create(payload);
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ employeeId: '', name: '', email: '', password: '', role: '', position: '', branch_code: '', supervisorId: '' });
      loadUsers();
    } catch (error: any) {
      alert(error.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">User & Role Management</h1>
          <p className="text-slate-600 mt-1">Create, edit, and manage staff accounts, roles, and team assignments</p>
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="h-4 w-4 mr-2" />
          Add New User
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editingId ? 'Edit User' : 'Create New User'}</CardTitle>
            <Button variant="ghost" size="sm" onClick={cancelForm}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee ID *</Label>
                  <Input id="employeeId" value={formData.employeeId} onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })} required disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{editingId ? 'New Password (leave blank to keep)' : 'Password *'}</Label>
                  <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required={!editingId} disabled={loading} minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value, supervisorId: '' })}>
                    <SelectTrigger id="role"><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="areaManager">Area Manager</SelectItem>
                      <SelectItem value="branchManager">Branch Manager</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position *</Label>
                  <Select value={formData.position} onValueChange={(value) => setFormData({ ...formData, position: value })} required disabled={!formData.role}>
                    <SelectTrigger id="position"><SelectValue placeholder={formData.role ? "Select position" : "Select role first"} /></SelectTrigger>
                    <SelectContent>
                      {formData.role === 'admin' && <SelectItem value="CEO">CEO</SelectItem>}
                      {formData.role === 'areaManager' && <SelectItem value="Area_Manager">Area Manager</SelectItem>}
                      {formData.role === 'branchManager' && <SelectItem value="Branch_Manager">Branch Manager</SelectItem>}
                      {formData.role === 'supervisor' && (
                        <>
                          <SelectItem value="Operation_Supervisor">Operation Supervisor</SelectItem>
                          <SelectItem value="Customer_Relationship_Supervisor">Customer Relationship Supervisor</SelectItem>
                        </>
                      )}
                      {formData.role === 'staff' && (
                        <>
                          <SelectItem value="Customer_Service_Officer_I">Customer Service Officer I</SelectItem>
                          <SelectItem value="Customer_Service_Officer_II">Customer Service Officer II</SelectItem>
                          <SelectItem value="Customer_Relationship_Officer_I">Customer Relationship Officer I</SelectItem>
                          <SelectItem value="Sales_Marketing_Officer_I">Sales & Marketing Officer I</SelectItem>
                          <SelectItem value="Internal_Auditor">Internal Auditor</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch_code">Branch Code *</Label>
                  <Input id="branch_code" value={formData.branch_code} onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })} placeholder="e.g., WOLAYTA_SODO" required disabled={loading || formData.role === 'admin'} />
                </div>
                {formData.role === 'staff' && supervisors.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="supervisorId">Assign to Supervisor (Group)</Label>
                    <Select value={formData.supervisorId} onValueChange={(value) => setFormData({ ...formData, supervisorId: value })}>
                      <SelectTrigger id="supervisorId"><SelectValue placeholder="Select a supervisor" /></SelectTrigger>
                      <SelectContent>
                        {supervisors.map((sup) => (
                          <SelectItem key={sup._id} value={sup._id}>{sup.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-slate-400">Assigning to a supervisor creates a team/group</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>{editingId ? 'Update User' : 'Create User'}</Button>
                <Button type="button" variant="outline" onClick={cancelForm} disabled={loading}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="table-scroll px-3 sm:px-0">
              <ResponsiveTable
                columns={[
                  {
                    key: 'employeeId',
                    header: 'Employee ID',
                    primary: true,
                    render: (user: any) => <code className="font-mono text-xs font-bold text-blue-600">{user.employeeId}</code>,
                  },
                  {
                    key: 'name',
                    header: 'Name',
                    render: (user: any) => <span className="font-medium text-slate-800">{user.name}</span>,
                  },
                  {
                    key: 'email',
                    header: 'Email',
                    render: (user: any) => <span className="text-sm">{user.email}</span>,
                  },
                  {
                    key: 'role',
                    header: 'Role',
                    render: (user: any) => <Badge variant="outline">{user.role}</Badge>,
                  },
                  {
                    key: 'branch',
                    header: 'Branch',
                    render: (user: any) => <span className="text-xs text-slate-500">{user.branch_code || 'N/A'}</span>,
                  },
                  {
                    key: 'position',
                    header: 'Position',
                    render: (user: any) => <span>{(user.position || '').replace(/_/g, ' ')}</span>,
                  },
                  {
                    key: 'supervisor',
                    header: 'Supervisor',
                    render: (user: any) => {
                      const sup = supervisors.find(s => s._id === user.supervisorId);
                      return <span className="text-xs text-slate-500">{sup ? sup.name : '-'}</span>;
                    },
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (user: any) => (
                      <Badge variant={user.isActive ? 'success' : 'destructive'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
                    ),
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    className: 'text-center',
                    render: (user: any) => (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditForm(user)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm"><Key className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    ),
                  },
                ]}
                data={users}
                rowKey={(user: any) => user._id}
                emptyMessage="No users found"
                mobileActions={(user: any) => (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditForm(user)}>
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                  </div>
                )}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
