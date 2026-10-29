import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

export function RoutesGuide() {
  const roles = [
    {
      name: 'admin',
      routes: [
        { path: '/dashboard/hq', label: 'HQ Dashboard', description: 'Overview of all branches, performance metrics, and activity feed' },
        { path: '/tasks', label: 'My Daily Tasks', description: 'View and manage task submissions' },
        { path: '/tasks/new', label: 'New Task Entry', description: 'Submit a new daily task' },
        { path: '/mapping', label: 'Mapping Management', description: 'Manage account mappings' },
        { path: '/kpi', label: 'KPI Dashboard', description: 'Track performance metrics' },
        { path: '/reports', label: 'Reports', description: 'Access performance reports' },
        { path: '/reports/scorecard', label: 'Monthly Scorecard', description: 'View monthly performance scorecard' },
        { path: '/settings', label: 'Settings', description: 'Account settings and preferences' },
      ],
      sidebarItems: ['DASHBOARD', 'TASKS', 'MAPPING', 'KPIs', 'REPORTS', 'SETTINGS']
    },
    {
      name: 'areaManager',
      routes: [
        { path: '/dashboard/area', label: 'areaManager Dashboard', description: 'Overview of branches under management, trends, and comparisons' },
        { path: '/tasks', label: 'My Daily Tasks', description: 'View and manage task submissions' },
        { path: '/tasks/new', label: 'New Task Entry', description: 'Submit a new daily task' },
        { path: '/mapping', label: 'Mapping Management', description: 'Manage account mappings' },
        { path: '/kpi', label: 'KPI Dashboard', description: 'Track performance metrics' },
        { path: '/reports', label: 'Reports', description: 'Access performance reports' },
        { path: '/reports/scorecard', label: 'Monthly Scorecard', description: 'View monthly performance scorecard' },
        { path: '/settings', label: 'Settings', description: 'Account settings and preferences' },
      ],
      sidebarItems: ['DASHBOARD', 'TASKS', 'MAPPING', 'KPIs', 'REPORTS', 'SETTINGS']
    },
    {
      name: 'branchManager',
      routes: [
        { path: '/dashboard/branch', label: 'branchManager Dashboard', description: 'Team performance, KPI visuals, and pending approvals' },
        { path: '/tasks', label: 'My Daily Tasks', description: 'View and manage task submissions' },
        { path: '/tasks/new', label: 'New Task Entry', description: 'Submit a new daily task' },
        { path: '/mapping', label: 'Mapping Management', description: 'Manage account mappings' },
        { path: '/kpi', label: 'KPI Dashboard', description: 'Track performance metrics' },
        { path: '/reports', label: 'Reports', description: 'Access performance reports' },
        { path: '/reports/scorecard', label: 'Monthly Scorecard', description: 'View monthly performance scorecard' },
        { path: '/settings', label: 'Settings', description: 'Account settings and preferences' },
      ],
      sidebarItems: ['DASHBOARD', 'TASKS', 'MAPPING', 'KPIs', 'REPORTS (with sub-items)', 'SETTINGS']
    },
    {
      name: 'staff',
      routes: [
        { path: '/dashboard/staff', label: 'Staff Dashboard', description: 'Personal KPIs, progress bars, and today\'s tasks' },
        { path: '/tasks', label: 'My Daily Tasks', description: 'View and manage task submissions' },
        { path: '/tasks/new', label: 'New Task Entry', description: 'Submit a new daily task' },
        { path: '/mapping', label: 'My Mapped Accounts', description: 'View your mapped accounts' },
        { path: '/kpi', label: 'My KPI Dashboard', description: 'Track your personal performance metrics' },
        { path: '/settings', label: 'Settings', description: 'Account settings and preferences' },
      ],
      sidebarItems: ['DASHBOARD', 'TASKS', 'MAPPING', 'KPIs', 'SETTINGS']
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Navigation Routes Guide</h1>
        <p className="text-slate-600 mt-1">Direct links to all pages for each user role</p>
        <p className="text-sm text-slate-500 mt-2">
          <strong>Note:</strong> Since this is a mock frontend without authentication, you can access any route directly. 
          The sidebar will change based on the role you select in Settings.
        </p>
      </div>

      {roles.map((role) => (
        <Card key={role.name}>
          <CardHeader>
            <CardTitle className="text-xl">{role.name}</CardTitle>
            <p className="text-sm text-slate-600 mt-2">
              <strong>Sidebar Items:</strong> {role.sidebarItems.join(', ')}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {role.routes.map((route) => (
                <div key={route.path} className="flex items-start justify-between p-3 border border-slate-200 rounded-md hover:bg-slate-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Link to={route.path} className="font-semibold text-blue-600 hover:text-blue-700">
                        {route.label}
                      </Link>
                      <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">
                        {route.path}
                      </code>
                    </div>
                    <p className="text-sm text-slate-600">{route.description}</p>
                  </div>
                  <Link to={route.path}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Go
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg">Quick Access Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to="/dashboard/hq">
              <Button variant="outline" className="w-full">HQ Dashboard</Button>
            </Link>
            <Link to="/dashboard/area">
              <Button variant="outline" className="w-full">areaManager</Button>
            </Link>
            <Link to="/dashboard/branch">
              <Button variant="outline" className="w-full">branchManager</Button>
            </Link>
            <Link to="/dashboard/staff">
              <Button variant="outline" className="w-full">Staff Dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

