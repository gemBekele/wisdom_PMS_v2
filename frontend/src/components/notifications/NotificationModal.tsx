import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { notificationsAPI } from '@/lib/api';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
  Users,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  CheckCheck,
} from 'lucide-react';

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  CBS_VALIDATION: { icon: FileCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
  MAPPING_UPDATED: { icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
  NPL_ALERT: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  PLAN_ACHIEVEMENT: { icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  TASK_APPROVED: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  TASK_REJECTED: { icon: X, color: 'text-red-600', bg: 'bg-red-50' },
  AUTO_BALANCE: { icon: RefreshCw, color: 'text-amber-600', bg: 'bg-amber-50' },
};

const defaultConfig = { icon: Bell, color: 'text-slate-600', bg: 'bg-slate-50' };

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function groupByDay(notifications: any[]) {
  const groups: { label: string; items: any[] }[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  const todayItems: any[] = [];
  const yesterdayItems: any[] = [];
  const olderItems: any[] = [];

  for (const n of notifications) {
    const d = new Date(n.createdAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day.getTime() === today.getTime()) todayItems.push(n);
    else if (day.getTime() === yesterday.getTime()) yesterdayItems.push(n);
    else olderItems.push(n);
  }

  if (todayItems.length) groups.push({ label: 'Today', items: todayItems });
  if (yesterdayItems.length) groups.push({ label: 'Yesterday', items: yesterdayItems });
  if (olderItems.length) groups.push({ label: 'Older', items: olderItems });
  return groups;
}

interface NotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationModal({ open, onOpenChange }: NotificationModalProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchNotifications = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await notificationsAPI.getAll({ page: pageNum, limit: 50 });
      if (res.success) {
        setNotifications(res.data);
        setTotalPages(res.pages || 1);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationsAPI.getUnreadCount();
      if (res.success) setUnreadCount(res.data.count);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (open) {
      fetchNotifications(1);
      fetchUnreadCount();
      setPage(1);
      setSelected(null);
    }
  }, [open, fetchNotifications, fetchUnreadCount]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id || n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (selected && (selected.id === id || selected._id === id)) {
        setSelected({ ...selected, read: true });
      }
    } catch { /* ignore */ }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      if (selected) setSelected({ ...selected, read: true });
    } catch { /* ignore */ }
  };

  const groups = groupByDay(notifications);

  const renderDetailPanel = () => {
    if (!selected) {
      return (
        <div className="h-full flex items-center justify-center text-slate-400">
          <div className="text-center">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a notification to view details</p>
          </div>
        </div>
      );
    }

    const cfg = typeConfig[selected.type] || defaultConfig;
    const Icon = cfg.icon;
    const data = selected.data || {};

    return (
      <div className="p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-full shrink-0 ${cfg.bg}`}>
            <Icon className={`h-5 w-5 ${cfg.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-800 text-base">{selected.title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {formatTime(selected.createdAt)}
            </p>
          </div>
          {!selected.read && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => handleMarkAsRead(selected.id || selected._id)}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              Mark read
            </Button>
          )}
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">{selected.message}</p>

        {/* CBS Validation details */}
        {selected.type === 'CBS_VALIDATION' && data.matched !== undefined && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-blue-700">{data.matched}</p>
              <p className="text-xs text-blue-600">Matched</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-slate-700">{data.total}</p>
              <p className="text-xs text-slate-600">Total</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-red-700">{data.discrepancies || 0}</p>
              <p className="text-xs text-red-600">Discrepancies</p>
            </div>
          </div>
        )}

        {/* NPL Alert details */}
        {selected.type === 'NPL_ALERT' && data.dpd !== undefined && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-red-800">Days Past Due</span>
              <span className={`text-2xl font-bold ${data.dpd > 90 ? 'text-red-700' : data.dpd > 30 ? 'text-amber-600' : 'text-orange-600'}`}>
                {data.dpd}
              </span>
            </div>
            <div className="mt-2 text-xs text-red-700">
              Account: {data.accountNumber} — {data.customerName}
            </div>
          </div>
        )}

        {/* Plan Achievement details */}
        {selected.type === 'PLAN_ACHIEVEMENT' && data.target !== undefined && (
          <div className="bg-emerald-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-emerald-800">{data.targetType}</span>
              <span className="text-lg font-bold text-emerald-700">{data.achieved}/{data.target}</span>
            </div>
          </div>
        )}

        {/* Task Approval details */}
        {(selected.type === 'TASK_APPROVED' || selected.type === 'TASK_REJECTED') && (
          <div className={`rounded-lg p-4 space-y-2 ${selected.type === 'TASK_REJECTED' ? 'bg-red-50' : 'bg-slate-50'}`}>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Account</span>
              <span className="font-medium">{data.accountNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Amount</span>
              <span className="font-medium">{data.amount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Status</span>
              <Badge variant={selected.type === 'TASK_APPROVED' ? 'success' : 'destructive'}>
                {data.status}
              </Badge>
            </div>
            {selected.type === 'TASK_REJECTED' && data.approverName && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Rejected by</span>
                <span className="font-medium text-red-700">{data.approverName}</span>
              </div>
            )}
            {selected.type === 'TASK_REJECTED' && data.comments && (
              <div className="mt-2 p-3 bg-white border border-red-200 rounded-md">
                <p className="text-xs font-semibold text-red-700 mb-1">Rejection Reason</p>
                <p className="text-sm text-slate-700 italic">"{data.comments}"</p>
              </div>
            )}
          </div>
        )}

        {/* Auto Balance details */}
        {selected.type === 'AUTO_BALANCE' && data.count !== undefined && (
          <div className="bg-amber-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-amber-700">{data.count}</p>
            <p className="text-sm text-amber-600">accounts assigned to you</p>
          </div>
        )}

        {selected.link && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              window.location.href = selected.link;
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Details
          </Button>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[95vw] h-[90vh] p-0 gap-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-slate-600" />
              <DialogTitle className="text-lg font-semibold text-slate-800 m-0">
                Notifications
              </DialogTitle>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="rounded-full">
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
                  <CheckCheck className="h-4 w-4 mr-1" />
                  Mark all read
                </Button>
              )}
              <DialogClose className="p-1 hover:bg-slate-100 rounded-full">
                <X className="h-5 w-5 text-slate-500" />
              </DialogClose>
            </div>
          </div>

          {/* Body: two-panel */}
          <div className="flex flex-1 min-h-0">
            {/* Left panel: list */}
            <div className="w-[380px] shrink-0 border-r flex flex-col">
              <div className="px-4 py-2 border-b bg-slate-50 shrink-0">
                <input
                  type="text"
                  placeholder="Search notifications..."
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading && notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">Loading...</div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {groups.map(group => (
                      <div key={group.label}>
                        <div className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-50 sticky top-0">
                          {group.label}
                        </div>
                        {group.items.map((notif: any) => {
                          const nId = notif.id || notif._id;
                          const isSelected = selected && (selected.id === nId || selected._id === nId);
                          const cfg = typeConfig[notif.type] || defaultConfig;
                          const Icon = cfg.icon;
                          return (
                            <div
                              key={nId}
                              className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-blue-50 border-l-2 border-l-blue-500'
                                  : notif.read
                                  ? 'hover:bg-slate-50 border-l-2 border-l-transparent'
                                  : 'bg-blue-50/40 hover:bg-blue-50/70 border-l-2 border-l-transparent'
                              }`}
                              onClick={() => {
                                setSelected(notif);
                                if (!notif.read) handleMarkAsRead(nId);
                              }}
                            >
                              <div className={`p-1.5 rounded-full shrink-0 ${cfg.bg}`}>
                                <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <p className={`text-sm truncate ${notif.read ? 'text-slate-700' : 'text-slate-900 font-semibold'}`}>
                                    {notif.title}
                                  </p>
                                  <ChevronRight className={`h-3.5 w-3.5 shrink-0 ml-1 ${isSelected ? 'text-blue-500' : 'text-slate-300'}`} />
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                                <p className="text-xs text-slate-400 mt-1">{formatTime(notif.createdAt)}</p>
                              </div>
                              {!notif.read && (
                                <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 p-4 border-t">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <Button
                        key={p}
                        variant={p === page ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setPage(p);
                          fetchNotifications(p);
                        }}
                      >
                        {p}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right panel: detail */}
            <div className="flex-1 min-w-0 overflow-y-auto">
              {renderDetailPanel()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
