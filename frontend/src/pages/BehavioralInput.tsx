import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usersAPI, behavioralAPI } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';

export function BehavioralInput() {
  const { user } = useUser();
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [period, setPeriod] = useState('');
  const [scores, setScores] = useState<any>({});
  const [comments, setComments] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const response = await usersAPI.getAll();
      if (response.success) {
        setEmployees(response.data?.filter((u: any) => u.supervisorId === user?._id && u.role !== 'admin') || []);
      }
    } catch (error) {
      setEmployees([]);
    }
  };

  const competencies = [
    { id: 'communication', name: 'Communication Skills' },
    { id: 'teamwork', name: 'Teamwork' },
    { id: 'problem_solving', name: 'Problem Solving' },
    { id: 'initiative', name: 'Initiative & Proactivity' },
    { id: 'adaptability', name: 'Adaptability' },
    { id: 'customer_service', name: 'Customer Service' },
  ];

  const handleScoreChange = (competencyId: string, value: string) => {
    setScores({ ...scores, [competencyId]: parseInt(value) });
  };

  const handleCommentChange = (competencyId: string, value: string) => {
    setComments({ ...comments, [competencyId]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !period) {
      alert('Please select an employee and period');
      return;
    }

    setSubmitting(true);
    try {
      const competenciesData = competencies.map(comp => ({
        competencyId: comp.id,
        competencyName: comp.name,
        score: scores[comp.id] || 0,
        comments: comments[comp.id] || '',
      }));

      const overallScore = Math.round(
        competenciesData.reduce((sum, comp) => sum + comp.score, 0) / competenciesData.length
      );

      await behavioralAPI.create({
        employeeId: selectedEmployee,
        period,
        competencies: competenciesData,
        overallScore,
        submittedBy: user?._id,
      });

      alert('Behavioral evaluation submitted successfully!');
      // Reset form
      setSelectedEmployee('');
      setPeriod('');
      setScores({});
      setComments({});
    } catch (error: any) {
      alert('Error submitting evaluation: ' + (error.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Behavioral Input</h1>
        <p className="text-slate-600 mt-2">Submit behavioral evaluations for your team members</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Behavioral Evaluation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee">Employee</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp: any) => (
                      <SelectItem key={emp._id} value={emp._id}>
                        {emp.name} ({emp.employeeId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="period">Period</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024-Q1">2024 Q1</SelectItem>
                    <SelectItem value="2024-Q2">2024 Q2</SelectItem>
                    <SelectItem value="2024-Q3">2024 Q3</SelectItem>
                    <SelectItem value="2024-Q4">2024 Q4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Competency Evaluation</h3>
              {competencies.map((comp) => (
                <Card key={comp.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>{comp.name}</Label>
                        <Select
                          value={scores[comp.id]?.toString() || ''}
                          onValueChange={(value) => handleScoreChange(comp.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Score" />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 1, 2, 3, 4, 5].map((score) => (
                              <SelectItem key={score} value={score.toString()}>
                                {score}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Textarea
                        placeholder="Add comments..."
                        value={comments[comp.id] || ''}
                        onChange={(e) => handleCommentChange(comp.id, e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Evaluation'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

