import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ResponsiveTable from '@/components/ui/responsive-table';
import { TrendingUp, Users, Target, RefreshCw, Crown, Medal } from 'lucide-react';
import { getToken } from '@/lib/api';

function rankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-700" />;
  return <span className="text-sm font-bold text-slate-400">#{rank}</span>;
}

export function TeamStandings() {
  const { user } = useUser();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = () => {
    setLoading(true);
    setError('');
    fetch('/api/performance/team-standings', {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) setData(res.data);
        else setError(res.message || 'Failed to load');
      })
      .catch(() => setError('Failed to load standings'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" />
    </div>
  );

  if (error) return <div className="p-6 text-red-600 bg-red-50 rounded-md">{error}</div>;

  if (!data) return null;

  if (data.view === 'branch') {
    const teams = data.teamStandings || [];
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Branch Team Standings</h1>
            <p className="text-sm text-slate-500 mt-1">{teams.length} teams ranked by average achievement</p>
          </div>
          <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {teams.map((t: any) => (
            <Card key={t.teamId} className={`border shadow-sm ${t.rank === 1 ? 'border-yellow-300 bg-yellow-50/30' : t.rank === 2 ? 'border-slate-300 bg-slate-50/30' : t.rank === 3 ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'}`}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {rankIcon(t.rank)}
                    <span className="font-semibold text-slate-800">{t.teamName}</span>
                  </div>
                  <Badge variant={t.rank === 1 ? 'default' : 'secondary'} className="text-xs">#{t.rank}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Avg Achievement</span>
                  <span className={`font-bold text-lg ${t.averageAchievement >= 80 ? 'text-emerald-600' : t.averageAchievement >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                    {t.averageAchievement}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full transition-all ${t.averageAchievement >= 80 ? 'bg-emerald-500' : t.averageAchievement >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(t.averageAchievement, 100)}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{t.memberCount} members</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Team view (staff & supervisor)
  const members = data.members || [];
  const yourRank = data.yourRank;
  const totalMembers = data.totalMembers;

  const topMember = members[0];
  const avgComposite = members.reduce((s: number, m: any) => s + m.compositeScore, 0) / (members.length || 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Team Standings</h1>
          <p className="text-sm text-slate-500 mt-1">{totalMembers} members ranked by composite performance</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-yellow-200 bg-yellow-50/30 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Crown className="h-6 w-6 text-yellow-500" />
            <div>
              <p className="text-xs text-yellow-600 font-medium">Team Leader</p>
              <p className="text-sm font-bold text-slate-800 truncate">{topMember?.name || '-'}</p>
              <p className="text-xs text-slate-500">{topMember?.compositeScore} pts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Target className="h-6 w-6 text-blue-500" />
            <div>
              <p className="text-xs text-slate-500">Your Rank</p>
              <p className="text-2xl font-bold text-slate-800">#{yourRank || '-'}</p>
              <p className="text-xs text-slate-400">of {totalMembers}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-emerald-500" />
            <div>
              <p className="text-xs text-slate-500">Avg Score</p>
              <p className="text-xl font-bold text-slate-800">{Math.round(avgComposite)}</p>
              <p className="text-xs text-slate-400">composite</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-6 w-6 text-indigo-500" />
            <div>
              <p className="text-xs text-slate-500">Team Size</p>
              <p className="text-xl font-bold text-slate-800">{totalMembers}</p>
              <p className="text-xs text-slate-400">members</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-800">
            Leaderboard
            <span className="ml-2 text-sm font-normal text-slate-400">({members.length} members)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="table-scroll px-3 sm:px-0">
            <ResponsiveTable
              columns={[
                {
                  key: 'rank',
                  header: 'Rank',
                  className: 'text-center',
                  render: (m: any) => (
                    m.rank === 1 ? <Crown className="h-4 w-4 text-yellow-500" /> :
                    m.rank === 2 ? <Medal className="h-4 w-4 text-slate-400" /> :
                    m.rank === 3 ? <Medal className="h-4 w-4 text-amber-700" /> :
                    <span className="text-xs font-bold text-slate-400">#{m.rank}</span>
                  ),
                },
                {
                  key: 'name',
                  header: 'Name',
                  primary: true,
                  render: (m: any) => {
                    const isMe = m.id === user?.id;
                    return (
                      <span className={`font-medium ${isMe ? 'text-primary-700' : 'text-slate-800'}`}>
                        {m.name} {isMe && <Badge variant="default" className="text-[10px] px-1.5 py-0">You</Badge>}
                      </span>
                    );
                  },
                },
                {
                  key: 'position',
                  header: 'Position',
                  render: (m: any) => <span className="text-xs text-slate-500">{m.position || '-'}</span>,
                },
                {
                  key: 'mappedAccounts',
                  header: 'Accounts',
                  className: 'text-center',
                  render: (m: any) => <span className="font-mono text-xs text-slate-600">{m.mappedAccounts}</span>,
                },
                {
                  key: 'kpiAchievement',
                  header: 'Deposit%',
                  className: 'text-right',
                  render: (m: any) => (
                    <span className={`font-mono text-xs ${m.kpiAchievement >= 80 ? 'text-emerald-600' : m.kpiAchievement >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      {m.kpiAchievement}%
                    </span>
                  ),
                },
                {
                  key: 'collectionRate',
                  header: 'Collection%',
                  className: 'text-right',
                  render: (m: any) => (
                    <span className={`font-mono text-xs ${m.collectionRate >= 80 ? 'text-emerald-600' : m.collectionRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      {m.collectionRate}%
                    </span>
                  ),
                },
                {
                  key: 'portfolioQuality',
                  header: 'Portfolio%',
                  className: 'text-right',
                  render: (m: any) => (
                    <span className={`font-mono text-xs ${m.portfolioQuality >= 90 ? 'text-emerald-600' : m.portfolioQuality >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                      {m.portfolioQuality}%
                    </span>
                  ),
                },
                {
                  key: 'compositeScore',
                  header: 'Composite',
                  className: 'text-right',
                  render: (m: any) => (
                    <span className={`font-bold text-sm ${m.compositeScore >= 80 ? 'text-emerald-600' : m.compositeScore >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      {m.compositeScore}
                    </span>
                  ),
                },
              ]}
              data={members}
              rowKey={(m: any) => m.id}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {user?.id && members.filter((m: any) => m.id === user?.id).map((me: any) => (
          <Card key="my-breakdown" className="border border-primary-200 bg-primary-50/20 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-primary-800">Your Performance Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Deposit Mobilization', value: me.kpiAchievement, weight: '40% of score' },
                { label: 'Collection Rate', value: me.collectionRate, weight: '30% of score' },
                { label: 'Portfolio Quality', value: me.portfolioQuality, weight: '30% of score' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="text-slate-500">{item.value}% · {item.weight}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className={`h-2 rounded-full ${item.value >= 80 ? 'bg-emerald-500' : item.value >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(item.value, 100)}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-800">Team Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Top Performer</span>
              <span className="font-medium text-slate-800">{topMember?.name} ({topMember?.compositeScore} pts)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Your Rank</span>
              <span className="font-medium text-slate-800">#{yourRank} of {totalMembers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Average Composite</span>
              <span className="font-medium text-slate-800">{Math.round(avgComposite)}</span>
            </div>
            {(() => {
              const myScore = members.find((m: any) => m.id === user?.id)?.compositeScore || 0;
              const ahead = members.filter((m: any) => m.id !== user?.id && m.compositeScore > myScore);
              const behind = members.filter((m: any) => m.id !== user?.id && m.compositeScore <= myScore);
              const nextUp = members.find((m: any) => m.rank === ((yourRank || 1) - 1));
              return (
                <>
                  {yourRank && yourRank <= 3 && (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs">
                      Great job! You're in the top {Math.round((yourRank / totalMembers) * 100)}% of your team.
                    </div>
                  )}
                  {ahead.length > 0 && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs">
                      <span className="font-medium">Gap to beat:</span> {ahead.length} people ahead of you.
                      {nextUp && <> Next: <strong>{nextUp.name}</strong> at {nextUp.compositeScore} pts.</>}
                    </div>
                  )}
                  {behind.length > 0 && (
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-xs">
                      You're ahead of {behind.length} team members. Keep it up!
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
