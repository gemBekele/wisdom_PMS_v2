import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ResponsiveTable from '@/components/ui/responsive-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { branchesAPI, regionsAPI, areasAPI } from '@/lib/api';

export function BranchManagement() {
  const [showForm, setShowForm] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    regionId: '',
    areaId: '',
    managerId: '',
    address: '',
    phone: '',
    isActive: true,
  });

  useEffect(() => {
    loadBranches();
    loadRegions();
    loadManagers();
  }, []);

  useEffect(() => {
    if (formData.regionId) {
      loadAreas(formData.regionId);
    } else {
      setAreas([]);
    }
  }, [formData.regionId]);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const response = await branchesAPI.getAll();
      if (response.success) {
        setBranches(response.data || []);
      }
    } catch (error) {
      console.error('Error loading branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRegions = async () => {
    try {
      const response = await regionsAPI.getAll({ isActive: 'true' });
      if (response.success) {
        setRegions(response.data || []);
      }
    } catch (error) {
      console.error('Error loading regions:', error);
    }
  };

  const loadAreas = async (regionId: string) => {
    try {
      const response = await areasAPI.getAll({ regionId, isActive: 'true' });
      if (response.success) {
        setAreas(response.data || []);
      }
    } catch (error) {
      console.error('Error loading areas:', error);
    }
  };

  const loadManagers = async () => {
    try {
      // Get all Branch Managers
      const { usersAPI } = await import('@/lib/api');
      const response = await usersAPI.getAll({ role: 'branchManager' });
      if (response.success) {
        setManagers(response.data || []);
      }
    } catch (error) {
      console.error('Error loading managers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const submitData = {
        ...formData,
        managerId: formData.managerId === 'unassigned' ? undefined : (formData.managerId || undefined),
      };

      if (editingId) {
        await branchesAPI.update(editingId, submitData);
        alert('Branch updated successfully!');
      } else {
        await branchesAPI.create(submitData);
        alert('Branch created successfully!');
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        code: '',
        regionId: '',
        areaId: '',
        managerId: '',
        address: '',
        phone: '',
        isActive: true,
      });
      loadBranches();
    } catch (error: any) {
      alert(error.message || 'Failed to save branch');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (branch: any) => {
    setEditingId(branch._id);
    setFormData({
      name: branch.name,
      code: branch.code,
      regionId: branch.regionId?._id || branch.regionId || '',
      areaId: branch.areaId?._id || branch.areaId || '',
      managerId: branch.managerId?._id || branch.managerId || 'unassigned',
      address: branch.address || '',
      phone: branch.phone || '',
      isActive: branch.isActive !== false,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this branch? This will mark it as inactive but preserve historical data.')) {
      return;
    }

    try {
      setLoading(true);
      await branchesAPI.delete(id);
      alert('Branch deactivated successfully!');
      loadBranches();
    } catch (error: any) {
      alert(error.message || 'Failed to deactivate branch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Branch Management</h1>
          <p className="text-slate-600 mt-1">Create, edit, and manage branches in the organization</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Branch
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit' : 'Create'} Branch</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Branch Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Wolayta Sodo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Branch Code *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., WOLAYTA_SODO"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="regionId">Region *</Label>
                  <Select
                    value={formData.regionId}
                    onValueChange={(value) => setFormData({ ...formData, regionId: value, areaId: '' })}
                    required
                  >
                    <SelectTrigger id="regionId">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((region: any) => (
                        <SelectItem key={region._id} value={region._id}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="areaId">Area *</Label>
                  <Select
                    value={formData.areaId}
                    onValueChange={(value) => setFormData({ ...formData, areaId: value })}
                    required
                    disabled={!formData.regionId}
                  >
                    <SelectTrigger id="areaId">
                      <SelectValue placeholder={formData.regionId ? 'Select area' : 'Select region first'} />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((area: any) => (
                        <SelectItem key={area._id} value={area._id}>
                          {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="managerId">Branch Manager (Optional)</Label>
                  <Select
                    value={formData.managerId}
                    onValueChange={(value) => setFormData({ ...formData, managerId: value })}
                  >
                    <SelectTrigger id="managerId">
                      <SelectValue placeholder="Select manager (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">None (Unassigned)</SelectItem>
                      {managers.map((manager: any) => (
                        <SelectItem key={manager._id} value={manager._id}>
                          {manager.name} ({manager.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g., +251 11 123 4567"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Branch address"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {editingId ? 'Update' : 'Create'} Branch
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({
                      name: '',
                      code: '',
                      regionId: '',
                      areaId: '',
                      managerId: '',
                      address: '',
                      phone: '',
                      isActive: true,
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Branches</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && branches.length === 0 ? (
            <div className="text-center py-8">Loading branches...</div>
          ) : (
            <div className="table-scroll px-3 sm:px-0">
              <ResponsiveTable
                columns={[
                  {
                    key: 'name',
                    header: 'Name',
                    primary: true,
                    render: (branch: any) => <span className="font-medium text-slate-800">{branch.name}</span>,
                  },
                  {
                    key: 'code',
                    header: 'Code',
                    render: (branch: any) => <code className="font-mono text-xs text-blue-600">{branch.code}</code>,
                  },
                  {
                    key: 'region',
                    header: 'Region',
                    render: (branch: any) => <span className="text-xs text-slate-500">{branch.regionId?.name || 'N/A'}</span>,
                  },
                  {
                    key: 'area',
                    header: 'Area',
                    render: (branch: any) => <span className="text-xs text-slate-500">{branch.areaId?.name || 'N/A'}</span>,
                  },
                  {
                    key: 'manager',
                    header: 'Manager',
                    render: (branch: any) => <span>{branch.managerId?.name || 'Unassigned'}</span>,
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    className: 'text-center',
                    render: (branch: any) => (
                      <Badge variant={branch.isActive ? 'default' : 'secondary'}>
                        {branch.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    ),
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    className: 'text-center',
                    render: (branch: any) => (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(branch)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(branch._id)}
                          disabled={!branch.isActive}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ),
                  },
                ]}
                data={branches}
                rowKey={(branch: any) => branch._id}
                emptyMessage="No branches found"
                mobileActions={(branch: any) => (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(branch)}>
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDelete(branch._id)} disabled={!branch.isActive}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
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

