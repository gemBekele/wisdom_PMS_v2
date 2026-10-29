# Ghion SACCOS — System Test Plan

## Branch
`Ghion-Saccos`

## Goal
End-to-end verification of every role, page, API endpoint, and data flow in the Ghion SACCOS PMS system. Each test confirms the frontend renders correctly, the backend returns correct data with the new schema, and data flows correctly between connected roles (e.g., admin sets plan → staff sees it in dashboard → supervisor approves task → BM finalizes).

---

## Phase 0: Environment & Seed Verification

- [ ] Backend server starts on port 5001 with `npm run dev`
- [ ] Frontend dev server starts on port 5173
- [ ] Database has 14 seeded users (all password `1234`)
- [ ] Database has 2 branches, 1 area, 18 plans, 40 accounts, product mappings
- [ ] All old seed scripts are deprecated (only `seedGhionSaccos.js` is current)

---

## Phase 1: Login & Authentication

### Tests
- [ ] Login page renders with email/password fields and position dropdown
- [ ] Each of 14 users can log in with `email / 1234`
- [ ] Wrong password shows "Invalid credentials" error
- [ ] Inactive user cannot log in
- [ ] After login, redirected to correct dashboard per role:
  - admin → CEO Dashboard (`/dashboard/hq`)
  - areaManager → Area Dashboard (`/dashboard/area`)
  - branchManager → Branch Dashboard (`/dashboard/branch`)
  - supervisor → Supervisor Dashboard (`/dashboard/supervisor`)
  - staff → Staff Dashboard (`/dashboard/staff`)
- [ ] Token persists on page refresh (session stays)
- [ ] Logout clears token and redirects to login

---

## Phase 2: Admin / CEO (`biruk.assefa@ghion.et`)

### 2A. CEO Dashboard (`/dashboard/hq`)
- [ ] Total branches = 2, total staff = 12
- [ ] Average plan achievement calculated from Deposit Mobilization plans
- [ ] Branch KPI heatmap shows both branches with area name
- [ ] Top/bottom branches sorted correctly
- [ ] Performance distribution chart renders (Outstanding, Very Good, etc.)
- [ ] Activity feed shows recent audit logs from seeding
- [ ] CBS validation rate shown

### 2B. Plan Management (`/plan-cascade`)
- [ ] Plans Overview shows 18 plans (9 KPIs × 2 branches)
- [ ] Each plan shows: branch_code, KPI category, target_value, period, status, createdBy
- [ ] Create Plan form: select branch, KPI category (all 9), period, target → creates + cascades
- [ ] **Connection:** After creating a new plan, verify staff in that branch get StaffPlan records
- [ ] **Connection:** After cascade, verify staff dashboard reflects new targets
- [ ] Bulk Upload: Excel file with 9 new KPI categories accepted (Mobile Banking Users, Merchant POS Growth, Billers Recruitment, Internal Operations)
- [ ] Bulk Upload: Old KPI names rejected
- [ ] Edit plan target → triggers recascade
- [ ] Filter plans by branch_code, KPI category, period, status

### 2C. Baseline Balance (`/june-balance-import`)
- [ ] Page renders
- [ ] Upload button exists

### 2D. Product Mapping (`/product-mapping`)
- [ ] Shows 12 product-KPI mappings with correct KPI categories
- [ ] Can add new product with KPI category (all 9 available)
- [ ] Can edit existing product mapping
- [ ] Can toggle status (active/inactive)
- [ ] **Connection:** Newly added products appear in TaskEntryForm dropdown for staff

### 2E. Mapping Management (`/mapping`)
- [ ] Shows account mappings list
- [ ] Can filter by branch
- [ ] Productivity status column visible with correct data
- [ ] Can reassign accounts to different staff

### 2F. CBS Validation (`/cbs-validation`)
- [ ] Page renders with upload functionality

### 2G. User Management (`/user-management`)
- [ ] Table shows all 14 users with correct columns
- [ ] Create User form:
  - [ ] Role dropdown has: Admin, Area Manager, Branch Manager, Supervisor, Staff
  - [ ] No old roles (regionalDirector, lineManager, subTeamLeader)
  - [ ] Position options update based on role:
    - Admin → CEO
    - Area Manager → Area Manager
    - Branch Manager → Branch Manager
    - Supervisor → Operation Supervisor, Customer Relationship Supervisor
    - Staff → Customer Service Officer I/II, Customer Relationship Officer I, Sales & Marketing Officer I, Internal Auditor
  - [ ] No `sub_team` field
  - [ ] Creating a user works end-to-end
- [ ] Edit user works
- [ ] Deactivate user works (user cannot log in after)

### 2H. Branch Management (`/branch-management`)
- [ ] Shows 2 branches with details
- [ ] Can add new branch
- [ ] Can edit branch (name, code, area, address, phone)
- [ ] No region field

### 2I. KPI Framework (`/kpi-framework`)
- [ ] Shows 9 Ghion KPI categories with weights summing to 100
- [ ] Weight totals displayed correctly
- [ ] Scoring thresholds show new rating scale:
  - Outstanding (120%+)
  - Exceeds Expectations (100-119%)
  - Meets Expectations (90-99%)
  - Needs Improvement (80-89%)
  - Unsatisfactory (<80%)
- [ ] Formula section explains KPI 85% + Behavioral 15%

### 2J. Competency Framework (`/competency-framework`)
- [ ] Shows 8 competencies with editable weights
- [ ] Role weights tab shows only: Staff, Supervisor, Branch Manager, Area Manager, Admin/CEO
- [ ] No old roles (regionalDirector, lineManager, subTeamLeader)

### 2K. Audit Trail (`/audit-trail`)
- [ ] Shows audit logs with user, action, entity, timestamp
- [ ] Logs exist from seeding operations

### 2L. Profile (`/profile`)
- [ ] Correct name: "Biruk Assefa"
- [ ] Badge color: purple (admin)
- [ ] Shows CEO as position
- [ ] No "Region" field shown
- [ ] Password change works

---

## Phase 3: Area Manager (`abebech.ghiwot@ghion.et`)

### 3A. Area Dashboard (`/dashboard/area`)
- [ ] Shows 2 branches in area
- [ ] Branch performance table: deposit %, digital %, member %, account %, share capital %
- [ ] No old fields (customer, loan)
- [ ] Mapping coverage: 40 total, 40 mapped, 0 unmapped
- [ ] Branch comparison chart renders (deposit, digital, member, account, shareCapital)
- [ ] Low performers count
- [ ] Trend data chart

### 3B. Branch Monitoring (`/branch-monitoring`)
- [ ] Page renders with branch monitoring data

### 3C. Area Performance (`/area-performance`)
- [ ] Shows performance overview for area

### 3D. Behavioral Evaluation (`/behavioral-evaluation`)
- [ ] Can view evaluations for area staff
- [ ] Can approve evaluations
- [ ] No reference to old `evaluationApproval` model in API response

### 3E. Reports (`/reports`)
- [ ] Page renders

### 3F. Profile
- [ ] Badge color: indigo (areaManager)
- [ ] Area shown in details

---

## Phase 4: Branch Manager

### 4A. BM Hawassa Bole (`meron.kebede@ghion.et`)

**Branch Dashboard (`/dashboard/branch`)**
- [ ] Total staff = 3
- [ ] Mapped accounts count = 40 (accounts for Bole branch)
- [ ] Daily deposit target shown
- [ ] Today's achievement from transactions
- [ ] KPI data section: Deposit Mobilization, Mobile Banking, Member Registration
- [ ] No old KPIs (Digital Channel Growth, Member_Registration without "New_")
- [ ] Team performance table: 3 staff members (Lemlem, Yonas, Birtukan) with target, actual, %, status
- [ ] Status colors work (good/warning/critical)

**Mapping (`/mapping`)**
- [ ] Can view branch account mappings
- [ ] Can reassign accounts

**Bulk Mapping Upload (`/bulk-mapping-upload`)**
- [ ] Page renders with upload

**CBS Validation (`/cbs-validation`)**
- [ ] Page renders

**Behavioral Evaluation (`/behavioral-evaluation`)**
- [ ] Can evaluate supervisors

**Mapped Accounts (`/mapped-accounts`)**
- [ ] Shows accounts for Hawassa branch staff
- [ ] Plan progress shows 9 KPI categories
- [ ] No old KPIs (Loan_NPL, Customer_Base, etc.)

**Profile**
- [ ] Badge color: green (branchManager)

### 4B. BM Bole (`meron.kebede@ghion.et`)
- [ ] Same tests as 4A but for Bole branch
- [ ] Total staff = 3
- [ ] Mapped accounts = 20

---

## Phase 5: Supervisor

### 5A. Operation Supervisor Hawassa (`tekle.woldemariam@ghion.et`)

**Supervisor Dashboard (`/dashboard/supervisor`)**
- [ ] Shows supervisees (Abdurahman Jemal, Fikirte Desta)
- [ ] Each member shows: name, position, mapped accounts, KPI achievement %
- [ ] Team stats: total members (2), total mapped accounts, avg KPI achievement

**Tasks (`/tasks`)**
- [ ] Shows tasks submitted by supervisees
- [ ] Can approve pending tasks
- [ ] **Connection:** Approving task changes status from Pending → Approved
- [ ] **Connection:** After approval, staff sees task as Approved
- [ ] Can reject tasks

**Mapping (`/mapping`)**
- [ ] Can view branch mappings

**Mapped Accounts (`/mapped-accounts`)**
- [ ] Shows accounts for supervisees

**Behavioral Input (`/behavioral-input`)**
- [ ] Can input behavioral evaluations for supervisees
- [ ] Create evaluation → approvalStatus = Draft
- [ ] Submit → approvalStatus updates directly on BehavioralEvaluation
- [ ] No old `evaluationApproval` model involved

**Profile**
- [ ] Badge color: amber (supervisor)

### 5B. CR Supervisor Hawassa (`sosina.ayele@ghion.et`)
- [ ] Supervisee: Getachew Hailu
- [ ] Same task approval tests

### 5C. Operation Supervisor Bole (`henok.tadesse@ghion.et`)
- [ ] Supervisees: Lemlem Wondimu, Yonas Alemu
- [ ] Same tests as 5A

### 5D. CR Supervisor Bole (`tsion.haile@ghion.et`)
- [ ] Supervisee: Birtukan Mamo
- [ ] Same tests

---

## Phase 6: Staff

### 6A. CS Officer I Hawassa (`abdurahman.jemal@ghion.et`)

**Staff Dashboard (`/dashboard/staff`)**
- [ ] Mapped accounts count = 6-7 (even split among 3 staff)
- [ ] Deposit growth calculated from incremental growth
- [ ] KPI breakdown shows keys: deposit, accountProductivity, member, newAccount, shareCapital, mobileBanking, merchantPos, billers, internalOps
- [ ] No old keys (digital, customer, loan)
- [ ] Behavioral evaluation section shows data

**Tasks (`/tasks`)**
- [ ] Shows their submitted tasks
- [ ] Approval status visible (seeded tasks are Approved)
- [ ] Approval timeline shows: Pending → Approved chain

**Task Entry Form (`/tasks/new`)**
- [ ] Task Type dropdown shows 11 new task types
- [ ] Product Type dropdown shows products from ProductMapping
- [ ] Selecting account populates account number
- [ ] Can submit new task
- [ ] **Connection:** New task appears in supervisor's Tasks page as Pending

**Mapped Accounts (`/mapped-accounts`)**
- [ ] Shows 6-7 customer accounts
- [ ] Customer names are Ethiopian (Amanuel G/Hiwot, Birtukan Tadesse, etc.)
- [ ] Plan progress per KPI renders with 9 categories
- [ ] Download/export functionality

**My Performance / KPI (`/kpi`)**
- [ ] Page renders with KPI data

**My Scorecard (`/reports/scorecard`)**
- [ ] Branding shows "Ghion SACCOS" (not "SAKO Microfinance")
- [ ] Employee info, KPI scores, behavioral scores render
- [ ] Footer: "This report is generated by Ghion SACCOS Performance Management System"

**Profile**
- [ ] Badge color: slate (staff)
- [ ] Supervisor name shown

### 6B. CS Officer II Hawassa (`fikirte.desta@ghion.et`)
- [ ] Same as 6A

### 6C. CR Officer Hawassa (`getachew.hailu@ghion.et`)
- [ ] Same dashboard/task tests

### 6D. Staff Bole (3 users — `lemlem.wondimu@ghion.et`, `yonas.alemu@ghion.et`, `birtukan.mamo@ghion.et`)
- [ ] Same as 6A but for Bole branch

---

## Phase 7: Connection Flows (Ecosystem Tests)

### 7A. Plan → Cascade → Staff
1. Admin creates a plan for Hawassa Bole: `Deposit_Mobilization`, target=5,000,000
2. Verify cascade creates StaffPlan records for all 3 Bole staff
3. Verify each staff's individual_target = (group share / members in group)
4. Log in as staff → Staff Dashboard shows new target
5. Log in as BM → Branch Dashboard shows new target

### 7B. Task Submission → Approval Chain
1. Log in as staff → Create a new task
2. Verify task status = Pending, no approval yet
3. Log in as supervisor → Tasks page shows the pending task
4. Supervisor approves → verify approval record created
5. Log in as BM → verify BM can also see/approve
6. After full approval, task status = Approved

### 7C. Product Mapping → Task Entry
1. Admin adds new product "Test Product" → KPI: `Mobile_Banking_Users`
2. Log in as staff → Task Entry → Product Type dropdown includes "Test Product"
3. Submit task with new product → verify it appears in tasks list

### 7D. Account Mapping → Staff Dashboard
1. Admin reassigns an account from one staff to another
2. Log in as both staff → verify mapped account counts update

### 7E. Behavioral Evaluation → Performance Score
1. Supervisor creates behavioral evaluation for staff → status = Draft
2. Supervisor submits → approvalStatus updated
3. Performance score should reference the behavioral evaluation

### 7F. CBS Validation → Task Impact
1. Admin uploads CBS file
2. Verify tasks can be CBS-validated
3. Validated tasks affect performance calculations

### 7G. User Creation → Org Hierarchy
1. Admin creates new staff user with supervisor assignment
2. Supervisor dashboard shows new supervisee
3. Hierarchy API returns new user in correct position

---

## Phase 8: Edge Cases & Error Handling

- [ ] Submit task with empty required fields → validation error
- [ ] Create plan with duplicate branch+KPI+period → error message
- [ ] Delete branch with users → proper error (FK constraint)
- [ ] Login with deactivated user → "Account is inactive"
- [ ] Access admin page as staff → redirected to dashboard
- [ ] Access BM page as supervisor → allowed (isBranchManager includes supervisor)
- [ ] Access supervisor page as staff → forbidden
- [ ] Empty state: branch with no accounts → dashboard shows zeros, not crash
- [ ] API returns old role name → frontend maps to correct role

---

## Phase 9: Frontend-Specific Checks

- [ ] Sidebar nav items match role correctly (see sidebar test cases)
- [ ] Mobile responsive: sidebar toggle works
- [ ] Loading states show spinner
- [ ] Error states show message, not blank page
- [ ] All dropdowns populate correctly
- [ ] All tables sort/filter work
- [ ] Pagination if applicable
- [ ] No `region` field in any form or display
- [ ] No `sub_team` field in any form or display
- [ ] Branding: "GHION SACCOS" in sidebar header, login page, scorecard
- [ ] No "SAKO" text appears anywhere in the UI
- [ ] Colors: primary blue palette matches theme

---

## Phase 10: API Smoke Tests

- [ ] `GET /api/health` → returns "Ghion SACCOS PMS API is running"
- [ ] `GET /api/auth/me` → returns user with: id, name, email, role, position, branchId, branch_code, areaId, supervisorId, isActive
- [ ] `GET /api/auth/me` → no sub_team, no regionId in response
- [ ] `GET /api/users/hierarchy` → correct tree structure for each role
- [ ] `GET /api/users/public-list` → returns all active users
- [ ] `POST /api/auth/login` → returns token + user data
- [ ] `GET /api/dashboard/hq` → includes totalBranches, totalStaff, branchKPIHeatmap
- [ ] `GET /api/dashboard/staff` → includes kpiBreakdown with new keys
- [ ] `GET /api/mapped-accounts/dashboard` → planProgress has 9 entries
- [ ] `GET /api/plans` → returns plans with new KpiCategory enums
- [ ] `GET /api/staff-plans` → returns staff plans with cascade data
- [ ] `POST /api/plans` → creates plan, cascades, returns cascade result
- [ ] `POST /api/tasks` → creates task with correct TaskType enum
- [ ] `POST /api/behavioral` → creates evaluation (no evaluationApproval error)
- [ ] `GET /api/branches` → returns branches without region field
- [ ] `GET /api/areas` → returns areas
- [ ] `GET /api/product-mappings` → returns product-KPI mappings

---

## Daily Change Log

### 2026-06-29
- Created this test plan document
- Audit & fix pass completed:
  - Removed all old model references (region, team, subTeam, evaluationApproval, planShareConfig)
  - Removed old role strings (regionalDirector, lineManager, subTeamLeader, SAKO HQ / Admin)
  - Removed old KPI categories (Digital_Channel_Growth, Customer_Base, Loan_NPL, Shareholder_Recruitment)
  - Updated all KPI maps, weights, task mappings to 9 new Ghion categories
  - Fixed behavioralController to use approvalStatus directly (no evaluationApproval model)
  - Fixed auth middleware to not select removed fields (sub_team, regionId)
  - Fixed exportController region reference
  - Cleaned frontend: UserManagement (roles/positions), Profile, Settings, CompetencyFramework, KPIFramework, MonthlyScorecard (branding), mockData
- Seed script `seedGhionSaccos.js` created and run successfully
- Database seeded with 14 users, 2 branches, 18 plans, 40 accounts, product mappings, sample tasks

### 2026-06-29 (Session 2 — Test Execution)
#### Bugs Found & Fixed (4)
1. **`planCascade.js`** — `POSITION_GROUP` keys used spaces (`'Operation Supervisor'`) but DB stores positions with underscores (`'Operation_Supervisor'`). Added `.replace(/_/g, ' ')` normalization. Result: 0→78 staff plans created across 10 staff.
2. **`planController.js`** — `target_type: "Numeric"` not a valid Prisma `TargetType` enum (only `incremental`). Added `'Numeric' → 'incremental'` mapping. Created plan with Q4 period cascaded correctly.
3. **`taskController.js`** — `checkAccountMapping` called with `undefined accountNumber` crashed task creation for non-account tasks (Mobile Banking, etc.). Wrapped in `if (accountNumber)`. Also fixed `productType`, `remarks`, `evidence` being sent as `undefined`.
4. **`middleware/auth.js`** — `supervisorId` missing from `req.user` `select` field list. Added it. Approval chain was building with BM only; now correctly includes supervisor → BM flow.

#### E2E Test Results
- ✅ **Phase 0** (Environment): Backend 5001, Frontend 5173, 14 users, 18 plans, 78 staff plans, 40 accounts
- ✅ **Phase 1** (Login): All 14 users login. Wrong password rejected. No old roles/fields in response
- ✅ **Phase 2** (Admin/CEO): Dashboard (2 branches, 10 staff, heatmap, feeds), Plans (18 + 1 Q4), User Mgmt (14 users, no sub_team), Branches (2), Product Mapping (12), Account Mapping (40), KPI Framework (9 KPIs)
- ✅ **Phase 3** (Area Manager): Dashboard (2 branches, 10 staff, branch comparison, 30 trend points)
- ✅ **Phase 4** (Branch Manager): Dashboard (5 staff, 20 accounts, KPI data, team perf). Data isolated by branch (Dawit=Main vs Meron=Bole)
- ✅ **Phase 5** (Supervisor): Dashboard (team members, accounts, KPI achievement). Data isolated by branch
- ✅ **Phase 6** (Staff): Dashboard (mapped accounts, KPI breakdown, behavioral eval). Differentiated targets by position
- ✅ **Phase 7** (Plan Cascade): Create plan → auto-cascade to staff (verified Abdurahman: 10 plans, 1 Q4)
- ✅ **Phase 8** (Task Approval): Staff creates → Supervisor approves → BM approves → Finalized (full chain tested)
- ✅ **Phase 9** (Frontend): All 15+ pages return 200. Build passes clean (`tsc -b && vite build` — 0 errors)
- ✅ **Phase 10** (Data Quality): All data real, differentiated by role/branch/position. No hardcoded values

### 2026-06-30 (Session 3 — Login Dropdown Fix)
#### Bugs Fixed
- **`vite.config.ts`** — Missing proxy config. Frontend on port 5173 called `/api/users/public-list` which hit the Vite dev server (returns HTML), not the backend on port 5001. API calls silently failed (`catch(_){}`). Added `server.proxy` to forward `/api` → `localhost:5001`.
- **`Login.tsx`** — `roleOrder` array used underscore-separated keys (`'Operation_Supervisor'`) but the API (`/api/users/public-list`) returns positions with spaces (`'Operation Supervisor'`) via `POSITION_MAP`. All 14 users were invisible in the dropdown because `groupedUsers[role]` returned `undefined` for every key. Changed `roleOrder` to use space-separated values matching the API output.

---

## Status Legend
- ⬜ Not Started
- ✅ Passed
- ❌ Failed (logged in change log)
- 🔧 Fixed
