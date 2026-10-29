import { useState, useEffect, useCallback } from 'react';
import { Bell, Globe, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { NotificationModal } from '@/components/notifications/NotificationModal';
import { notificationsAPI } from '@/lib/api';

export function TopNav() {
  const navigate = useNavigate();
  const { currentBranch, userName, role, logout } = useUser();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const shouldShowBranch = currentBranch && 
    role !== 'admin' && 
    role !== 'areaManager';

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationsAPI.getUnreadCount();
      if (res.success) setUnreadCount(res.data.count);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-primary-100 bg-white">
      <div className="flex h-14 lg:h-16 items-center justify-between px-3 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-6">
          <h2 className="text-sm sm:text-lg font-semibold text-slate-800 hidden sm:block">GHION SACCOS PMS</h2>
          <h2 className="text-sm font-semibold text-slate-800 sm:hidden">PMS</h2>
          {shouldShowBranch && (
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-xs sm:text-sm text-slate-500 hidden sm:inline">Branch:</span>
              <span className="text-xs sm:text-sm font-medium text-slate-800 truncate max-w-[80px] sm:max-w-none">{currentBranch}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-4">
          <button
            className="relative p-2 hover:bg-slate-100 rounded-md transition-colors"
            onClick={() => setShowNotifications(true)}
          >
            <Bell className="h-5 w-5 text-slate-600" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </button>

          <NotificationModal open={showNotifications} onOpenChange={setShowNotifications} />

          <button className="p-2 hover:bg-slate-100 rounded-md">
            <Globe className="h-5 w-5 text-slate-600" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-slate-100 rounded-md px-2 py-1">
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                <AvatarFallback className="bg-blue-500 text-white text-[10px] sm:text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs sm:text-sm font-medium text-slate-800 hidden sm:inline">{userName}</span>
              <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-slate-600" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/profile')}>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                logout();
                navigate('/login');
              }}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
