import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Network,
  Target,
  FileText,
  Menu,
  X,
  BookOpen,
  Upload,
  Users,
  Shield,
  BarChart3,
  ClipboardList,
  Eye,
  CheckCircle2,
  User,
  AlertTriangle,
  Trophy,
  Settings
} from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavItem {
  title: string;
  icon: React.ElementType;
  path: string;
  children?: { title: string; path: string }[];
}

const getNavItems = (role: string): NavItem[] => {
  if (role === 'admin') {
    return [
      { title: 'DASHBOARD', icon: LayoutDashboard, path: '/dashboard/hq' },
      {
        title: 'PLAN MANAGEMENT',
        icon: Upload,
        path: '/plan-cascade',
        children: [
          { title: 'Plans Overview', path: '/plan-cascade/overview' },
          { title: 'Create Plans', path: '/plan-cascade/create' },
        ]
      },
      { title: 'BASELINE BALANCE', icon: Upload, path: '/june-balance-import' },
      { title: 'PRODUCT MAPPING', icon: Target, path: '/product-mapping' },
      { title: 'MAPPING MANAGEMENT', icon: Network, path: '/mapping' },
      { title: 'CBS VALIDATION', icon: CheckCircle2, path: '/cbs-validation' },
      { title: 'USER MANAGEMENT', icon: Users, path: '/user-management' },
      { title: 'BRANCH MANAGEMENT', icon: Network, path: '/branch-management' },
      { title: 'KPI FRAMEWORK', icon: Target, path: '/kpi-framework' },
      { title: 'COMPETENCY FRAMEWORK', icon: Shield, path: '/competency-framework' },
      { title: 'AUDIT TRAIL', icon: FileText, path: '/audit-trail' },
      { title: 'UNMAPPED ACCOUNTS', icon: Eye, path: '/unmapped-accounts' },
      { title: 'NPL DASHBOARD', icon: AlertTriangle, path: '/npl/hq' },
    ];
  }

  if (role === 'areaManager') {
    return [
      { title: 'DASHBOARD', icon: LayoutDashboard, path: '/dashboard/area' },
      { title: 'BRANCH MONITORING', icon: Eye, path: '/branch-monitoring' },
      { title: 'NPL OVERVIEW', icon: AlertTriangle, path: '/npl/area' },
      { title: 'UNMAPPED ACCOUNTS', icon: Eye, path: '/unmapped-accounts' },
      { title: 'AREA PERFORMANCE', icon: BarChart3, path: '/area-performance' },
      { title: 'BEHAVIORAL EVALUATION', icon: ClipboardList, path: '/behavioral-evaluation' },
      { title: 'REPORTS', icon: FileText, path: '/reports' },
    ];
  }

  if (role === 'branchManager') {
    return [
      { title: 'DASHBOARD', icon: LayoutDashboard, path: '/dashboard/branch' },
      { title: 'MONITORING', icon: Eye, path: '/branch-monitoring' },
      { title: 'TEAM STANDINGS', icon: Trophy, path: '/team-standings' },
      { title: 'NPL DASHBOARD', icon: AlertTriangle, path: '/npl/branch' },
      { title: 'APPROVALS', icon: CheckCircle2, path: '/approvals' },
      { title: 'TEAM MANAGEMENT', icon: Users, path: '/teams' },
      { title: 'MAPPING', icon: Network, path: '/mapping' },
      { title: 'UNMAPPED ACCOUNTS', icon: Eye, path: '/unmapped-accounts' },
      { title: 'BULK MAPPING UPLOAD', icon: Upload, path: '/bulk-mapping-upload' },
      { title: 'CBS VALIDATION', icon: CheckCircle2, path: '/cbs-validation' },
      { title: 'BEHAVIORAL EVALUATION', icon: ClipboardList, path: '/behavioral-evaluation' },
      { title: 'REPORTS', icon: FileText, path: '/reports' },
    ];
  }

  if (role === 'supervisor') {
    return [
      { title: 'DASHBOARD', icon: LayoutDashboard, path: '/dashboard/supervisor' },
      { title: 'TEAM HUB', icon: Users, path: '/team-hub' },
      { title: 'TEAM STANDINGS', icon: Trophy, path: '/team-standings' },
      { title: 'APPROVALS', icon: CheckCircle2, path: '/approvals' },
      { title: 'TASKS', icon: CheckSquare, path: '/tasks' },
      { title: 'MAPPING', icon: Network, path: '/mapping' },
      { title: 'MAPPED ACCOUNTS', icon: BookOpen, path: '/mapped-accounts' },
      { title: 'JUNE DIFFERENCE', icon: BarChart3, path: '/june-difference' },
      { title: 'TEAM COLLECTION', icon: AlertTriangle, path: '/npl/team-alerts' },
      { title: 'BEHAVIORAL INPUT', icon: ClipboardList, path: '/behavioral-input' },
      { title: 'REPORTS', icon: FileText, path: '/reports' },
    ];
  }

  if (role === 'staff') {
    return [
      { title: 'DASHBOARD', icon: LayoutDashboard, path: '/dashboard/staff' },
      { title: 'TASKS', icon: CheckSquare, path: '/tasks' },
      { title: 'MAPPED ACCOUNTS', icon: BookOpen, path: '/mapped-accounts' },
      { title: 'JUNE DIFFERENCE', icon: BarChart3, path: '/june-difference' },
      { title: 'NPL COLLECTION', icon: AlertTriangle, path: '/npl/staff' },
      { title: 'MY PERFORMANCE', icon: Target, path: '/kpi' },
      { title: 'TEAM STANDINGS', icon: Trophy, path: '/team-standings' },
      { title: 'MY SCORECARD', icon: FileText, path: '/reports/scorecard' },
    ];
  }

  return [
    { title: 'DASHBOARD', icon: LayoutDashboard, path: '/dashboard' },
  ];
};

export function Sidebar() {
  const { role } = useUser();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const navItems = getNavItems(role);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      <button
        className="lg:hidden fixed top-3 left-3 z-50 p-2.5 bg-white text-primary-700 rounded-xl shadow-lg border border-primary-100 hover:bg-primary-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-60 bg-primary border-r border-primary-600 z-40 transition-transform lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 border-b border-primary-600">
          <h1 className="text-xl font-bold text-white">GHION SACCOS PMS</h1>
          <p className="text-xs text-blue-100 mt-1">{role === 'admin' ? 'Admin' : role === 'areaManager' ? 'Area Manager' : role === 'branchManager' ? 'Branch Manager' : role === 'supervisor' ? 'Supervisor' : role}</p>
        </div>
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-100px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <div key={item.title}>
                <Link
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-md",
                    active
                      ? "bg-white text-primary"
                      : "text-white hover:bg-primary-600 hover:text-white"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.title}</span>
                </Link>
                {item.children && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "block px-4 py-2 text-sm transition-colors rounded-md",
                          location.pathname === child.path
                            ? "bg-white text-primary"
                            : "text-white hover:bg-primary-600 hover:text-white"
                        )}
                      >
                        {child.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div className="pt-4 mt-4 border-t border-primary-600 space-y-1">
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-md",
                location.pathname === '/profile'
                  ? "bg-white text-primary"
                  : "text-white hover:bg-primary-600 hover:text-white"
              )}
            >
              <User className="h-5 w-5 shrink-0" />
              <span>Profile</span>
            </Link>
            <Link
              to="/routes"
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-md",
                location.pathname === '/routes'
                  ? "bg-white text-primary"
                  : "text-white hover:bg-primary-600 hover:text-white"
              )}
            >
              <BookOpen className="h-5 w-5 shrink-0" />
              <span>Routes Guide</span>
            </Link>
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-md",
                location.pathname === '/settings'
                  ? "bg-white text-primary"
                  : "text-white hover:bg-primary-600 hover:text-white"
              )}
            >
              <Settings className="h-5 w-5 shrink-0" />
              <span>Settings</span>
            </Link>
          </div>
        </nav>
      </aside>
      {isOpen && (
        <div
          className="fixed inset-0 bg-primary/40 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
