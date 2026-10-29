import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import { teamsAPI, usersAPI } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';


const getInitials = (name: string) =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

export function TeamManagement() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffTeamMap, setStaffTeamMap] = useState<Record<string, string>>({});

  const [teamForm, setTeamForm] = useState({ name: '', code: '', managerId: 'unassigned', memberIds: [] as string[] });
  const [editTeam, setEditTeam] = useState<any>(null);
  const [editMemberIds, setEditMemberIds] = useState<string[]>([]);

  useEffect(() => {
    loadAll();
  }, []);

  const getBranchId = () => {
    return typeof user?.branchId === 'string' ? user.branchId : (user as any)?.branchId?._id || (user as any)?.branchId || '';
  };

  const buildStaffTeamMap = (teamsList: any[]) => {
    const map: Record<string, string> = {};
    for (const t of teamsList) {
      for (const m of t.members || []) {
        map[m.id] = t.name;
      }
    }
    return map;
  };

  const loadAll = async () => {
    try {
      setLoading(true);
      const branchId = getBranchId();
      const branchParam = branchId ? { branchId } : {};
      const [tRes, supRes, staffRes] = await Promise.all([
        teamsAPI.getAll(branchParam),
        usersAPI.getAll({ role: 'supervisor' }),
        usersAPI.getAll({ role: 'staff', branchId }),
      ]);
      if (tRes.success) {
        setTeams(tRes.data || []);
        setStaffTeamMap(buildStaffTeamMap(tRes.data || []));
      }
      if (supRes.success) setSupervisors(supRes.data || []);
      if (staffRes.success) setStaffList(staffRes.data || []);
    } catch (err) {
      console.error('Error loading teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async () => {
    if (!teamForm.name || !teamForm.code) {
      alert('Name and code are required');
      return;
    }
    try {
      setLoading(true);
      const branchId = getBranchId();
      await teamsAPI.create({
        name: teamForm.name,
        code: teamForm.code,
        managerId: teamForm.managerId === 'unassigned' ? undefined : (teamForm.managerId || undefined),
        memberIds: teamForm.memberIds,
        branchId,
      });
      setTeamForm({ name: '', code: '', managerId: 'unassigned', memberIds: [] });
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const editTeamMembers = async () => {
    if (!editTeam) return;
    try {
      setLoading(true);
      await teamsAPI.update(editTeam._id || editTeam.id, { memberIds: editMemberIds });
      setEditTeam(null);
      setEditMemberIds([]);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to update team');
    } finally {
      setLoading(false);
    }
  };

  const deleteTeam = async (id: string) => {
    if (!confirm('Deactivate this team?')) return;
    try {
      await teamsAPI.delete(id);
      await loadAll();
    } catch (err: any) {
      alert(err.message || 'Failed to deactivate team');
    }
  };

  const toggleMember = (id: string) => {
    if (staffTeamMap[id]) return;
    setTeamForm(prev => ({
      ...prev,
      memberIds: prev.memberIds.includes(id)
        ? prev.memberIds.filter(x => x !== id)
        : [...prev.memberIds, id],
    }));
  };

  const toggleEditMember = (id: string) => {
    setEditMemberIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const openEdit = (team: any) => {
    setEditTeam(team);
    setEditMemberIds((team.members || []).map((m: any) => m.id));
  };

  const isInOtherTeam = (staffId: string, currentTeamId?: string) => {
    for (const t of teams) {
      if (currentTeamId && (t._id || t.id) === currentTeamId) continue;
      if ((t.members || []).some((m: any) => m.id === staffId)) return t.name;
    }
    return null;
  };

  const renderStaffCheckbox = (s: any, checked: boolean, onToggle: (id: string) => void, currentTeamId?: string) => {
    const sid = s._id || s.id;
    const otherTeam = isInOtherTeam(sid, currentTeamId);
    const disabled = !!otherTeam;

    const checkbox = (
      <label
        className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors cursor-pointer text-sm ${
          checked ? 'bg-primary/5 border-primary/30' : disabled ? 'bg-slate-50 border-slate-200 opacity-50' : 'hover:bg-slate-50 border-transparent'
        }`}
      >
        <Checkbox checked={checked} disabled={disabled} onCheckedChange={() => onToggle(sid)} />
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-xs">{getInitials(s.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{s.name}</div>
          <div className="text-xs text-slate-500">{s.position?.replace(/_/g, ' ') || ''}</div>
        </div>
        {otherTeam && (
          <Badge variant="secondary" className="text-xs shrink-0">In: {otherTeam}</Badge>
        )}
      </label>
    );

    return <div key={sid}>{checkbox}</div>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Team Management</h1>
          <p className="text-slate-500 mt-1">Organise staff into teams with a supervisor</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">New Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Team Name</Label>
                <Input
                  placeholder="e.g. Alpha Team"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Team Code</Label>
                <Input
                  placeholder="e.g. ALPHA"
                  value={teamForm.code}
                  onChange={(e) => setTeamForm({ ...teamForm, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label>Supervisor (Manager)</Label>
                <Select value={teamForm.managerId} onValueChange={(value) => setTeamForm({ ...teamForm, managerId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">None (Unassigned)</SelectItem>
                    {supervisors.map((s: any) => (
                      <SelectItem key={s._id || s.id} value={s._id || s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Staff Members</Label>
                  {teamForm.memberIds.length > 0 && (
                    <Badge variant="outline" className="text-xs">{teamForm.memberIds.length} selected</Badge>
                  )}
                </div>
                <div className="border rounded-lg p-2 max-h-64 overflow-y-auto space-y-1.5">
                  {staffList.length === 0 ? (
                    <p className="text-sm text-slate-400 p-3 text-center">No staff available</p>
                  ) : (
                    staffList.map((s: any) =>
                      renderStaffCheckbox(
                        s,
                        teamForm.memberIds.includes(s._id || s.id),
                        toggleMember
                      )
                    )
                  )}
                </div>
              </div>
              <Button className="w-full" onClick={createTeam} disabled={loading || !teamForm.name || !teamForm.code}>
                Create Team
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.length === 0 ? (
              <div className="md:col-span-2">
                <Card>
                  <CardContent className="py-12 text-center text-slate-400">
                    No teams created yet. Use the form to create your first team.
                  </CardContent>
                </Card>
              </div>
            ) : (
              teams.map((t: any) => {
                const tid = t._id || t.id;
                const memberList = t.members || [];
                return (
                  <Card key={tid} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{t.name}</CardTitle>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{t.code}</p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {memberList.length} {memberList.length === 1 ? 'member' : 'members'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      {t.managerId ? (
                        <div className="flex items-center gap-2 text-sm bg-slate-50 rounded-lg px-3 py-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">{getInitials(t.managerId.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium">{t.managerId.name}</span>
                            <span className="text-xs text-slate-400 ml-2">Manager</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No supervisor assigned</p>
                      )}

                      {memberList.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Members</p>
                          <div className="flex flex-wrap gap-1.5">
                            {memberList.slice(0, 6).map((m: any) => (
                              <Badge key={m.id} variant="outline" className="text-xs font-normal">
                                {m.name}
                              </Badge>
                            ))}
                            {memberList.length > 6 && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Badge variant="secondary" className="text-xs cursor-pointer">+{memberList.length - 6} more</Badge>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>{t.name} — All Members</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {memberList.map((m: any) => (
                                      <div key={m.id} className="flex items-center gap-2 py-1">
                                        <Avatar className="h-7 w-7">
                                          <AvatarFallback className="text-xs">{getInitials(m.name)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium">{m.name}</span>
                                        <span className="text-xs text-slate-400 ml-auto">{m.position?.replace(/_/g, ' ') || ''}</span>
                                      </div>
                                    ))}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(t)}>
                              Edit Members
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>{editTeam?.name} — Members</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-1.5 max-h-80 overflow-y-auto py-2">
                              {staffList.map((s: any) =>
                                renderStaffCheckbox(
                                  s,
                                  editMemberIds.includes(s._id || s.id),
                                  toggleEditMember,
                                  editTeam?._id || editTeam?.id
                                )
                              )}
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t">
                              <DialogClose asChild>
                                <Button variant="outline" onClick={() => setEditTeam(null)}>Cancel</Button>
                              </DialogClose>
                              <Button onClick={editTeamMembers} disabled={loading}>Save</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteTeam(tid)}>
                          Deactivate
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
