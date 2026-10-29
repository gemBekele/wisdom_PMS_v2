import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ResponsiveTable from '@/components/ui/responsive-table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Plus, Trash2, RefreshCw } from 'lucide-react';
import { productMappingAPI, cbsAPI } from '@/lib/api';

export const productCategories = [
  'Loan Saving Deposit', 'Michu Current Saving', 'Gihon Regular Saving',
  'Mothers Saving', 'Young Womens Saving', 'Elders Saving',
  'Children Saving', 'Fixed Time Deposit', 'Premium Saving Deposit',
  'Special Saving', 'Segment Deposit', 'Wadiah IFB Deposit',
];

const kpiCategories = [
  'Account Productivity',
  'Deposit Mobilization',
  'New Member Registration',
  'New Account Opening',
  'Share Capital Growth',
  'Mobile Banking Users',
  'Merchant POS Growth',
  'Billers Recruitment',
  'Internal Operations',
];

export function ProductMapping() {
  const [mappings, setMappings] = useState<any[]>([]);
  const [unmappedProducts, setUnmappedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    cbs_product_name: '',
    kpi_category: '',
    notes: '',
  });

  useEffect(() => {
    loadMappings();
    loadUnmappedProducts();
  }, []);

  const loadMappings = async () => {
    try {
      setLoading(true);
      const response = await productMappingAPI.getAll({ status: 'active' });
      if (response.success) {
        setMappings(response.data || []);
      }
    } catch (error) {
      console.error('Error loading mappings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnmappedProducts = async () => {
    try {
      // Get unmapped products from recent CBS validations
      const cbsResponse = await cbsAPI.getAll({ limit: 10 });
      if (cbsResponse.success && cbsResponse.data) {
        const allUnmapped: any[] = [];
        cbsResponse.data.forEach((validation: any) => {
          if (validation.unmappedProducts && validation.unmappedProducts.length > 0) {
            validation.unmappedProducts.forEach((product: any) => {
              // Check if already mapped
              const isMapped = mappings.some(m => m.cbs_product_name === product.productName);
              if (!isMapped) {
                allUnmapped.push({
                  ...product,
                  validationDate: validation.validationDate,
                  branchId: validation.branchId,
                });
              }
            });
          }
        });
        // Remove duplicates
        const unique = Array.from(
          new Map(allUnmapped.map(p => [p.productName, p])).values()
        );
        setUnmappedProducts(unique);
      }
    } catch (error) {
      console.error('Error loading unmapped products:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cbs_product_name || !formData.kpi_category) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const response = await productMappingAPI.create(formData);
      if (response.success) {
        alert('Product mapping created successfully!');
        setFormData({ cbs_product_name: '', kpi_category: '', notes: '' });
        setShowForm(false);
        await loadMappings();
        await loadUnmappedProducts();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to create mapping');
    } finally {
      setLoading(false);
    }
  };

  const handleMapUnmapped = async (productName: string, kpiCategory: string) => {
    try {
      setLoading(true);
      const response = await productMappingAPI.create({
        cbs_product_name: productName,
        kpi_category: kpiCategory,
      });
      if (response.success) {
        alert('Product mapped successfully!');
        await loadMappings();
        await loadUnmappedProducts();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to map product');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mapping?')) return;

    try {
      setLoading(true);
      const response = await productMappingAPI.delete(id);
      if (response.success) {
        alert('Mapping deleted successfully!');
        await loadMappings();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to delete mapping');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Product KPI Mapping</h1>
          <p className="text-slate-600 mt-1">Map CBS products to KPI categories</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              loadMappings();
              loadUnmappedProducts();
            }}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Mapping
          </Button>
        </div>
      </div>

      {/* Unmapped Products Alert */}
      {unmappedProducts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Unmapped Products Found ({unmappedProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700 mb-4">
              The following products were found in CBS files but are not mapped to any KPI category.
              Please map them to ensure accurate KPI calculations.
            </p>
            <div className="space-y-2">
              {unmappedProducts.map((product) => (
                <div
                  key={product.productName}
                  className="flex items-center justify-between p-3 bg-white border border-amber-200 rounded-md"
                >
                  <div>
                    <p className="font-semibold text-slate-800">{product.productName}</p>
                    <p className="text-xs text-slate-600">
                      {product.accountCount ?? 0} accounts • {(product.totalBalance ?? 0).toLocaleString()} ETB
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      onValueChange={(value) => handleMapUnmapped(product.productName, value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select KPI Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {kpiCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Mapping Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Product Mapping</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cbs_product_name">CBS Product Name *</Label>
                <Input
                  id="cbs_product_name"
                  value={formData.cbs_product_name}
                  onChange={(e) => setFormData({ ...formData, cbs_product_name: e.target.value })}
                  placeholder="e.g., Felagot Saving"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="kpi_category">KPI Category *</Label>
                <Select
                  value={formData.kpi_category}
                  onValueChange={(value) => setFormData({ ...formData, kpi_category: value })}
                >
                  <SelectTrigger id="kpi_category">
                    <SelectValue placeholder="Select KPI Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {kpiCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Mapping'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ cbs_product_name: '', kpi_category: '', notes: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Mappings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Product Mappings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-slate-500">Loading...</p>
          ) : (
            <div className="table-scroll px-3 sm:px-0">
              <ResponsiveTable
                columns={[
                  {
                    key: 'cbs_product_name',
                    header: 'Product Name',
                    primary: true,
                    render: (mapping: any) => <span className="font-medium text-slate-800">{mapping.cbs_product_name}</span>,
                  },
                  {
                    key: 'kpi_category',
                    header: 'KPI Category',
                    render: (mapping: any) => <Badge variant="outline">{mapping.kpi_category}</Badge>,
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    className: 'text-center',
                    render: (mapping: any) => (
                      <Badge variant={mapping.status === 'active' ? 'success' : 'warning'}>
                        {mapping.status}
                      </Badge>
                    ),
                  },
                  {
                    key: 'mappedBy',
                    header: 'Mapped By',
                    render: (mapping: any) => <span className="text-sm text-slate-600">{mapping.mappedBy?.name || 'N/A'}</span>,
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    className: 'text-center',
                    render: (mapping: any) => (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(mapping._id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ),
                  },
                ]}
                data={mappings}
                rowKey={(mapping: any) => mapping._id}
                emptyMessage="No product mappings found"
                mobileActions={(mapping: any) => (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(mapping._id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </Button>
                )}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

