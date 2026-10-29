import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, CheckCircle2, Clock, XCircle, Info, FileText, Pencil } from 'lucide-react';
import { tasksAPI } from '@/lib/api';
import { useUser } from '@/contexts/UserContext';
import { useConfig } from '@/contexts/ConfigContext';

const FALLBACK_TASK_TYPES = [
  'Loan_Saving_Deposit',
  'Michu_Current_Saving',
  'Gihon_Regular_Saving',
  'Mothers_Saving',
  'Young_Womens_Saving',
  'Elders_Saving',
  'Children_Saving',
  'Fixed_Time_Deposit',
  'Premium_Saving_Deposit',
  'Special_Saving',
  'Segment_Deposit',
  'Wadiah_IFB_Deposit',
];

export function Tasks() {
  const { role, user } = useUser();
  const userId = user?.id;
  const { taskTypes: configTaskTypes } = useConfig();
  const availableTaskTypes = configTaskTypes.length > 0 ? configTaskTypes.map(t => t.value) : FALLBACK_TASK_TYPES;
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Edit request state
  const [editTask, setEditTask] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await tasksAPI.getAll();
      if (response.success) {
        setTasks(response.data || []);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'Pending':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'Rejected':
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const openEditDialog = (task: any) => {
    setEditTask(task);
    setEditForm({
      taskType: task.taskType,
      productType: task.productType || '',
      accountNumber: task.accountNumber,
      amount: task.amount,
      remarks: task.remarks || '',
    });
  };

  const submitEditRequest = async () => {
    try {
      setEditLoading(true);
      await tasksAPI.requestEdit(editTask._id, editForm);
      setEditTask(null);
      loadTasks();
    } catch (error) {
      console.error('Error submitting edit request:', error);
    } finally {
      setEditLoading(false);
    }
  };

  const getCurrentStep = (chain: any[]) => {
    if (!chain || chain.length === 0) return 'N/A';
    const pendingStep = chain.find(s => s.status === 'Pending');
    if (!pendingStep) return 'Finalized';
    return pendingStep.role;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{role === 'supervisor' ? 'Team Operations' : 'My Daily Tasks'}</h1>
          <p className="text-slate-600 mt-1">{role === 'supervisor' ? 'View tasks submitted by your team members' : 'Track the status and approval progress of your submissions'}</p>
        </div>
        {(role === 'staff' || role === 'supervisor') && (
          <Link to="/tasks/new">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add New Task
            </Button>
          </Link>
        )}
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b">
          <CardTitle className="text-lg">Recent Task Submissions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="table-scroll">
              <ResponsiveTable
                columns={[
                  {
                    key: 'taskType',
                    header: 'Task Type',
                    primary: true,
                    render: (task: any) => (
                      <span className="font-semibold text-slate-700">{task.taskType}</span>
                    ),
                  },
                  {
                    key: 'accountNumber',
                    header: 'Account #',
                    render: (task: any) => (
                      <code className="text-blue-600 font-bold text-xs">{task.accountNumber}</code>
                    ),
                  },
                  {
                    key: 'amount',
                    header: 'Amount',
                    className: 'text-right',
                    render: (task: any) => (
                      <span className="font-bold">{task.amount > 0 ? `${task.amount.toLocaleString()} ETB` : '-'}</span>
                    ),
                  },
                  {
                    key: 'step',
                    header: 'Current Step',
                    render: (task: any) => (
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                        {getCurrentStep(task.approvalChain)}
                      </span>
                    ),
                  },
                  {
                    key: 'taskDate',
                    header: 'Execution Date',
                    render: (task: any) => (
                      <span className="text-slate-600">{new Date(task.taskDate).toLocaleDateString()}</span>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (task: any) => getStatusBadge(task.approvalStatus),
                  },
                ]}
                data={tasks}
                rowKey={(task) => task._id}
                emptyMessage={
                  <span className="flex flex-col items-center gap-2 py-4">
                    <FileText className="h-10 w-10 mx-auto text-slate-300" />
                    <p>You haven't submitted any tasks yet.</p>
                  </span>
                }
                mobileActions={(task) => (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 flex-1"
                      onClick={() => setSelectedTask(task)}
                    >
                      <Info className="h-3 w-3" /> Details
                    </Button>
                    {task.submittedById === userId && task.approvalStatus === 'Pending' && !task.requestedEditAt && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 flex-1 text-amber-600 border-amber-200 hover:bg-amber-50"
                        onClick={() => openEditDialog(task)}
                      >
                        <Pencil className="h-3 w-3" /> Edit
                      </Button>
                    )}
                  </div>
                )}
              />
            </div>
          )}
        </CardContent>
      </Card>
      {/* Edit Request Dialog */}
      <Dialog open={!!editTask} onOpenChange={(open) => { if (!open) setEditTask(null); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-amber-600" />
              Request Edit on Task
            </DialogTitle>
          </DialogHeader>

          {editTask && (
            <div className="space-y-4 mt-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <p className="text-amber-800">Changes will be reviewed by your supervisor before taking effect.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Task Type</label>
                <Select
                  value={editForm.taskType}
                  onValueChange={(v) => setEditForm({ ...editForm, taskType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTaskTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Product Type</label>
                <Input
                  value={editForm.productType}
                  onChange={(e) => setEditForm({ ...editForm, productType: e.target.value })}
                  placeholder="e.g. Savings"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Account Number</label>
                <Input
                  value={editForm.accountNumber}
                  onChange={(e) => setEditForm({ ...editForm, accountNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Amount</label>
                <Input
                  type="number"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Remarks</label>
                <Textarea
                  value={editForm.remarks}
                  onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditTask(null)}>Cancel</Button>
                <Button
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={submitEditRequest}
                  disabled={editLoading}
                >
                  {editLoading ? 'Submitting...' : 'Submit Edit Request'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Task Details & Approval Chain Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => { if (!open) setSelectedTask(null); }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Task Details & Approval Chain
            </DialogTitle>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-6 mt-4">
              {selectedTask.requestedEditAt && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                  <p className="font-medium text-amber-800">Edit Request Pending</p>
                  <p className="text-amber-600 text-xs mt-1">Submitted for supervisor review</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Account</p>
                  <p className="font-mono font-bold text-blue-600">{selectedTask.accountNumber}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Customer Name</p>
                  <p className="font-bold text-slate-800">{selectedTask.accountId?.customerName || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Amount</p>
                  <p className="font-bold text-slate-800">{selectedTask.amount?.toLocaleString() || 0} ETB</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Task Type</p>
                  <p className="font-medium text-slate-700">{selectedTask.taskType}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Submission Date</p>
                  <p className="font-medium text-slate-700">{new Date(selectedTask.taskDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Approval Progress
                </h4>
                <div className="space-y-3">
                  {selectedTask.approvalChain?.map((step: any, idx: number) => (
                    <div key={step._id} className="relative pl-6 pb-2">
                      {idx < selectedTask.approvalChain.length - 1 && (
                        <div className="absolute left-[7px] top-4 w-[2px] h-full bg-slate-200"></div>
                      )}
                      <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 ${step.status === 'Approved' ? 'bg-emerald-500 border-emerald-500' :
                        step.status === 'Rejected' ? 'bg-rose-500 border-rose-500' :
                          'bg-white border-slate-300'
                        }`}>
                        {step.status === 'Approved' && <CheckCircle2 className="h-3 w-3 text-white absolute inset-0 m-auto" />}
                        {step.status === 'Rejected' && <XCircle className="h-3 w-3 text-white absolute inset-0 m-auto" />}
                      </div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {step.role}
                            {step.approverId?.name && (
                              <span className="font-normal text-slate-500"> · {step.approverId.name}</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            {step.status === 'Approved' ? `Approved on ${new Date(step.approvedAt).toLocaleDateString()}` :
                              step.status === 'Rejected' ? (
                                <span className="flex items-start gap-1.5 text-rose-600">
                                  <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                  <span>
                                    <span className="font-semibold">Rejected:</span>{' '}
                                    {step.comments || 'No reason provided'}
                                  </span>
                                </span>
                              ) :
                                `Waiting for review...`}
                          </p>
                        </div>
                        {getStatusBadge(step.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedTask.remarks && (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-800">Submitter Remarks</h4>
                  <p className="text-sm text-slate-600 bg-blue-50/50 p-3 rounded-md italic">
                    "{selectedTask.remarks}"
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
