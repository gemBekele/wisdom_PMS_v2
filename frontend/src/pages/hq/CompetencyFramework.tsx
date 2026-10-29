import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ResponsiveTable from '@/components/ui/responsive-table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Edit2, Check, X } from 'lucide-react';

const defaultCompetencies = [
  { id: 1, name: 'Communication', weight: 15, indicators: ['Clear verbal communication', 'Written reports quality', 'Active listening'] },
  { id: 2, name: 'Teamwork', weight: 12, indicators: ['Collaboration with colleagues', 'Conflict resolution', 'Knowledge sharing'] },
  { id: 3, name: 'Problem Solving', weight: 15, indicators: ['Analytical thinking', 'Solution implementation', 'Decision making'] },
  { id: 4, name: 'Adaptability', weight: 10, indicators: ['Change management', 'Flexibility', 'Learning agility'] },
  { id: 5, name: 'Leadership', weight: 15, indicators: ['Team motivation', 'Delegation', 'Mentoring'] },
  { id: 6, name: 'Customer Focus', weight: 18, indicators: ['Customer satisfaction', 'Service quality', 'Response time'] },
  { id: 7, name: 'Initiative', weight: 10, indicators: ['Proactive approach', 'Self-direction', 'Innovation'] },
  { id: 8, name: 'Reliability', weight: 5, indicators: ['Punctuality', 'Consistency', 'Accountability'] },
];

const roleWeights = [
  { role: 'staff', label: 'Staff', competencies: 'All 8', weight: 15, note: 'All competencies apply at 100%' },
  { role: 'supervisor', label: 'Supervisor', competencies: 'All 8', weight: 15, note: 'Leadership and Communication emphasized' },
  { role: 'branchManager', label: 'Branch Manager', competencies: 'All 8', weight: 15, note: 'Leadership, Customer Focus emphasized' },
  { role: 'areaManager', label: 'Area Manager', competencies: 'All 8', weight: 15, note: 'Leadership, Adaptability emphasized' },
  { role: 'admin', label: 'Admin / CEO', competencies: 'All 8', weight: 15, note: 'Full competency framework applies' },
];

export function CompetencyFramework() {
  const [competencies, setCompetencies] = useState(defaultCompetencies);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editWeights, setEditWeights] = useState<Record<number, number>>({});

  const totalWeight = competencies.reduce((sum, comp) => sum + comp.weight, 0);

  const startEdit = (id: number, currentWeight: number) => {
    setEditingId(id);
    setEditWeights({ ...editWeights, [id]: currentWeight });
  };

  const saveEdit = (id: number) => {
    const newWeight = editWeights[id];
    if (newWeight && newWeight > 0 && newWeight <= 100) {
      setCompetencies(prev => prev.map(c => c.id === id ? { ...c, weight: newWeight } : c));
    }
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Competency Framework</h1>
        <p className="text-slate-600 mt-1">Manage behavioral indicators and set weights per role</p>
      </div>

      <Tabs defaultValue="competencies">
        <TabsList>
          <TabsTrigger value="competencies">Competencies</TabsTrigger>
          <TabsTrigger value="roles">Role Weights</TabsTrigger>
        </TabsList>

        <TabsContent value="competencies" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Behavioral Competencies</CardTitle>
                <div className="text-sm">
                  <span className="text-slate-600">Total Weight: </span>
                  <span className={totalWeight === 100 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {totalWeight}%
                  </span>
                  {totalWeight !== 100 && (
                    <span className="text-red-500 text-xs ml-2">Must equal 100%</span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="table-scroll px-3 sm:px-0">
                <ResponsiveTable
                  columns={[
                    {
                      key: 'name',
                      header: 'Competency',
                      primary: true,
                      render: (comp: any) => <span className="font-medium text-slate-800">{comp.name}</span>,
                    },
                    {
                      key: 'weight',
                      header: 'Weight (%)',
                      className: 'text-center',
                      render: (comp: any) =>
                        editingId === comp.id ? (
                          <Input
                            type="number"
                            className="w-20 h-8"
                            value={editWeights[comp.id] || comp.weight}
                            onChange={(e) => setEditWeights({ ...editWeights, [comp.id]: parseInt(e.target.value) || 0 })}
                            min={0}
                            max={100}
                          />
                        ) : (
                          <Badge variant="outline">{comp.weight}%</Badge>
                        ),
                    },
                    {
                      key: 'indicators',
                      header: 'Behavioral Indicators',
                      render: (comp: any) => (
                        <ul className="list-disc list-inside text-sm text-slate-600">
                          {comp.indicators.map((ind: string, i: number) => (
                            <li key={i}>{ind}</li>
                          ))}
                        </ul>
                      ),
                    },
                    {
                      key: 'action',
                      header: 'Action',
                      className: 'text-center',
                      render: (comp: any) =>
                        editingId === comp.id ? (
                          <div className="flex gap-1 justify-center">
                            <Button variant="ghost" size="sm" onClick={() => saveEdit(comp.id)}>
                              <Check className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={cancelEdit}>
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => startEdit(comp.id, comp.weight)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        ),
                    },
                  ]}
                  data={competencies}
                  rowKey={(comp: any) => String(comp.id)}
                  mobileActions={(comp: any) =>
                    editingId === comp.id ? (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => saveEdit(comp.id)}>
                          <Check className="h-4 w-4 mr-1 text-emerald-600" /> Save
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" onClick={cancelEdit}>
                          <X className="h-4 w-4 mr-1 text-red-600" /> Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => startEdit(comp.id, comp.weight)}>
                        <Edit2 className="h-4 w-4 mr-1" /> Edit Weight
                      </Button>
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Role-Specific Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="table-scroll px-3 sm:px-0">
                <ResponsiveTable
                  columns={[
                    {
                      key: 'role',
                      header: 'Role',
                      primary: true,
                      render: (rw: any) => <span className="font-medium text-slate-800">{rw.label}</span>,
                    },
                    {
                      key: 'competencies',
                      header: 'Applicable Competencies',
                      render: (rw: any) => <span className="text-sm text-slate-700">{rw.competencies}</span>,
                    },
                    {
                      key: 'weight',
                      header: 'Weight in Final Score',
                      className: 'text-center',
                      render: (rw: any) => <Badge variant="outline">{rw.weight}%</Badge>,
                    },
                    {
                      key: 'note',
                      header: 'Notes',
                      render: (rw: any) => <span className="text-sm text-slate-600">{rw.note}</span>,
                    },
                  ]}
                  data={roleWeights}
                  rowKey={(rw: any) => rw.role}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
