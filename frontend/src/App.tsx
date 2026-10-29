import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './contexts/UserContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { mapBackendRoleToFrontend } from './lib/roleMapper';
import { MainLayout } from './components/layout/MainLayout';
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const CEODashboard = lazy(() => import('./pages/CEODashboard').then(m => ({ default: m.CEODashboard })));
const AreaManagerDashboard = lazy(() => import('./pages/AreaManagerDashboard').then(m => ({ default: m.AreaManagerDashboard })));
const BranchManagerDashboard = lazy(() => import('./pages/BranchManagerDashboard').then(m => ({ default: m.BranchManagerDashboard })));
const SupervisorDashboard = lazy(() => import('./pages/SupervisorDashboard').then(m => ({ default: m.SupervisorDashboard })));
const StaffDashboard = lazy(() => import('./pages/StaffDashboard').then(m => ({ default: m.StaffDashboard })));
const Tasks = lazy(() => import('./pages/Tasks').then(m => ({ default: m.Tasks })));
const TaskEntryForm = lazy(() => import('./pages/TaskEntryForm').then(m => ({ default: m.TaskEntryForm })));
const MappingManagement = lazy(() => import('./pages/MappingManagement').then(m => ({ default: m.MappingManagement })));
const KPIDashboard = lazy(() => import('./pages/KPIDashboard').then(m => ({ default: m.KPIDashboard })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const MonthlyScorecard = lazy(() => import('./pages/MonthlyScorecard').then(m => ({ default: m.MonthlyScorecard })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const RoutesGuide = lazy(() => import('./pages/RoutesGuide').then(m => ({ default: m.RoutesGuide })));
const UserManagement = lazy(() => import('./pages/hq/UserManagement').then(m => ({ default: m.UserManagement })));
const BranchManagement = lazy(() => import('./pages/hq/BranchManagement').then(m => ({ default: m.BranchManagement })));
const PlanCascade = lazy(() => import('./pages/hq/PlanCascade').then(m => ({ default: m.PlanCascade })));
const PlansOverview = lazy(() => import('./pages/hq/PlansOverview').then(m => ({ default: m.PlansOverview })));
const CBSValidation = lazy(() => import('./pages/hq/CBSValidation').then(m => ({ default: m.CBSValidation })));
const AuditTrail = lazy(() => import('./pages/hq/AuditTrail').then(m => ({ default: m.AuditTrail })));
const KPIFramework = lazy(() => import('./pages/hq/KPIFramework').then(m => ({ default: m.KPIFramework })));
const CompetencyFramework = lazy(() => import('./pages/hq/CompetencyFramework').then(m => ({ default: m.CompetencyFramework })));
const JuneBalanceImport = lazy(() => import('./pages/hq/JuneBalanceImport').then(m => ({ default: m.JuneBalanceImport })));
const ProductMapping = lazy(() => import('./pages/hq/ProductMapping').then(m => ({ default: m.ProductMapping })));
const AreaPerformance = lazy(() => import('./pages/AreaPerformance').then(m => ({ default: m.AreaPerformance })));
const BranchMonitoring = lazy(() => import('./pages/BranchMonitoring').then(m => ({ default: m.BranchMonitoring })));
const BranchPerformance = lazy(() => import('./pages/BranchPerformance').then(m => ({ default: m.BranchPerformance })));
const BehavioralEvaluation = lazy(() => import('./pages/BehavioralEvaluation').then(m => ({ default: m.BehavioralEvaluation })));
const BehavioralInput = lazy(() => import('./pages/BehavioralInput').then(m => ({ default: m.BehavioralInput })));
const BulkMappingUpload = lazy(() => import('./pages/BulkMappingUpload').then(m => ({ default: m.BulkMappingUpload })));
const MappedAccounts = lazy(() => import('./pages/MappedAccounts').then(m => ({ default: m.MappedAccounts })));
const SupervisorApprovals = lazy(() => import('./pages/SupervisorApprovals').then(m => ({ default: m.SupervisorApprovals })));
const HqNplDashboard = lazy(() => import('./pages/HqNplDashboard').then(m => ({ default: m.HqNplDashboard })));
const AreaNplDashboard = lazy(() => import('./pages/AreaNplDashboard').then(m => ({ default: m.AreaNplDashboard })));
const BranchNplDashboard = lazy(() => import('./pages/BranchNplDashboard').then(m => ({ default: m.BranchNplDashboard })));
const TeamNplAlerts = lazy(() => import('./pages/TeamNplAlerts').then(m => ({ default: m.TeamNplAlerts })));
const StaffNplDashboard = lazy(() => import('./pages/StaffNplDashboard').then(m => ({ default: m.StaffNplDashboard })));
const TeamManagement = lazy(() => import('./pages/TeamManagement').then(m => ({ default: m.TeamManagement })));
const TeamHub = lazy(() => import('./pages/TeamHub').then(m => ({ default: m.TeamHub })));
const JuneBalanceDifference = lazy(() => import('./pages/JuneBalanceDifference').then(m => ({ default: m.JuneBalanceDifference })));
const UnmappedAccounts = lazy(() => import('./pages/UnmappedAccounts').then(m => ({ default: m.UnmappedAccounts })));
const TeamStandings = lazy(() => import('./pages/TeamStandings').then(m => ({ default: m.TeamStandings })));



function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center">
      <div className="mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-primary-900" />
      <p className="text-sm font-medium text-stone">Loading page...</p>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, isLoading, role } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-slate-600 font-medium">Verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function DashboardRoute() {
  const { role, user } = useUser();
  const mappedRole = user?.role ? mapBackendRoleToFrontend(user.role) : role;

  switch (mappedRole) {
    case 'admin':
      return <CEODashboard />;
    case 'areaManager':
      return <AreaManagerDashboard />;
    case 'branchManager':
      return <BranchManagerDashboard />;
    case 'supervisor':
      return <SupervisorDashboard />;
    case 'staff':
      return <StaffDashboard />;
    default:
      return <StaffDashboard />;
  }
}

function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/dashboard" element={<ProtectedRoute><DashboardRoute /></ProtectedRoute>} />
      <Route path="/dashboard/hq" element={<ProtectedRoute allowedRoles={['admin']}><CEODashboard /></ProtectedRoute>} />
      <Route path="/dashboard/area" element={<ProtectedRoute allowedRoles={['areaManager']}><AreaManagerDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/branch" element={<ProtectedRoute allowedRoles={['branchManager', 'supervisor']}><BranchManagerDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/supervisor" element={<ProtectedRoute allowedRoles={['supervisor']}><SupervisorDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/staff" element={<ProtectedRoute allowedRoles={['staff']}><StaffDashboard /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute allowedRoles={['staff', 'supervisor']}><Tasks /></ProtectedRoute>} />
      <Route path="/tasks/new" element={<ProtectedRoute allowedRoles={['staff', 'supervisor']}><TaskEntryForm /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/mapping" element={<ProtectedRoute allowedRoles={['admin', 'branchManager', 'supervisor']}><MappingManagement /></ProtectedRoute>} />
      <Route path="/bulk-mapping-upload" element={<ProtectedRoute allowedRoles={['branchManager']}><BulkMappingUpload /></ProtectedRoute>} />
      <Route path="/kpi" element={<ProtectedRoute allowedRoles={['staff', 'supervisor']}><KPIDashboard /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin', 'areaManager', 'branchManager', 'supervisor', 'staff']}><Reports /></ProtectedRoute>} />
      <Route path="/reports/scorecard" element={<ProtectedRoute allowedRoles={['staff']}><MonthlyScorecard /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin', 'areaManager', 'branchManager', 'supervisor', 'staff']}><Settings /></ProtectedRoute>} />
      <Route path="/user-management" element={<ProtectedRoute allowedRoles={['admin']}><UserManagement /></ProtectedRoute>} />
      <Route path="/branch-management" element={<ProtectedRoute allowedRoles={['admin']}><BranchManagement /></ProtectedRoute>} />
      <Route path="/plan-cascade" element={<ProtectedRoute allowedRoles={['admin']}><PlanCascade /></ProtectedRoute>} />
      <Route path="/plan-cascade/overview" element={<ProtectedRoute allowedRoles={['admin']}><PlansOverview /></ProtectedRoute>} />
      <Route path="/plan-cascade/create" element={<ProtectedRoute allowedRoles={['admin']}><PlanCascade /></ProtectedRoute>} />
      <Route path="/plan-cascade/upload" element={<ProtectedRoute allowedRoles={['admin']}><PlanCascade /></ProtectedRoute>} />
      <Route path="/cbs-validation" element={<ProtectedRoute allowedRoles={['admin', 'branchManager']}><CBSValidation /></ProtectedRoute>} />
      <Route path="/audit-trail" element={<ProtectedRoute allowedRoles={['admin']}><AuditTrail /></ProtectedRoute>} />
      <Route path="/kpi-framework" element={<ProtectedRoute allowedRoles={['admin']}><KPIFramework /></ProtectedRoute>} />
      <Route path="/competency-framework" element={<ProtectedRoute allowedRoles={['admin']}><CompetencyFramework /></ProtectedRoute>} />
      <Route path="/routes" element={<ProtectedRoute allowedRoles={['admin', 'areaManager', 'branchManager', 'supervisor', 'staff']}><RoutesGuide /></ProtectedRoute>} />
      <Route path="/area-performance" element={<ProtectedRoute allowedRoles={['areaManager']}><AreaPerformance /></ProtectedRoute>} />
      <Route path="/branch-monitoring" element={<ProtectedRoute allowedRoles={['areaManager', 'branchManager']}><BranchMonitoring /></ProtectedRoute>} />
      <Route path="/branch-performance" element={<ProtectedRoute allowedRoles={['branchManager']}><BranchPerformance /></ProtectedRoute>} />
      <Route path="/teams" element={<ProtectedRoute allowedRoles={['branchManager']}><TeamManagement /></ProtectedRoute>} />
      <Route path="/behavioral-evaluation" element={<ProtectedRoute allowedRoles={['admin', 'areaManager', 'branchManager', 'supervisor']}><BehavioralEvaluation /></ProtectedRoute>} />
      <Route path="/behavioral-input" element={<ProtectedRoute allowedRoles={['supervisor']}><BehavioralInput /></ProtectedRoute>} />
      <Route path="/team-hub" element={<ProtectedRoute allowedRoles={['supervisor']}><TeamHub /></ProtectedRoute>} />
      <Route path="/approvals" element={<ProtectedRoute allowedRoles={['supervisor', 'branchManager']}><SupervisorApprovals /></ProtectedRoute>} />
      <Route path="/june-balance-import" element={<ProtectedRoute allowedRoles={['admin']}><JuneBalanceImport /></ProtectedRoute>} />
      <Route path="/product-mapping" element={<ProtectedRoute allowedRoles={['admin']}><ProductMapping /></ProtectedRoute>} />
      <Route path="/mapped-accounts" element={<ProtectedRoute allowedRoles={['branchManager', 'supervisor', 'staff']}><MappedAccounts /></ProtectedRoute>} />
      <Route path="/npl/hq" element={<ProtectedRoute allowedRoles={['admin']}><HqNplDashboard /></ProtectedRoute>} />
      <Route path="/npl/area" element={<ProtectedRoute allowedRoles={['areaManager']}><AreaNplDashboard /></ProtectedRoute>} />
      <Route path="/npl/branch" element={<ProtectedRoute allowedRoles={['branchManager']}><BranchNplDashboard /></ProtectedRoute>} />
      <Route path="/npl/team-alerts" element={<ProtectedRoute allowedRoles={['supervisor']}><TeamNplAlerts /></ProtectedRoute>} />
      <Route path="/npl/staff" element={<ProtectedRoute allowedRoles={['staff']}><StaffNplDashboard /></ProtectedRoute>} />
      <Route path="/june-difference" element={<ProtectedRoute allowedRoles={['staff', 'supervisor']}><JuneBalanceDifference /></ProtectedRoute>} />
      <Route path="/unmapped-accounts" element={<ProtectedRoute allowedRoles={['admin', 'areaManager', 'branchManager']}><UnmappedAccounts /></ProtectedRoute>} />
      <Route path="/team-standings" element={<ProtectedRoute allowedRoles={['staff', 'supervisor', 'branchManager']}><TeamStandings /></ProtectedRoute>} />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <UserProvider>
      <ConfigProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/*" element={<MainLayout><AppRoutes /></MainLayout>} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ConfigProvider>
    </UserProvider>
  );
}

export default App;
