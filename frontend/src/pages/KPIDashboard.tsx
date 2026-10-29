import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Star } from 'lucide-react';
import { dashboardAPI } from '@/lib/api';

const timeRanges = ['Day', 'Week', 'Month', 'Quarter', 'Year'];

const scoreColor = (s: number) => s >= 80 ? 'text-emerald-600' : s >= 60 ? 'text-amber-600' : 'text-red-600';
const badgeVariant = (s: number) => s >= 80 ? 'success' as const : s >= 60 ? 'warning' as const : 'destructive' as const;

export function KPIDashboard() {
  const [timeRange, setTimeRange] = useState('Month');
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await dashboardAPI.getStaff();
      if (response.success) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const getRatingStars = (score: number) => {
    if (score >= 90) return 5;
    if (score >= 80) return 4;
    if (score >= 70) return 3;
    if (score >= 60) return 2;
    return 1;
  };

  // Use real-time data from dashboard API
  const kpiBreakdown = dashboardData?.kpiBreakdown || {};
  const depositKPI = kpiBreakdown.deposit || {};
  
  // Calculate overall score from KPI data
  const kpiScore = depositKPI.percent || 0;
  const behavioralEval = dashboardData?.behavioralEvaluation;
  const behavioralScore = behavioralEval?.percentageScore || 0;
  const finalScore = kpiScore * 0.85 + behavioralScore * 0.15;
  
  const rating = finalScore >= 90 ? 'Outstanding' : 
                 finalScore >= 80 ? 'Very Good' : 
                 finalScore >= 70 ? 'Good' : 
                 finalScore >= 60 ? 'Needs Support' : 'Unsatisfactory';
  const stars = getRatingStars(finalScore);
  
  
  // Generate KPI contribution from breakdown
  const kpiContribution = Object.entries(kpiBreakdown).map(([key, value]: [string, any]) => ({
    category: key.charAt(0).toUpperCase() + key.slice(1),
    target: value.target || 0,
    actual: value.actual || 0,
    percent: value.percent || 0,
  }));
  
  // Radar data for behavioral evaluation
  const rawCompetencies = behavioralEval?.competencies || [];
  const radarData = rawCompetencies.length > 0
    ? rawCompetencies.map((c: any) => ({
        competency: c.competencyName || c.competency || 'N/A',
        score: Math.round((c.score / (c.maxScore || 5)) * 100),
      }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">KPI Dashboard</h1>
          <p className="text-slate-600 mt-1">Track your performance metrics and achievements</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timeRanges.map((range) => (
              <SelectItem key={range} value={range}>
                {range}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-2">Final Score</p>
              <p className={`text-4xl font-bold ${scoreColor(finalScore)}`}>{Math.round(finalScore)}%</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < stars ? 'fill-amber-500 text-amber-500' : 'text-slate-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm font-medium text-slate-700 mt-2">Rating: {rating}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-2">KPI Score (85%)</p>
              <p className={`text-4xl font-bold ${scoreColor(kpiScore)}`}>{Math.round(kpiScore)}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-2">Behavioral Score (15%)</p>
              <p className={`text-4xl font-bold ${scoreColor(behavioralScore)}`}>{Math.round(behavioralScore)}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-2">Overall Rating</p>
              <Badge variant={badgeVariant(finalScore)} className="text-lg px-4 py-2">
                {rating}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Achievement vs Target */}
        <Card>
          <CardHeader>
            <CardTitle>Achievement vs Target</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-slate-600">Deposit Target: {depositKPI.target?.toLocaleString() || 0} ETB</p>
              <p className="text-2xl font-bold text-emerald-600 mt-2">{depositKPI.actual?.toLocaleString() || 0} ETB</p>
              <p className={`text-sm mt-1 font-medium ${scoreColor(depositKPI.percent || 0)}`}>Achieved ({depositKPI.percent?.toFixed(1) || 0}%)</p>
            </div>
          </CardContent>
        </Card>

        {/* KPI Contribution */}
        <Card>
          <CardHeader>
            <CardTitle>KPI Contribution per Category</CardTitle>
          </CardHeader>
          <CardContent>
            {kpiContribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={kpiContribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="target" fill="#e2e8f0" name="Target" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" fill="#3b82f6" name="Actual" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-600">KPI Breakdown</p>
                <p className="text-sm text-slate-500 mt-1">Target: {depositKPI.target?.toLocaleString() || 0} ETB</p>
                <p className="text-sm text-slate-500">Actual: {depositKPI.actual?.toLocaleString() || 0} ETB</p>
                <p className="text-sm text-slate-500">Progress: {depositKPI.percent?.toFixed(1) || 0}%</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Behavioral vs Results Score</CardTitle>
        </CardHeader>
        <CardContent>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="competency" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar name="Performance" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-600">Behavioral Evaluation</p>
              <p className="text-sm text-slate-500 mt-1">Not yet evaluated</p>
              <p className="text-sm text-slate-500">Complete tasks and get rated by your manager</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

