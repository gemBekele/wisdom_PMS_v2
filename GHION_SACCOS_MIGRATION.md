# Ghion SACCOS — PMS Migration Plan & Tracker

## Branch
`Ghion-Saccos` (created from `main` at commit `664b56f`)

## Goal
Rebrand and restructure the PMS system from SAKO's org model to Ghion SACCOS's org model:
- New organizational structure (CEO → Area Manager → Branch Manager → Supervisors → Officers)
- New KPI framework (9 categories matching client's cascading matrix)
- New performance rating scale (% of target based)
- New positions/roles matching client's SACCOS structure
- Keep core features: account mapping, CBS validation, daily tasks, performance scores

---

## What Stays (Core Features)
- Account mapping → staff assignment
- CBS validation & discrepancy resolution
- Daily task entry + multi-level approval
- Performance score calculation
- Behavioral evaluations (simplified)
- June balance baselines
- Bulk mapping upload (Excel)
- Audit trail

---

## Phase 1: Database Schema Changes

### Status: ✅ Complete

#### Tasks
- [ ] Rewrite `UserRole` enum → `admin`, `areaManager`, `branchManager`, `supervisor`, `staff`
- [ ] Rewrite `Position` enum → `CEO`, `Area_Manager`, `Branch_Manager`, `Operation_Supervisor`, `Customer_Service_Officer_I`, `Customer_Service_Officer_II`, `Customer_Relationship_Supervisor`, `Sales_Marketing_Officer_I`, `Customer_Relationship_Officer_I`, `Internal_Auditor`
- [ ] Rewrite `KpiCategory` enum → `Account_Productivity`, `Deposit_Mobilization`, `New_Member_Registration`, `New_Account_Opening`, `Share_Capital_Growth`, `Mobile_Banking_Users`, `Merchant_POS_Growth`, `Billers_Recruitment`, `Internal_Operations`
- [ ] Rewrite `TaskType` enum → match new KPI categories
- [ ] Rewrite `PerformanceRating` enum → %-of-target based: Outstanding (120%+), Exceeds_Expectations (100-119%), Meets_Expectations (90-99%), Needs_Improvement (80-89%), Unsatisfactory (<80%)
- [ ] Remove `Region` model (table + all relations)
- [ ] Remove `Team` model
- [ ] Remove `SubTeam` model
- [ ] Remove `EvaluationApproval` model
- [ ] Remove `PlanShareConfig` model
- [ ] Update `User` model:
  - Remove `regionId`, `sub_team`, `region`, `area` relations
  - Add `supervisorId` (self-reference for reporting line)
  - Remove old relation references (managedRegions, managedAreas, managedTeams, ledSubTeams, subTeamMemberships)
- [ ] Update `Branch` model: remove `regionId`, remove `teams`/`subTeams` relations
- [ ] Update `AccountMapping` model: add `isProductive` Boolean, `lastActivityDate`
- [ ] Update `PerformanceScore` model: new rating logic
- [ ] Run `npx prisma migrate dev`
- [ ] Update seed script for Ghion SACCOS structure

#### Details
- All enum changes are additive + removal — old enum values replaced entirely
- `supervisorId` on User model creates a simple reporting tree (no more teams/subteams)
- `PlanShareConfig` replaced by cascading matrix percentages hardcoded per KPI per position
- `EvaluationApproval` chain simplified: supervisor → BM only

---

## Phase 2: Backend Middleware & Auth Changes

### Status: ✅ Complete

#### Tasks
- [ ] Update `rbac.js`: remove `isRegionalDirector`, `isLineManager`, `isSubTeamLeader`; add `isSupervisor`; update `isBranchManager`, `isAreaManager`, `canApprove`, `canApproveByPosition`
- [ ] Update `roleMapper.ts` (frontend): map new positions to new system roles
- [ ] Update `authController.js`: handle new roles on login
- [ ] Update `authRoutes.js`: remove old role references
- [ ] Update `userController.js` / `userRoutes.js`: remove region/team references, add supervisor assignment

---

## Phase 3: Backend Routes & Controllers

### Status: ✅ Complete

#### Tasks
- [ ] Remove all `/api/regions/*` routes
- [ ] Remove all `/api/teams/*` routes
- [ ] Remove `GET /api/dashboard/regional`
- [ ] Update `GET /api/dashboard/ceo` (was HQ) — new KPIs, no region map
- [ ] Update `GET /api/dashboard/area` — remove region refs
- [ ] Update `GET /api/dashboard/branch` — show supervisors instead of MSM/MSO
- [ ] Update `GET /api/dashboard/staff` — 9 KPI categories + account productivity
- [ ] Add `GET /api/supervisor/dashboard` — team overview, member KPIs, pending approvals
- [ ] Add `GET /api/account-productivity/stats` — track productive vs non-productive
- [ ] Add `GET /api/internal-ops/stats` — transactions, SMS, complaints
- [ ] Update `POST /api/performance/calculate` — new %-of-target formula
- [ ] Update all controllers referencing old KPI/task enums
- [ ] Update task approval logic for new chain (supervisor → BM)

---

## Phase 4: Frontend — Core Structure

### Status: ✅ Complete

#### Tasks
- [x] Update `App.tsx`: new role routing, add SupervisorDashboard, remove old routes
- [x] Update `Login.tsx`: new positions in dropdown, updated getDashboardPath
- [x] Update `Sidebar.tsx`: new nav links, new branding "GHION SACCOS PMS", removed old role nav
- [x] Update `TopNav.tsx`: removed old role notifications, added supervisor, branding update
- [x] Create `pages/SupervisorDashboard.tsx`: team overview, approvals, behavioral input
- [x] Rename `HQDashboard.tsx` → `CEODashboard.tsx` (fixed export name)
- [x] Remove `RegionalDirectorDashboard.tsx`
- [x] Remove `HierarchyManagement.tsx`
- [x] Remove `TeamManagement.tsx`, `TeamPerformance.tsx`, `TeamTasks.tsx`
- [x] Fixed TypeScript errors in UserContext, BranchManagerDashboard, Tasks (old role refs)

---

## Phase 5: Frontend — Dashboards & Pages

### Status: ✅ Complete

#### Tasks
- [x] Update `BranchManagerDashboard.tsx`: supervisors view, 9 KPIs, pending approvals
- [x] Update `AreaManagerDashboard.tsx`: no region refs, mapping coverage, branch status
- [x] Update `StaffDashboard.tsx`: KPI progress, productive badge column on accounts
- [x] Update `CEODashboard.tsx`: removed Region columns, branch heatmap, top/bottom branches
- [x] Update `MappedAccounts.tsx`: added Productivity Status column, updated KPI enums to 9 Ghion categories
- [x] Update `TaskEntryForm.tsx`: 11 new task types matching Ghion schema
- [x] Update `Tasks.tsx`: approval chain timeline display (supervisor → BM flow)
- [x] Update `PlanCascade.tsx`: 9 Ghion KPI categories
- [x] Update `PlansOverview.tsx`: 9 KPI names & colors
- [x] Update `BehavioralEvaluation.tsx`: supervisor→staff evaluation flow
- [x] Update `BehavioralInput.tsx`: filter by supervisorId
- [x] Update `BulkMappingUpload.tsx`: kept as-is
- [x] Update `CBSValidation.tsx`: kept as-is
- [x] Update `ProductMapping.tsx`: 9 new KPI categories
- [x] `api.ts`: added getSupervisor, removed getRegional
- [x] Deleted orphaned HQDashboard.tsx
- [x] Fixed AreaPerformance.tsx getRegional reference

---

## Phase 6: Seed Data

### Status: ⏳ Not Started

#### Tasks
- [ ] Create `seedGhionSaccos.js`: full org with new positions, 9 KPIs, cascaded plans
- [ ] Create 30-50 account mappings with productivity statuses
- [ ] Create sample daily tasks with new task types
- [ ] Create sample behavioral evaluations

---

## Phase 7: Build, Migrate, Deploy

### Status: ⏳ Not Started

#### Tasks
- [ ] Run Prisma migrate
- [ ] Run seed
- [ ] Build frontend
- [ ] Deploy to server
- [ ] Test all dashboards

---

## Daily Change Log

### 2026-06-29
- Created branch `Ghion-Saccos` from `main`
- Created this migration plan document
- Phase 1 (Schema): Rewrote Prisma schema — all enums updated (UserRole, Position, KpiCategory, TaskType, PerformanceRating), removed Region/Team/SubTeam/EvaluationApproval/PlanShareConfig models, added supervisorId to User, isProductive to AccountMapping. Migration SQL with data mapping. Ran on server.
- Phase 2 (Auth): Updated rbac.js, roleNormalizer.js, frontend roleMapper.ts
- Phase 3 (Backend Routes/Controllers): Removed old routes/controllers, updated server.js, rewrote planCascade.js with client's cascading matrix, cleaned region refs from all controllers. Backend running and responding on port 5001.
- Phase 4 (Frontend Core): Updated App.tsx routing, Login.tsx with new positions, Sidebar/TopNav branding, created SupervisorDashboard, renamed HQ→CEO dashboard, removed 6 old page files, fixed TS types
- Phase 5 (Frontend Dashboards): Updated all dashboards (CEO/Area/Branch/Supervisor/Staff) with new KPIs, supervisor view, productive badge. Updated TaskEntryForm with 11 task types. Updated PlanCascade/PlansOverview/ProductMapping with 9 Ghion KPIs. Fixed BehavioralInput supervisor filter. Deleted orphaned HQDashboard.tsx. Removed getRegional, added getSupervisor to API layer.
- Product Fix: Updated KPI_CATEGORY_TO_ENUM in prismaHelpers.js with all 9 Ghion categories. Rewired TaskEntryForm to fetch product types dynamically from productMapping API. Fallback uses client's real CBS products. Admins can now add/edit products via ProductMapping page and they auto-appear in TaskEntryForm.
- Next: Phase 6 — Seed Data (create seedGhionSaccos.js with full org, 9 KPIs, cascaded plans, 30-50 accounts, sample tasks/evals)
