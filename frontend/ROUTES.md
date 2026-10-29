# SAKO PMS - Navigation Routes Guide

Since this is a mock frontend without authentication, you can access any route directly in your browser.

## Quick Access URLs

Base URL: `http://localhost:5173`

## Role-Specific Dashboards

### 1. SAKO HQ / Admin
- **Dashboard**: `/dashboard/hq` - Overview of all branches, performance metrics, activity feed
- **Tasks**: `/tasks` - View and manage task submissions
- **New Task**: `/tasks/new` - Submit a new daily task
- **Mapping**: `/mapping` - Manage account mappings
- **KPI Dashboard**: `/kpi` - Track performance metrics
- **Reports**: `/reports` - Access performance reports
- **Monthly Scorecard**: `/reports/scorecard` - View monthly performance scorecard
- **Settings**: `/settings` - Account settings and preferences

**Sidebar Items**: DASHBOARD, TASKS, MAPPING, KPIs, REPORTS, SETTINGS

---

### 2. Area Manager
- **Dashboard**: `/dashboard/area` - Overview of branches under management, trends, comparisons
- **Tasks**: `/tasks` - View and manage task submissions
- **New Task**: `/tasks/new` - Submit a new daily task
- **Mapping**: `/mapping` - Manage account mappings
- **KPI Dashboard**: `/kpi` - Track performance metrics
- **Reports**: `/reports` - Access performance reports
- **Monthly Scorecard**: `/reports/scorecard` - View monthly performance scorecard
- **Settings**: `/settings` - Account settings and preferences

**Sidebar Items**: DASHBOARD, TASKS, MAPPING, KPIs, REPORTS, SETTINGS

---

### 3. Branch Manager
- **Dashboard**: `/dashboard/branch` - Team performance, KPI visuals, pending approvals
- **Tasks**: `/tasks` - View and manage task submissions
- **New Task**: `/tasks/new` - Submit a new daily task
- **Mapping**: `/mapping` - Manage account mappings
- **KPI Dashboard**: `/kpi` - Track performance metrics
- **Reports**: `/reports` - Access performance reports
  - **Monthly Scorecard**: `/reports/scorecard` - View monthly performance scorecard
  - **CBS Validation**: `/reports/cbs` - CBS validation report
- **Settings**: `/settings` - Account settings and preferences

**Sidebar Items**: DASHBOARD, TASKS, MAPPING, KPIs, REPORTS (with sub-items), SETTINGS

---

### 4. Staff / MSO
- **Dashboard**: `/dashboard/staff` - Personal KPIs, progress bars, today's tasks
- **Tasks**: `/tasks` - View and manage task submissions
- **New Task**: `/tasks/new` - Submit a new daily task
- **Mapping**: `/mapping` - View your mapped accounts
- **KPI Dashboard**: `/kpi` - Track your personal performance metrics
- **Settings**: `/settings` - Account settings and preferences

**Sidebar Items**: DASHBOARD, TASKS, MAPPING, KPIs, SETTINGS

---

## Common Pages (All Roles)

- **Routes Guide**: `/routes` - Complete list of all routes and navigation guide

## How to Test Different Roles

1. **Direct URL Navigation**: Simply type the URL in your browser, e.g., `http://localhost:5173/dashboard/staff`

2. **Via Settings**: 
   - Go to `/settings`
   - Scroll to "Role Selection (Testing)"
   - Change the role
   - Navigate to `/dashboard` to see the role-specific dashboard

3. **Via Routes Guide**: 
   - Go to `/routes` (also available in sidebar)
   - Click on any route link to navigate directly

## Notes

- The sidebar automatically changes based on the role selected in Settings
- Each role sees different menu items in the sidebar
- All routes are accessible without authentication (mock frontend)
- The `/dashboard` route automatically shows the dashboard for the currently selected role

